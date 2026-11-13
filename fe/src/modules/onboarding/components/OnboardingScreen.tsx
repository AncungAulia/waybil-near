"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@waybil/shared";
import { cn } from "@/lib/cn";
import { LIVE } from "@/lib/env";
import { useAuth } from "@/providers/AuthProvider";
import { ONBOARDING_FIXTURES, type OnboardingState, type CompanyDraft } from "../data/fixtures";
import { initialCompany, stateFlags } from "../data/steps";
import { useCompanyApplication } from "../hooks/useCompanyApplication";
import { useCompanyDraft } from "../hooks/useCompanyDraft";
import { useGoogleSignIn } from "../hooks/useGoogleSignIn";
import { useWalletSignIn, type SignInFlow } from "../hooks/useWalletSignIn";
import {
  CompanySetup,
  CompanyDocuments,
  initialCompanyFiles,
  type CompanyFiles,
} from "./CompanySetup";
import { OnboardingHeader } from "./OnboardingHeader";
import { CompanyReviewStep } from "./steps/CompanyReviewStep";
import { ConnectStep } from "./steps/ConnectStep";
import { DriverFormStep, DriverReadyStep } from "./steps/DriverStep";
import { InvestorStep } from "./steps/InvestorStep";
import { InviteStep } from "./steps/InviteStep";
import { RoleStep } from "./steps/RoleStep";
import { SystemStep } from "./steps/SystemStep";
import { WalletPreviewStep } from "./steps/WalletPreviewStep";

/*
 * Sign-in and onboarding for every role. The state code (for example "A1" or "C5.1") picks the
 * step, and each step lives in `steps/`. The gallery passes `preview` to show one state as drawn.
 */
