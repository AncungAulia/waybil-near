"use client";
import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { Profile } from "@waybil/shared";
import { EMPTY_COMPANY, type CompanyDraft, type OnboardingState } from "../data/fixtures";

/*
 * The company form is kept in this browser while it is being filled in, per account, so a
 * reload or a closed tab doesn't lose it. Picked files can't be kept, so those are chosen
 * again. The copy is removed once the papers are sent.
 */
export function useCompanyDraft({
  liveCompany,
  profile,
  company,
  setCompany,
  state,
}: {
  liveCompany: boolean;
  profile: Profile | null | undefined;
  company: CompanyDraft;
  setCompany: Dispatch<SetStateAction<CompanyDraft>>;
  state: OnboardingState;
}) {
  const draftKey = liveCompany && profile ? `waybil-company-draft-v1:${profile.accountId}` : null;
  const draftRestored = useRef(false);
  const hasLocalDraft = useRef(false);
  useEffect(() => {
    if (!draftKey || draftRestored.current) return;
    draftRestored.current = true;
    try {
      const saved = localStorage.getItem(draftKey);
      if (!saved) return;
      hasLocalDraft.current = true;
      setCompany({ ...EMPTY_COMPANY, ...(JSON.parse(saved) as Partial<CompanyDraft>) });
    } catch {
      /* Private mode or a broken copy. The form starts empty. */
    }
  }, [draftKey]);
  useEffect(() => {
    if (!draftKey || !draftRestored.current || !["C1", "C2", "C3", "C4", "C5"].includes(state))
      return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(company));
    } catch {
      /* Storage is full or blocked. The form still works, it just isn't kept. */
    }
  }, [draftKey, company, state]);
  return { draftKey, hasLocalDraft };
}
