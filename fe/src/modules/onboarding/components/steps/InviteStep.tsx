"use client";
import type { Dispatch, SetStateAction } from "react";
import { ArrowRight, Handshake, Scan, SealCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { Avatar } from "@/components/elements/Avatar";
import { LinkOffGlyph, MailGlyph } from "@/components/elements/icons";
import { ApiError } from "@/lib/api";
import type { OnboardingState } from "../../data/fixtures";
import { DRIVER_PERCENT } from "../../data/steps";
import type { GoogleSignIn } from "../../hooks/useGoogleSignIn";
import { actionClass, Row, StepHeading, StepIcon } from "./parts";

/** F1 to F6. A driver or warehouse opens a shipping company's invite link. */
export function InviteStep({
  state,
  setState,
  googleSignIn,
  accepting,
  setAccepting,
  setSignInError,
  dashboard,
}: {
  state: OnboardingState;
  setState: Dispatch<SetStateAction<OnboardingState>>;
  googleSignIn: GoogleSignIn;
  accepting: boolean;
  setAccepting: Dispatch<SetStateAction<boolean>>;
  setSignInError: Dispatch<SetStateAction<string | null>>;
  dashboard: (path: string) => void;
}) {
  const { liveInvite, shipperName, googleFlow, acceptInvite } = googleSignIn;
  const action = actionClass(state);
  return (
    <>
      {state === "F3" && <StepIcon state={state} icon={Handshake} />}
      {state === "F4" && <StepIcon state={state} icon={LinkOffGlyph} tone="quiet" />}
      {state === "F6" && (
        <div className="mx-auto mt-auto h-210 w-280 max-w-full shrink-0 overflow-hidden rounded-row bg-ds-canvas md:mt-0">
          <img
            src="/illustrations/warehouse-invite.svg"
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
      )}
      <StepHeading
        state={state}
        shipperName={shipperName}
        title={
          state === "F3"
            ? "You’re connected"
            : state === "F4"
              ? "This link has expired or was used"
              : state === "F6"
                ? "You’re all set"
                : state === "F5"
                  ? `Receive goods for ${shipperName}`
                  : `${shipperName} wants to work with you`
        }
        note={
          state === "F3"
            ? liveInvite
              ? `${shipperName} adds you to their network next. Then their trips show up on your trips page.`
              : "Northwind can now send you trips. You will see them on your trips page."
            : state === "F4"
              ? `Ask ${shipperName} to send you a new link. It only takes them a few seconds.`
              : state === "F6"
                ? liveInvite
                  ? `When ${shipperName} adds this address, scan the QR on the driver’s phone as each truck arrives.`
                  : "When a truck arrives at Harbor Hub, scan the QR on the driver’s phone to confirm."
                : state === "F5"
                  ? "You will confirm deliveries that arrive at this address."
                  : "Accept to get trips from them. You get paid the moment a delivery is confirmed."
        }
      />
      {["F1", "F2", "F5"].includes(state) && (
        <div className="flex flex-col gap-12 rounded-[22px] bg-ds-canvas p-20">
          <div className="flex items-center gap-12">
            <Avatar name={liveInvite ? shipperName : "Northwind Freight Co."} />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] leading-[1.45] font-medium">
                {liveInvite ? shipperName : "Northwind Freight Co."}
              </p>
              <p className="mt-2 text-[12.5px] leading-[1.45] text-ds-muted">
                {state === "F5"
                  ? "You are invited to receive goods."
                  : "Shipping company · Eastport"}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-4 rounded-full bg-ds-success-soft px-10 py-4 text-caption font-medium text-ds-success">
              <SealCheck size={13} />
              Verified
            </span>
          </div>
          <div
            data-live={liveInvite || undefined}
            className="data-[live]:hidden [&>div]:py-9 [&>div]:text-[14px] [&>div>span:last-child]:max-w-[70%] [&>div>span:last-child]:text-right [&>div>span:last-child]:font-medium [&>div+div]:border-t [&>div+div]:border-ds-line"
          >
            {state === "F5" ? (
              <>
                <Row label="Destination" value="Harbor Hub" />
                <Row label="Address" value="9 Pier Street" />
              </>
            ) : (
              <>
                <Row label="Credit limit" value={<Money amount="3000000000" />} />
                <Row label="Paid on time" value="100% · 9 trips" />
                <Row label="Payout" value={`You get ${DRIVER_PERCENT} on arrival.`} />
              </>
            )}
          </div>
        </div>
      )}
      <div className="mt-auto flex flex-col gap-20 md:mt-0 md:gap-24 [&>button:not([data-quiet])]:h-52">
        {state === "F1" ? (
          <>
            <Button
              icon={<MailGlyph size={17} />}
              className={action}
              onClick={() => (liveInvite ? void googleFlow(true) : setState("D1"))}
            >
              Continue with Google
            </Button>
            <p className="text-center text-[13px] leading-[1.45] text-ds-muted md:text-left">
              Are you new to Waybil? Setup takes about a minute.
            </p>
          </>
        ) : state === "F2" ? (
          <>
            <Button
              className={action}
              loading={accepting}
              loadingLabel="Accepting"
              onClick={() => {
                if (!liveInvite) return setState("F3");
                setAccepting(true);
                void acceptInvite()
                  .catch((error: unknown) => {
                    if (
                      error instanceof ApiError &&
                      ["E_INVITE_USED", "E_INVITE_EXPIRED"].includes(error.code)
                    )
                      setState("F4");
                    else
                      setSignInError(
                        error instanceof ApiError
                          ? error.message
                          : "The invite could not be accepted. Try again.",
                      );
                  })
                  .finally(() => setAccepting(false));
              }}
            >
              Accept
            </Button>
            <Button
              data-quiet
              variant="quiet"
              className="w-full justify-center"
              onClick={() => dashboard("/driver")}
            >
              Not now
            </Button>
          </>
        ) : state === "F3" ? (
          <>
            <Button className={action} onClick={() => dashboard("/driver")}>
              Go to my trips
            </Button>
          </>
        ) : state === "F4" ? (
          <Button
            variant="secondary"
            icon={<ArrowRight size={17} />}
            className={action}
            onClick={() => setState("A1")}
          >
            Go to Waybil
          </Button>
        ) : state === "F5" ? (
          <>
            <Button
              icon={<MailGlyph size={17} />}
              className={action}
              onClick={() => (liveInvite ? void googleFlow(true) : setState("F6"))}
            >
              Continue with Google
            </Button>
            <p className="text-center text-[13px] leading-[1.45] font-medium text-ds-muted">
              You need no wallet, no app and no fees. Waybil covers the network cost.
            </p>
          </>
        ) : (
          <>
            <Button
              icon={<Scan size={17} />}
              className={action}
              onClick={() => dashboard("/warehouse/scan")}
            >
              Open scanner
            </Button>
            <Button
              data-quiet
              variant="quiet"
              className="w-full justify-center"
              onClick={() => dashboard("/warehouse")}
            >
              I’ll do it later
            </Button>
          </>
        )}
      </div>
    </>
  );
}
