"use client";
import { cn } from "@/lib/cn";
import type { OnboardingState } from "../../data/fixtures";
import { stateFlags } from "../../data/steps";

/** The main button's classes. Sign-in buttons are taller. */
export function actionClass(state: OnboardingState) {
  return cn("w-full justify-between", stateFlags(state).connect && "h-52");
}

/** The title and note of a step. Some states break the title over two lines on phones. */
export function StepHeading({
  state,
  title,
  note,
  googleWaiting = false,
  shipperName = "",
}: {
  state: OnboardingState;
  title: string;
  note?: string;
  googleWaiting?: boolean;
  shipperName?: string;
}) {
  const {
    group,
    connect,
    isRole,
    review,
    driverReady,
    investor,
    investorReady,
    invite,
    inviteResult,
  } = stateFlags(state);
  return (
    <div
      className={cn(
        "flex flex-col gap-12",
        ((!investor && !invite && group !== "C" && group !== "D") ||
          review ||
          driverReady ||
          investorReady ||
          inviteResult) &&
          "text-center",
        (connect || isRole || review || driverReady || investor || invite) && "gap-10",
      )}
    >
      <h1
        className={cn(
          "text-title md:text-[40px] md:leading-tight",
          (connect || isRole || review || driverReady || investor || invite) &&
            "text-[30px] leading-[1.1] tracking-[-0.03em] md:leading-[1.1]",
        )}
      >
        {connect && (state === "A2" || state === "A4") ? (
          <>
            {state === "A2" ? (googleWaiting ? "Continue with" : "Check your") : "Switch to the"}
            <br className={state === "A2" ? "md:hidden" : ""} />
            {state === "A2" ? (
              <>
                <span className="hidden md:inline"> </span>
                {googleWaiting ? "Google" : "wallet"}
              </>
            ) : (
              "test network"
            )}
          </>
        ) : invite && ["F1", "F2", "F4", "F5"].includes(state) ? (
          <span className="flex flex-col gap-8">
            <span>
              {state === "F5"
                ? "Receive goods"
                : state === "F4"
                  ? "This link has expired"
                  : `${shipperName} wants`}
            </span>
            <span>
              {state === "F5"
                ? `for ${shipperName}`
                : state === "F4"
                  ? "or was already used"
                  : "to work with you"}
            </span>
          </span>
        ) : investor && !investorReady ? (
          <>
            Before you
            <br className="md:hidden" />
            <span className="hidden md:inline"> </span>deposit
          </>
        ) : driverReady ? (
          <>
            You're
            <br className="md:hidden" />
            <span className="hidden md:inline"> </span>ready to roll
          </>
        ) : state === "C7" ? (
          <span className="flex flex-col gap-8">
            <span>We're checking</span>
            <span>your company</span>
          </span>
        ) : state === "C9" ? (
          <>
            We need
            <br className="md:hidden" />
            <span className="hidden md:inline"> </span>one more thing
          </>
        ) : isRole ? (
          <>
            How will you
            <br className="md:hidden" />
            <span className="hidden md:inline"> </span>use waybil?
          </>
        ) : (
          title
        )}
      </h1>
      {note && (
        <p
          className={cn(
            "text-label text-ds-muted",
            (connect || isRole || review || driverReady || investor || invite) &&
              "text-[14px] leading-[1.45] font-normal md:text-[15px]",
          )}
        >
          {isRole ? (
            <>
              <span className="md:hidden">
                Pick one. You can't change it later with the same account.
              </span>
              <span className="hidden md:inline">{note}</span>
            </>
          ) : (
            note
          )}
        </p>
      )}
    </div>
  );
}

/** The round glyph at the top of a step. */
export function StepIcon({
  state,
  icon: Icon,
  tone = "brand",
}: {
  state: OnboardingState;
  icon: (props: { size?: number }) => React.ReactNode;
  tone?: "brand" | "soft" | "danger" | "quiet";
}) {
  const { connect } = stateFlags(state);
  return (
    <span
      className={cn(
        "mx-auto grid size-80 shrink-0 place-content-center rounded-full",
        tone === "danger"
          ? connect
            ? "bg-ds-danger-result text-ds-danger"
            : "bg-ds-danger-soft text-ds-danger"
          : tone === "soft"
            ? "bg-ds-brand-soft text-ds-brand-deep"
            : tone === "quiet"
              ? "bg-ds-canvas text-ds-ink"
              : "bg-ds-brand text-ds-ink",
      )}
    >
      <Icon size={34} />
    </span>
  );
}

export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-8 py-10 text-label">
      <span className="text-ds-muted">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  );
}
