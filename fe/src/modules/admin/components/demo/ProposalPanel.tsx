import {
  ArrowRight,
  ChatText,
  CheckCircle,
  CircleNotch,
  Hourglass,
  PencilSimpleLine,
  Scales,
  ShieldCheck,
  Sparkle,
  XCircle,
} from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { cn } from "@/lib/cn";
import type { AdminState } from "../../data/fixtures";

/** M1. One change waiting for the team. `second` is Meridian's first limit. */
export function ProposalPanel({
  name,
  second = false,
  state,
  meridianVote,
  note,
  onReject,
  onApprove,
}: {
  name: string;
  second?: boolean;
  state: AdminState;
  meridianVote: "approved" | "rejected" | null;
  note: string;
  onReject: () => void;
  onApprove: () => void;
}) {
  const terminal = ["M1.2", "M1.6", "M1.7"].includes(state) && !second,
    split = state === "M1.5" && !second,
    ownVote = second ? meridianVote !== null : terminal || split;
  return (
    <Panel className="approval-proposal">
      <div className="approval-proposal-head flex flex-col items-start justify-between gap-10 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-[17px] leading-21 font-semibold">{name}</h2>
          <p className="text-[13px] leading-16 text-ds-muted">
            {second
              ? "New company from the Shippers page, added today at 09:40."
              : state === "M1.7"
                ? "Suggested by the credit assistant on Nov 4."
                : "Suggested by the credit assistant today at 10:12."}
          </p>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-6 rounded-full px-10 py-5 text-caption font-semibold",
            !second && state === "M1.2"
              ? "bg-ds-brand-soft text-ds-brand-deep"
              : !second && state === "M1.5"
                ? "bg-ds-vote-soft text-ds-vote-ink"
                : !second && state === "M1.6"
                  ? "bg-ds-danger-stamp text-ds-report-ink"
                  : terminal
                    ? "bg-ds-canvas text-ds-ink-2"
                    : "bg-ds-check-soft text-ds-check-ink",
          )}
        >
          {!second && state === "M1.2" ? (
            <CircleNotch size={14} />
          ) : !second && state === "M1.5" ? (
            <Scales size={14} />
          ) : !second && state === "M1.6" ? (
            <XCircle size={14} />
          ) : !second && state === "M1.7" ? (
            <Hourglass size={14} />
          ) : (
            <ShieldCheck size={14} />
          )}
          {second
            ? "Private check"
            : state === "M1.2"
              ? "Going live"
              : state === "M1.5"
                ? "Split vote"
                : state === "M1.6"
                  ? "Rejected"
                  : state === "M1.7"
                    ? "Expired"
                    : "Private check"}
        </span>
      </div>
      <div className="approval-change flex flex-wrap items-center gap-12">
        <span className="text-[22px] leading-27 font-semibold text-ds-muted md:text-[28px] md:leading-34">
          {second ? "0.00" : "3,000.00"}
        </span>
        <ArrowRight size={20} className="shrink-0" />
        <Money
          amount={second ? "2000000000" : "5000000000"}
          className="text-[22px] leading-27 font-semibold md:text-[28px] md:leading-34 [&>span]:font-semibold"
        />
        <span className="rounded-full bg-ds-brand-soft px-10 py-5 text-caption text-ds-brand-deep">
          {second ? "New" : "+67%"}
        </span>
      </div>
      <div className="approval-reason flex gap-10 rounded-[14px] bg-ds-canvas p-14">
        <Sparkle size={18} className="shrink-0" />
        <p className="text-[14px] leading-17 text-ds-ink-2">
          {second
            ? "New company. Its papers check out. A first limit always needs the team."
            : "12 of 12 bills repaid on time, 3 days early on average. Volume doubled in 30 days. Above the 20% weekly cap, so it needs the team."}
        </p>
      </div>
      {(split || state === "M1.6") && !second && (
        <div className="approval-vote-note flex gap-10 rounded-[14px] bg-ds-danger-stamp p-14 text-[13px] leading-16 text-ds-report-ink">
          <ChatText size={18} className="shrink-0" />
          <p>
            {state === "M1.6"
              ? "Risk lead and Finance think it is too big a jump."
              : `Risk lead thinks it is too big a jump. “${note || "Doubling in a month is fast. Let’s wait for two more bills before going above 4,000.00 USDC."}”`}
          </p>
        </div>
      )}
      <div className="approval-footer flex flex-wrap items-center justify-between gap-16 pt-16">
        <div className="flex items-center gap-10">
          <div aria-hidden className="flex -space-x-8">
            {["O", "R", "F"].map((initial, i) => (
              <span
                key={initial}
                className={cn(
                  "grid size-32 place-items-center rounded-full border-2 border-ds-bg text-[12px] font-semibold",
                  !second && (i === 0 || (i === 1 && state === "M1.2"))
                    ? "bg-ds-success text-ds-bg"
                    : !second &&
                        ((i === 1 && ["M1.5", "M1.6"].includes(state)) ||
                          (i === 2 && state === "M1.6"))
                      ? "bg-ds-danger text-ds-bg"
                      : !second && i === 1 && state === "M1.7"
                        ? "bg-ds-ink text-ds-bg"
                        : i === 1 && (!second || meridianVote)
                          ? "bg-ds-brand"
                          : "bg-ds-surface-3",
                )}
              >
                {initial}
              </span>
            ))}
          </div>
          <p className="text-[14px] leading-17">
            {second
              ? meridianVote
                ? meridianVote === "approved"
                  ? "1 of 2 approved"
                  : "1 rejected"
                : "0 of 2 approved"
              : state === "M1.2"
                ? "2 of 2 approved"
                : state === "M1.5"
                  ? "1 approved and 1 rejected"
                  : state === "M1.6"
                    ? "1 approved and 2 rejected"
                    : state === "M1.7"
                      ? "1 approved, then 7 days passed"
                      : "1 of 2 approved"}
          </p>
        </div>
        {(!ownVote || second) && (
          <div className="approval-actions flex w-full flex-col-reverse gap-10 md:w-auto md:flex-row md:gap-12">
            <Button
              variant="quiet"
              className="justify-center"
              disabled={ownVote}
              onClick={onReject}
            >
              Reject
            </Button>
            <Button icon={<PencilSimpleLine size={17} />} disabled={ownVote} onClick={onApprove}>
              Approve
            </Button>
          </div>
        )}
        {ownVote && !second && (
          <p
            className={cn(
              "flex items-center gap-6 text-[13px] leading-16",
              state === "M1.2"
                ? "text-ds-success"
                : state === "M1.6"
                  ? "text-ds-danger"
                  : "text-ds-ink-2",
            )}
          >
            {state === "M1.2" ? (
              <CheckCircle size={18} className="shrink-0" />
            ) : state === "M1.6" ? (
              <XCircle size={16} className="shrink-0" />
            ) : (
              <Hourglass size={16} className="shrink-0" />
            )}
            {second
              ? "Your vote is recorded in this demo."
              : state === "M1.2"
                ? "Approved. The new limit goes live now."
                : state === "M1.5"
                  ? "You said no. Finance decides next."
                  : state === "M1.6"
                    ? "It is closed. The assistant can suggest it again on Nov 19."
                    : "It expired on Nov 11. The assistant can suggest it again."}
          </p>
        )}
      </div>
      {second && meridianVote && <DemoRecord title="Demo team vote" />}
    </Panel>
  );
}
