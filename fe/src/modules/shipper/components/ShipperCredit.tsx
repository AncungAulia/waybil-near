"use client";
import { useEffect, useRef } from "react";
import {
  CheckCircle,
  Info,
  Sparkle,
  ShieldCheck,
  ArrowsClockwise,
  CircleNotch,
  Hourglass,
  TrendUp,
  Users,
} from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { KeyValue } from "@/components/elements/KeyValue";
import { FanMeter } from "@/components/elements/FanMeter";
import type { ShipperState } from "../data/fixtures";

/** P7 writes every limit in whole USDC, for example "2,400 used" and "3,000 USDC". */
const whole = (amount: bigint) => Math.round(Number(amount) / 1000000).toLocaleString("en-US");

export function ShipperCredit({
  state,
  go,
  usedBefore = 2400000000n,
}: {
  state: ShipperState;
  go: (s: ShipperState) => void;
  usedBefore?: bigint;
}) {
  const reviewing = state === "P7.2",
    proposed = state === "P7.3",
    same = state === "P7.4",
    rejected = state === "P7.5";
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const review = () => {
    go("P7.2");
    timer.current = setTimeout(() => go("P7.3"), 700);
  };
  const caps = (
    <Panel title="Limits the assistant can't change" titleClassName="text-[17px]">
      <p className="text-label font-normal text-ds-muted">
        These limits are built into Waybil. The assistant cannot change them.
      </p>
      <div>
        <KeyValue label="Max limit per shipper" value="10,000 USDC" />
        <KeyValue label="Max raise per week" value="20%" />
        <KeyValue label="Bigger changes" value="2 of 3 team approvals" />
      </div>
    </Panel>
  );
  const reasons = rejected
    ? [
        "Doubling in a month is a big jump",
        "Two more paid bills will help",
        "Your on-time record still counts",
        "The assistant can suggest it again after Nov 19",
      ]
    : proposed
      ? [
          "12 of 12 bills repaid on time",
          "Paid 3 days early on average",
          "Volume doubled in 30 days",
          "Every report so far was settled",
        ]
      : [
          "12 of 12 bills repaid on time",
          "Paid 3 days early on average",
          "No disputed deliveries in 30 days",
          "Shipping volume up 18% this month",
        ];
  /* The badge next to the limit, with the glyph the board gives each state. */
  const badge = reviewing
    ? { icon: <CircleNotch size={14} />, label: "Review running" }
    : proposed
      ? { icon: <Hourglass size={14} />, label: "Proposed 5,000" }
      : same
        ? { icon: <CircleNotch size={14} />, label: "Reviewed today" }
        : rejected
          ? { icon: <Hourglass size={14} />, label: "Not approved" }
          : { icon: <TrendUp size={14} />, label: "Raised Nov 9" };
  return (
    <>
      <div className="mb-24 flex flex-wrap items-end justify-between gap-16">
        <div>
          <h1 className="text-title md:text-amount">Credit</h1>
          <p className="mt-4 text-label text-ds-muted">Set by the Waybil credit assistant</p>
        </div>
        <Button
          loading={reviewing}
          loadingLabel="Reviewing…"
          icon={same ? <Hourglass size={17} /> : <ArrowsClockwise size={17} />}
          disabled={proposed || same || rejected}
          onClick={review}
        >
          {same ? "Ask again after 3 bills" : "Ask for a review"}
        </Button>
      </div>
      <div className="grid gap-24 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-24">
          <Panel
            title="Credit limit"
            titleClassName="text-[14px]"
            action={
              <span className="flex items-center gap-6 rounded-full bg-ds-brand-soft px-12 py-6 text-caption">
                {badge.icon}
                {badge.label}
              </span>
            }
          >
            <span className="text-[44px] font-medium tracking-[-0.035em] tabular-nums">
              3,000 USDC
            </span>
            <div className="mt-32">
              <FanMeter
                value={Number(usedBefore) / 3000000000}
                label="Credit limit used"
                markerLabel={`${whole(usedBefore)} used`}
                className="w-full"
              />
              <div className="mt-8 flex justify-between text-caption text-ds-muted">
                <span>0</span>
                <span>1,000</span>
                <span>2,000</span>
                <span>3,000</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-between gap-12 text-[14px]">
              <span>Used {whole(usedBefore)} USDC</span>
              <span>Available {whole(3000000000n - usedBefore)} USDC</span>
            </div>
            {(proposed || rejected) && (
              <p className="flex items-start gap-10 rounded-row bg-ds-brand-soft p-16 text-[14px]">
                <Users size={18} className="mt-1 shrink-0" />
                <span>
                  {proposed
                    ? "The assistant suggested 5,000 USDC (+67%). This is above the weekly limit, so the team decides. One team member has approved so far."
                    : "Your limit stays at 3,000 USDC. The team wants to see two more bills paid on time before a bigger jump."}
                </span>
              </p>
            )}
          </Panel>
          <div className="hidden lg:block">{caps}</div>
        </div>
        <div className="flex min-w-0 flex-col gap-24">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-12">
              <h2 className="flex items-center gap-10 text-[17px] font-medium">
                <span className="grid size-36 place-items-center rounded-full bg-ds-ink text-ds-brand">
                  <Sparkle size={20} />
                </span>
                Waybil credit assistant
              </h2>
              <span className="flex items-center gap-6 rounded-full bg-ds-success-soft px-12 py-6 text-caption text-ds-success">
                <ShieldCheck size={14} />
                Private check
              </span>
            </div>
            <h3 className="mt-8 text-body font-medium">
              {reviewing
                ? "Checking your history"
                : same
                  ? "Your limit stays at 3,000 USDC"
                  : rejected
                    ? "Why the team said no"
                    : proposed
                      ? "Why 5,000 USDC"
                      : "Why 3,000 USDC"}
            </h3>
            {reviewing ? (
              <p className="text-[14px] text-ds-muted">
                Reviewing your last 30 days of shipments and repayments. Usually under a minute.
              </p>
            ) : same ? (
              <p className="text-[14px] text-ds-muted">
                You ship about the same as last month. The assistant checks again after your next 3
                paid bills.
              </p>
            ) : (
              <ul className="flex flex-col gap-12">
                {reasons.map((r) => (
                  <li key={r} className="flex items-start gap-10 text-body">
                    {rejected ? (
                      <Info size={18} className="mt-1 shrink-0 text-ds-muted" />
                    ) : (
                      <CheckCircle size={18} className="mt-1 shrink-0 text-ds-success" />
                    )}
                    {r}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-20 text-label font-normal text-ds-muted">
              The assistant checks your numbers in a sealed, private computer. Nobody can see them,
              not even Waybil.
            </p>
            <a
              href="https://testnet.nearblocks.io/address/app.waybil.testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="link focus-ring self-start text-label"
            >
              See proof ↗
            </a>
            {(proposed || rejected) && (
              <p className="text-[14px] text-ds-muted">
                {proposed
                  ? "A raise is already waiting for the team."
                  : "You can ask again on Nov 19."}
              </p>
            )}
            {(proposed || rejected || (!same && !reviewing)) && (
              <div className="flex items-center justify-between gap-12">
                {!proposed && !rejected && (
                  <p className="text-[14px] text-ds-muted">Shipped more lately?</p>
                )}
                <Button variant="quiet" disabled={proposed || rejected} onClick={review}>
                  Ask for a review
                </Button>
              </div>
            )}
          </Panel>
          <div className="lg:hidden">{caps}</div>
          <Panel title="Limit history" titleClassName="text-[17px]">
            {(proposed || rejected) && (
              <div className="border-b border-ds-line pb-16">
                <p className="text-body font-medium">3,000 → 5,000 USDC</p>
                <p className="mt-4 text-label font-normal text-ds-muted">
                  {rejected
                    ? "The team said no for now."
                    : "The assistant suggested it. The team is deciding."}
                </p>
                <p className="mt-4 text-label font-normal text-ds-muted">Today</p>
              </div>
            )}
            {[
              ["2,500 → 3,000 USDC", "Assistant · within the weekly limit", "Nov 9"],
              ["0 → 2,500 USDC", "Team · 2 of 3 approved", "Oct 21"],
            ].map(([amount, reason, date]) => (
              <div key={date} className="flex flex-wrap items-center justify-between gap-12 py-8">
                <div>
                  <p className="text-body font-medium">{amount}</p>
                  <p className="mt-4 text-label font-normal text-ds-muted">{reason}</p>
                </div>
                <span className="text-label font-normal text-ds-muted">{date}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}
