"use client";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Application, ApplicationResponse, Profile } from "@waybil/shared";
import { api, ApiError } from "@/lib/api";
import { useSaveProfile } from "@/hooks/useSaveProfile";
import { getShipper } from "@/lib/near";
import { qk } from "@/lib/queryKeys";
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
  const client = useQueryClient();
  const saveProfile = useSaveProfile();
  const account = profile?.accountId;
  const [application, setApplication] = useState<Application | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);

  /*
   * The saved application, read once. It is not read again in the background, since the
   * form below holds the person's edits and moves the screen on by itself.
   */
  const saved = useQuery({
    queryKey: qk.application(account ?? ""),
    queryFn: () => api<ApplicationResponse | null>("/applications/me"),
    enabled: liveCompany && group === "C" && !!account,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current || saved.data === undefined) return;
    applied.current = true;
    const found = saved.data;
    if (!found) return;
    setApplication(found.application);
    /* Edits kept in this browser are newer than the saved application. */
    if (!hasLocalDraft.current) setCompany(fromCompanyInput(found.application.company));
    setState(LIVE_STATE[found.application.state]);
  }, [saved.data, hasLocalDraft, setCompany, setState]);
  useEffect(() => {
    if (saved.error)
      setApplicationError(saved.error instanceof ApiError ? saved.error.message : null);
  }, [saved.error]);

  /* The starting limit shows once the team has approved the company. */
  const record = useQuery({
    queryKey: qk.shipperRecord(account ?? ""),
    queryFn: () => getShipper(account!),
    enabled: liveCompany && state === "C8" && !!account,
  });
  const startLimit = record.data?.limit ?? null;

  /* Keeps the cached application in step with what the backend answered. */
  function remember(next: Application) {
    setApplication(next);
    if (account)
      client.setQueryData<ApplicationResponse>(qk.application(account), { application: next });
  }

  const details = useMutation({
    mutationFn: async () => {
      const next = await saveApplication(application, company);
      /*
       * A wallet profile starts without a name. The contact person becomes the name the
       * navbar shows, and the company name stays what other people see.
       */
      const contact = company.contact.trim();
      if (contact && profile && profile.name !== contact) {
        await saveProfile.mutateAsync({ name: contact.slice(0, 120) }).catch(() => null);
      }
      return next;
    },
  });
  const savingDetails = details.isPending;
  async function saveDetails() {
    if (savingDetails) return;
    setApplicationError(null);
    try {
      remember(await details.mutateAsync());
      setState("C5.1");
    } catch (e) {
      setApplicationError(e instanceof ApiError ? e.message : "Your details could not be saved.");
    }
  }

  const papers = useMutation({
    mutationFn: (id: string) => sendPapers(id, files),
  });
  async function submitPapers() {
    if (!application) return;
    setApplicationError(null);
    setState("C6");
    try {
      remember(await papers.mutateAsync(application.id));
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
