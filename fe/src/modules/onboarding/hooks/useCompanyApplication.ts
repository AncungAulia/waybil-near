"use client";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { Application, ApplicationResponse, Profile } from "@waybil/shared";
import { api, ApiError, readSession, saveSession } from "@/lib/api";
import { getShipper } from "@/lib/near";
import { fromCompanyInput, LIVE_STATE, saveApplication, sendPapers } from "../data/application";
import type { CompanyDraft, OnboardingState } from "../data/fixtures";
import type { CompanyFiles } from "../components/CompanySetup";

/*
 * Live shipper application (#84). It loads the shipper's application once, saves the
 * details, uploads the papers, submits, and shows the real review state.
 */
export function useCompanyApplication({
  liveCompany,
  group,
  state,
  setState,
  profile,
  company,
  setCompany,
  files,
  draftKey,
  hasLocalDraft,
}: {
  liveCompany: boolean;
  group: string;
  state: OnboardingState;
  setState: Dispatch<SetStateAction<OnboardingState>>;
  profile: Profile | null | undefined;
  company: CompanyDraft;
  setCompany: Dispatch<SetStateAction<CompanyDraft>>;
  files: CompanyFiles;
  draftKey: string | null;
  hasLocalDraft: MutableRefObject<boolean>;
}) {
  const [application, setApplication] = useState<Application | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [startLimit, setStartLimit] = useState<string | null>(null);
  const loadedApplication = useRef(false);
  useEffect(() => {
    if (!liveCompany || group !== "C" || loadedApplication.current) return;
    loadedApplication.current = true;
    api<ApplicationResponse | null>("/applications/me")
      .then((found) => {
        if (!found) return;
        setApplication(found.application);
        /* Edits kept in this browser are newer than the saved application. */
        if (!hasLocalDraft.current) setCompany(fromCompanyInput(found.application.company));
        setState(LIVE_STATE[found.application.state]);
      })
      .catch((e: unknown) => setApplicationError(e instanceof ApiError ? e.message : null));
  }, [liveCompany, group]);
  useEffect(() => {
    if (!liveCompany || state !== "C8" || !profile) return;
    getShipper(profile.accountId)
      .then((s) => setStartLimit(s?.limit ?? null))
      .catch(() => setStartLimit(null));
  }, [liveCompany, state, profile]);
  const [savingDetails, setSavingDetails] = useState(false);
  async function saveDetails() {
    if (savingDetails) return;
    setApplicationError(null);
    setSavingDetails(true);
    try {
      setApplication(await saveApplication(application, company));
      /*
       * A wallet profile starts without a name. The contact person becomes the name the
       * navbar shows, and the company name stays what other people see.
       */
      const contact = company.contact.trim();
      if (contact && profile && profile.name !== contact) {
        const updated = await api<Profile>("/me/profile", {
          method: "PUT",
          body: { name: contact.slice(0, 120) },
        }).catch(() => null);
        const current = readSession();
        if (updated && current) saveSession({ ...current, profile: updated });
      }
      setState("C5.1");
    } catch (e) {
      setApplicationError(e instanceof ApiError ? e.message : "Your details could not be saved.");
    } finally {
      setSavingDetails(false);
    }
  }
  async function submitPapers() {
    if (!application) return;
    setApplicationError(null);
    setState("C6");
    try {
      setApplication(await sendPapers(application.id, files));
      if (draftKey)
        try {
          localStorage.removeItem(draftKey);
        } catch {
          /* Nothing to clean up. */
        }
      setState("C7");
    } catch (e) {
      setApplicationError(e instanceof ApiError ? e.message : "Your papers could not be sent.");
      setState("C5.2");
    }
  }
  return {
    application,
    setApplication,
    applicationError,
    startLimit,
    savingDetails,
    saveDetails,
    submitPapers,
  };
}