export function OnboardingScreen({
  initialState = "A1",
  preview = false,
  inviteCode,
  onRetry,
}: {
  initialState?: OnboardingState;
  preview?: boolean;
  inviteCode?: string;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState),
    [role, setRole] = useState<Role | null>(ONBOARDING_FIXTURES[initialState].role),
    [understood, setUnderstood] = useState(initialState === "E2"),
    /* B3 is the Google path with a truck owner chosen. Every other B state is the wallet path. */
    [google, setGoogle] = useState(initialState === "B3"),
    [files, setFiles] = useState<CompanyFiles>(() => initialCompanyFiles(initialState));
  const [company, setCompany] = useState<CompanyDraft>(() => initialCompany(initialState));
  const {
    group,
    connect,
    centeredConnect,
    documents,
    review,
    isRole,
    driverForm,
    investor,
    invite,
    inviteResult,
    setup,
    system,
    wide,
  } = stateFlags(state);
  useEffect(() => {
    if (preview || !["C6", "D5"].includes(state) || LIVE) return;
    const timer = setTimeout(() => setState(state === "C6" ? "C7" : "D6"), 350);
    return () => clearTimeout(timer);
  }, [state, preview]);
  useEffect(() => {
    if (state !== "X4" || preview) return;
    const online = () => router.push("/start");
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [state, preview, router]);
  const dashboard = (path: string) => router.push(path);
  const { profile } = useAuth();

  const liveCompany = LIVE && !preview && profile?.role === "shipper";
  /* The draft hook runs first, so a copy kept in this browser wins over the saved application. */
  const { draftKey, hasLocalDraft } = useCompanyDraft({
    liveCompany,
    profile,
    company,
    setCompany,
    state,
  });
  const {
    application,
    setApplication,
    applicationError,
    startLimit,
    savingDetails,
    saveDetails,
    submitPapers,
  } = useCompanyApplication({
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
  });
  const [accepting, setAccepting] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [warehouseHelp, setWarehouseHelp] = useState(false);
  /* Cancel on A2 abandons the attempt that is still waiting on the wallet or Google. */
  const attempt = useRef(0);
  const lastFlow = useRef<SignInFlow>("wallet");
  const wallet = useWalletSignIn({
    setState,
    setRole,
    setGoogle,
    setSignInError,
    attempt,
    lastFlow,
  });
  const googleSignIn = useGoogleSignIn({
    preview,
    inviteCode,
    setState,
    setSignInError,
    attempt,
    lastFlow,
  });
  if (group === "G" || state === "X6" || state === "X7")
    return <WalletPreviewStep state={state as "G1" | "G2" | "G3" | "G4" | "G5" | "X6" | "X7"} />;
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-ds-bg px-20 pt-20 pb-24 md:bg-ds-canvas md:px-40 md:pb-40",
        setup && "px-16 pt-12 md:px-32 md:pt-20 md:pb-32 lg:px-40 lg:pb-40",
      )}
    >
      <OnboardingHeader state={state} />
      <main
        className={cn(
          "mx-auto mt-28 flex w-full flex-1 flex-col gap-24",
          wide
            ? isRole
              ? "max-w-1040 md:justify-center"
              : "max-w-900 md:flex-none"
            : "max-w-520 md:justify-center",
          driverForm && "md:flex-none",
          connect &&
            "mt-20 max-w-none gap-0 md:mt-24 md:max-w-none md:items-center md:justify-center",
          centeredConnect && "justify-center",
          isRole && "mt-20 gap-0 md:mt-24 md:max-w-620 lg:max-w-1040",
          group === "C" && "mt-20 md:mt-24",
          review && "gap-0 md:max-w-560 lg:max-w-520",
          group === "D" && "mt-20 gap-0 md:mt-24 md:max-w-560 lg:max-w-520",
          driverForm && "lg:mt-48",
          investor && "mt-20 gap-0 md:mt-24 md:max-w-560 lg:max-w-520",
          invite && "mt-20 gap-0 md:mt-24 md:max-w-560 lg:max-w-520",
          system && "mt-20 gap-0 md:mt-24 md:max-w-560 lg:max-w-520",
        )}
      >
        <div
          className={cn(
            "flex flex-1 flex-col gap-24 md:flex-none md:rounded-card md:bg-ds-bg md:p-40",
            isRole && "gap-16 px-4 md:gap-28 md:bg-transparent md:px-4 md:py-0",
            wide && !isRole && "md:gap-24",
            group === "A" && "justify-center",
            system && "justify-center",
            connect && "gap-20 px-4 md:w-560 md:gap-24 md:rounded-[32px] md:p-40 lg:w-520",
            connect && (centeredConnect ? "flex-none" : "justify-start"),
            group === "C" && !review && "gap-18 px-4 md:gap-20 md:rounded-[32px] md:p-32 lg:p-40",
            review &&
              "gap-20 px-4 [&>span:first-child]:mt-auto md:gap-24 md:rounded-[32px] md:p-40 md:[&>span:first-child]:mt-0",
            group === "D" && "gap-20 px-4 md:gap-24 md:rounded-[32px] md:p-40",
            investor && "gap-20 px-4 md:gap-24 md:rounded-[32px] md:p-40",
            invite && "gap-20 px-4 md:gap-24 md:rounded-[32px] md:p-40",
            inviteResult && "[&>span:first-child]:mt-auto md:[&>span:first-child]:mt-0",
            system &&
              "gap-20 px-4 [&>span:first-child]:mt-auto md:gap-24 md:rounded-[32px] md:p-40 md:[&>span:first-child]:mt-0",
          )}
        >
          {group === "A" ? (
            <ConnectStep
              state={state}
              setState={setState}
              setRole={setRole}
              setGoogle={setGoogle}
              signInError={signInError}
              setSignInError={setSignInError}
              warehouseHelp={warehouseHelp}
              setWarehouseHelp={setWarehouseHelp}
              attempt={attempt}
              lastFlow={lastFlow}
              wallet={wallet}
              googleSignIn={googleSignIn}
              dashboard={dashboard}
            />
          ) : isRole ? (
            <RoleStep
              state={state}
              setState={setState}
              role={role}
              setRole={setRole}
              google={google}
              wallet={wallet}
            />
          ) : group === "C" && !review ? (
            <>
              {liveCompany && applicationError && (
                <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
                  {applicationError}
                </p>
              )}
              {documents ? (
                <CompanyDocuments
                  state={state}
                  files={files}
                  setFiles={setFiles}
                  onBack={() => setState("C2")}
                  onSubmit={() => (liveCompany ? void submitPapers() : setState("C6"))}
                />
              ) : (
                <CompanySetup
                  key={state === "C3" ? "errors" : "company"}
                  state={state}
                  draft={company}
                  setDraft={setCompany}
                  onContinue={() => (liveCompany ? void saveDetails() : setState("C5.1"))}
                  saving={savingDetails}
                />
              )}
            </>
          ) : driverForm ? (
            <DriverFormStep
              state={state}
              setState={setState}
              signInError={signInError}
              setSignInError={setSignInError}
            />
          ) : group === "C" ? (
            <CompanyReviewStep
              state={state}
              setState={setState}
              company={company}
              liveCompany={liveCompany}
              application={application}
              setApplication={setApplication}
              startLimit={startLimit}
              dashboard={dashboard}
            />
          ) : state === "D6" ? (
            <DriverReadyStep
              setState={setState}
              profile={profile}
              inviteCode={inviteCode}
              initialState={initialState}
              dashboard={dashboard}
            />
          ) : group === "E" ? (
            <InvestorStep
              state={state}
              setState={setState}
              understood={understood}
              setUnderstood={setUnderstood}
              dashboard={dashboard}
            />
          ) : group === "F" ? (
            <InviteStep
              state={state}
              setState={setState}
              googleSignIn={googleSignIn}
              accepting={accepting}
              setAccepting={setAccepting}
              setSignInError={setSignInError}
              dashboard={dashboard}
            />
          ) : system ? (
            <SystemStep
              state={state}
              onRetry={() => {
                if (onRetry) onRetry();
                else if (state === "X2" || state === "X4") window.location.reload();
                else setState("A1");
              }}
              onHome={() => dashboard("/start")}
            />
          ) : null}
        </div>
        {/*
         * Live sign-in, driver details, invites and a signed-in shipper's application are real,
         * so the demo note stays off them.
         */}
        {!(LIVE && (["A", "B", "D", "F"].includes(group) || liveCompany)) && (
          <p className="mt-4 text-center text-caption text-ds-muted">
            This is a local demo. No sign-in, wallet connection or application is submitted.
          </p>
        )}
      </main>
    </div>
  );
}
