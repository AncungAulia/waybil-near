"use client";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { ArrowCounterClockwise, CaretRight, X } from "@phosphor-icons/react";
import type { Role } from "@waybil/shared";
import { Button } from "@/components/ui/Button";
import {
  CircleXGlyph,
  LoaderGlyph,
  MailGlyph,
  SwapGlyph,
  WalletGlyph,
} from "@/components/elements/icons";
import { cn } from "@/lib/cn";
import { LIVE } from "@/lib/env";
import type { OnboardingState } from "../../data/fixtures";
import { START, stateFlags, type StartRole } from "../../data/steps";
import type { GoogleSignIn } from "../../hooks/useGoogleSignIn";
import type { SignInFlow, WalletSignIn } from "../../hooks/useWalletSignIn";
import { actionClass, StepHeading, StepIcon } from "./parts";

/** A1 to A5. Picking a role, waiting on the wallet or Google, and the sign-in errors. */
export function ConnectStep({
  state,
  setState,
  setRole,
  setGoogle,
  signInError,
  setSignInError,
  warehouseHelp,
  setWarehouseHelp,
  attempt,
  lastFlow,
  wallet,
  googleSignIn,
  dashboard,
}: {
  state: OnboardingState;
  setState: Dispatch<SetStateAction<OnboardingState>>;
  setRole: Dispatch<SetStateAction<Role | null>>;
  setGoogle: Dispatch<SetStateAction<boolean>>;
  signInError: string | null;
  setSignInError: Dispatch<SetStateAction<string | null>>;
  warehouseHelp: boolean;
  setWarehouseHelp: Dispatch<SetStateAction<boolean>>;
  attempt: MutableRefObject<number>;
  lastFlow: MutableRefObject<SignInFlow>;
  wallet: WalletSignIn;
  googleSignIn: GoogleSignIn;
  dashboard: (path: string) => void;
}) {
  const { chosen, walletFlow, switchWallet } = wallet;
  const { googleSlot, googleWaiting, setGoogleWaiting, publicInvite, googleFlow } = googleSignIn;
  const { centeredConnect } = stateFlags(state);
  const action = actionClass(state);
  function start(value: StartRole) {
    setSignInError(null);
    if (value === "warehouse") return setWarehouseHelp(true);
    setWarehouseHelp(false);
    if (value === "driver") {
      if (LIVE) return void googleFlow();
      setRole("driver");
      setGoogle(true);
      return setState("D1");
    }
    chosen.current = value;
    if (LIVE) return void walletFlow();
    setRole(value);
    setGoogle(false);
    setState(value === "shipper" ? "C1" : "E1");
  }
  return (
    <>
      <div
        className={cn(
          "flex flex-1 flex-col justify-center gap-20 md:flex-none md:gap-24",
          centeredConnect && "flex-none",
        )}
      >
        {/* Each A state carries the glyph and circle design/waybil.pen draws. */}
        <StepIcon
          state={state}
          icon={
            state === "A3"
              ? CircleXGlyph
              : state === "A4"
                ? SwapGlyph
                : state === "A2" || state === "A5"
                  ? LoaderGlyph
                  : WalletGlyph
          }
          tone={
            state === "A3"
              ? "danger"
              : state === "A4"
                ? "soft"
                : state === "A2" || state === "A5"
                  ? "quiet"
                  : "brand"
          }
        />
        <StepHeading
          state={state}
          googleWaiting={googleWaiting}
          title={
            state === "A1"
              ? "Welcome to waybil"
              : state === "A2"
                ? googleWaiting
                  ? "Continue with Google"
                  : "Check your wallet"
                : state === "A3"
                  ? "Not connected"
                  : state === "A4"
                    ? "Switch to the test network"
                    : "One moment"
          }
          note={
            state === "A1"
              ? "Tell us what you do and we sign you in the right way. You don't need a password."
              : state === "A2"
                ? googleWaiting
                  ? "Pick your Google account to continue."
                  : "Approve the connection in your wallet to continue."
                : state === "A3"
                  ? (signInError ?? "The request was declined in your wallet. Nothing was shared.")
                  : state === "A4"
                    ? "Your wallet is on the main network. Waybil runs on the test network for now. One tap switches it."
                    : "Looking up your account."
          }
        />
      </div>
      <div className="flex flex-col gap-20 md:gap-24">
        {state === "A1" ? (
          <>
            <div className="flex flex-col gap-8">
              {START.map(({ value, title, note, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-expanded={value === "warehouse" ? warehouseHelp : undefined}
                  onClick={() => start(value)}
                  className={cn(
                    "group tap focus-ring flex w-full items-center gap-14 rounded-row border p-14 text-left hover:border-ds-ink hover:bg-ds-canvas",
                    value === "warehouse" && warehouseHelp
                      ? "border-ds-ink bg-ds-canvas"
                      : "border-ds-line bg-ds-bg",
                  )}
                >
                  <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-canvas transition-colors duration-150 ease-base group-hover:bg-ds-brand">
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium">{title}</span>
                    <span className="block text-[12.5px] leading-[1.4] text-ds-muted">{note}</span>
                  </span>
                  <CaretRight
                    size={16}
                    className="shrink-0 text-ds-muted transition-[translate,color] duration-150 ease-base group-hover:translate-x-2 group-hover:text-ds-ink motion-reduce:transition-none"
                  />
                </button>
              ))}
            </div>
            {warehouseHelp && (
              <div className="enter flex flex-col gap-12 rounded-row bg-ds-bg p-16">
                <p className="text-label font-normal text-ds-ink-2">
                  Warehouse staff join from the invite link a shipping company sends. Open that link
                  on this phone to get started.
                </p>
                <Button
                  variant="secondary"
                  icon={<MailGlyph size={17} />}
                  className="w-full justify-between"
                  onClick={() => (LIVE ? void googleFlow() : setState("F5"))}
                >
                  {LIVE ? "I already joined. Continue with Google" : "Open the sample invite"}
                </Button>
              </div>
            )}
            <button
              type="button"
              className="link focus-ring self-center text-label"
              onClick={() => {
                chosen.current = null;
                setWarehouseHelp(false);
                if (LIVE) return void walletFlow();
                dashboard("/admin");
              }}
            >
              Waybil team member? Connect your wallet
            </button>
          </>
        ) : state === "A2" ? (
          <>
            {/* Google draws its own button here when it can't show its account picker. */}
            {googleWaiting && <div ref={googleSlot} className="flex justify-center" />}
            <Button
              variant="secondary"
              icon={<X size={17} />}
              className={action}
              onClick={() => {
                attempt.current++;
                setGoogleWaiting(false);
                setState(lastFlow.current === "invite" && publicInvite ? "F1" : "A1");
              }}
            >
              Cancel
            </Button>
          </>
        ) : state === "A3" ? (
          <>
            <Button
              icon={<ArrowCounterClockwise size={17} />}
              className={action}
              onClick={() =>
                !LIVE
                  ? setState("A1")
                  : lastFlow.current === "wallet"
                    ? void walletFlow()
                    : void googleFlow(lastFlow.current === "invite")
              }
            >
              Try again
            </Button>
            <Button
              variant="quiet"
              className="w-full justify-center"
              onClick={() => (LIVE ? void switchWallet() : setState("A1"))}
            >
              Use a different wallet
            </Button>
          </>
        ) : state === "A4" ? (
          <>
            <Button className={action} onClick={() => setState("B1")}>
              Switch network
            </Button>
            <Button
              variant="quiet"
              className="w-full justify-center"
              onClick={() => setState("A1")}
            >
              Disconnect
            </Button>
          </>
        ) : (
          <div
            role="status"
            aria-label="Checking your account"
            className="flex flex-col items-center gap-10"
          >
            <span className="h-12 w-full rounded-[6px] bg-ds-surface-3" />
            <span className="h-12 w-220 max-w-full rounded-[6px] bg-ds-surface-3" />
            <span className="h-12 w-160 max-w-full rounded-[6px] bg-ds-surface-3" />
          </div>
        )}
      </div>
    </>
  );
}
