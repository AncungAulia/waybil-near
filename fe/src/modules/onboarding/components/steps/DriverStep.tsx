"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import { LinkSimple, PaperPlaneTilt } from "@phosphor-icons/react";
import type { Profile } from "@waybil/shared";
import { useOrigin } from "@/hooks/useOrigin";
import { useSaveProfile } from "@/hooks/useSaveProfile";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { LIVE } from "@/lib/env";
import type { OnboardingState } from "../../data/fixtures";
import { DriverSetup } from "../DriverSetup";
import { StepHeading } from "./parts";

/** D1 to D5. The driver's name, phone and truck plate. */
export function DriverFormStep({
  state,
  setState,
  signInError,
  setSignInError,
}: {
  state: OnboardingState;
  setState: Dispatch<SetStateAction<OnboardingState>>;
  signInError: string | null;
  setSignInError: Dispatch<SetStateAction<string | null>>;
}) {
  /* A driver who signed in with Google starts with that name, and can change it. */
  const { profile } = useAuth();
  const saveProfile = useSaveProfile();
  async function saveDriver(driver: { name: string; phone: string; plate: string }) {
    setSignInError(null);
    setState("D5");
    try {
      /* The session keeps the new name and plate, so the invite step knows the driver is set up. */
      await saveProfile.mutateAsync({
        name: driver.name,
        phone: driver.phone,
        truckPlate: driver.plate,
      });
      setState("D6");
    } catch (error) {
      setSignInError(
        error instanceof ApiError ? error.message : "Your details could not be saved.",
      );
      setState("D2");
    }
  }
  /* Truck details belong to a driver account. Another role would save them to its own profile. */
  if (LIVE && profile && profile.role !== "driver")
    return (
      <>
        <StepHeading
          state={state}
          title="This page is for drivers"
          note="You are signed in with another role. Drivers sign in with Google to add their truck."
        />
        <ButtonLink href="/start" variant="secondary" className="w-full justify-between">
          Go to sign in
        </ButtonLink>
      </>
    );
  return (
    <>
      {LIVE && signInError && (
        <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
          {signInError}
        </p>
      )}
      <DriverSetup
        state={state}
        initialName={LIVE && profile?.role === "driver" ? profile.name : undefined}
        payoutAccount={LIVE && profile?.role === "driver" ? profile.accountId : undefined}
        onFinish={(driver) => (LIVE ? void saveDriver(driver) : setState("D5"))}
      />
    </>
  );
}

/** D6. The driver is set up and shares their link with shipping companies. */
export function DriverReadyStep({
  setState,
  profile,
  inviteCode,
  initialState,
  dashboard,
}: {
  setState: Dispatch<SetStateAction<OnboardingState>>;
  profile: Profile | null | undefined;
  inviteCode?: string;
  initialState: OnboardingState;
  dashboard: (path: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  /* A driver shares a link with their own account, so a company can add them in one tap. */
  const origin = useOrigin();
  const shareLink =
    LIVE && profile?.role === "driver" ? `${origin}/c/${profile.accountId}` : `${origin}/c/sam`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <>
      <div className="mx-auto mt-auto h-210 w-280 max-w-full shrink-0 overflow-hidden rounded-row bg-ds-canvas md:mt-0">
        <img
          src="/illustrations/driver.svg"
          alt=""
          className="h-full w-full object-contain mix-blend-multiply"
        />
      </div>
      <StepHeading
        state="D6"
        title="You’re ready to roll"
        note="Send your link to the shipping companies you work with. Once they connect, their trips show up here."
      />
      <div className="flex items-center gap-10 rounded-[16px] bg-ds-canvas px-16 py-14">
        <LinkSimple size={16} className="shrink-0" />
        <span className="min-w-0 flex-1 break-all text-[14px] leading-[1.45]">
          {shareLink.replace(/^https?:\/\//, "")}
        </span>
        <button
          type="button"
          className="link focus-ring shrink-0 rounded-full px-8 py-8 text-label font-semibold"
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-auto flex flex-col gap-20 md:mt-0 md:gap-24">
        <ButtonLink
          icon={<PaperPlaneTilt size={17} />}
          className="h-52 w-full justify-between"
          href={`https://wa.me/?text=${encodeURIComponent(`Connect with me on Waybil. ${shareLink}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          Share on WhatsApp
        </ButtonLink>
        <Button
          variant="quiet"
          className="w-full justify-center"
          onClick={() =>
            inviteCode || initialState === "F1" ? setState("F2") : dashboard("/driver")
          }
        >
          {inviteCode || initialState === "F1" ? "Continue to invitation" : "Go to my trips"}
        </Button>
      </div>
    </>
  );
}
