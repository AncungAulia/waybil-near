"use client";
import { useEffect, useRef } from "react";
import { CheckCircle, Sparkle, ArrowsClockwise, Hourglass } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { FanMeter, MeterLegend } from "@/components/elements/FanMeter";
import { KeyValue } from "@/components/elements/KeyValue";
import { DemoRecord } from "@/components/elements/DemoRecord";
import type { ShipperState } from "../data/fixtures";

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
    <Panel title="Limits the assistant cannot change">
      <p className="text-label text-ds-muted">
        These limits are built into Waybil. The assistant cannot change them.
      </p>
      <div>
        <KeyValue label="Max limit per shipper" value={<Money amount="10000000000" />} />
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
  return (
    <>
      <div className="mb-24 flex flex-wrap items-end justify-between gap-16">
        <div>
          <h1 className="text-title md:text-amount">Credit</h1>
          <p className="mt-4 text-label text-ds-muted">Set by the Waybil credit assistant</p>
        </div>
        <Button
          loading={reviewing}
          loadingLabel="Reviewing"
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
            action={
              <span className="rounded-full bg-ds-brand-soft px-12 py-6 text-caption">
                {reviewing
                  ? "Review running"
                  : proposed
                    ? "Proposed 5,000"
                    : same
                      ? "Reviewed today"
                      : rejected
                        ? "Not approved"
                        : "Raised Nov 9"}
              </span>
            }
          >
            <Money amount="3000000000" className="text-display" />
            <div className="mt-32">
              <FanMeter
                value={Number(usedBefore) / 3000000000}
                label="Credit limit used"
                markerLabel={`${Math.round(Number(usedBefore) / 1000000).toLocaleString("en-US")} used`}
                className="h-36 w-full"
              />
              <div className="mt-8 flex justify-between text-caption text-ds-muted">
                <span>0</span>
                <span>1,000</span>
                <span>2,000</span>
                <span>3,000</span>
              </div>
              <MeterLegend value={Number(usedBefore) / 3000000000} className="mt-10" />
            </div>
            <div className="flex flex-wrap justify-between gap-12 text-label">
              <span>
                Used <Money amount={usedBefore.toString()} />
              </span>
              <span>
                Available <Money amount={(3000000000n - usedBefore).toString()} />
              </span>
            </div>
            {proposed && (
              <p className="rounded-row bg-ds-brand-soft p-16 text-label">
                The assistant suggested 5,000.00 USDC. This is above the weekly limit, so the team
                decides. One team member has approved so far.
              </p>
            )}
            {rejected && (
              <p className="rounded-row bg-ds-brand-soft p-16 text-label">
                Your limit stays at 3,000.00 USDC. The team wants to see two more bills paid on time
                before a bigger jump.
              </p>
            )}
          </Panel>
          <div className="hidden lg:block">{caps}</div>
        </div>
        <div className="flex min-w-0 flex-col gap-24">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-12">
              <h2 className="flex items-center gap-10 text-heading">
                <span className="grid size-36 place-items-center rounded-full bg-ds-ink text-ds-brand">
                  <Sparkle size={20} />
                </span>
                Waybil credit assistant
              </h2>
              <span className="rounded-full bg-ds-success-soft px-12 py-6 text-caption text-ds-success">
                Private check
              </span>
            </div>
            <h3 className="mt-8 text-body font-medium">
              {reviewing
                ? "Checking your history"
                : same
                  ? "Your limit stays at 3,000.00 USDC"
                  : rejected
                    ? "Why the team said no"
                    : proposed
                      ? "Why 5,000.00 USDC"
                      : "Why 3,000.00 USDC"}
            </h3>
            {reviewing ? (
              <p className="text-body text-ds-muted">
                Reviewing your last 30 days of shipments and repayments. Usually under a minute.
              </p>
            ) : same ? (
              <p className="text-body text-ds-muted">
                You ship about the same as last month. The assistant checks again after your next 3
                paid bills.
              </p>
            ) : (
              <ul className="flex flex-col gap-12">
                {reasons.map((r) => (
                  <li key={r} className="flex items-start gap-10 text-label text-ds-muted">
                    <CheckCircle size={18} className="shrink-0 text-ds-success" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-20 text-caption text-ds-muted">
              The assistant checks your numbers privately.
            </p>
            <DemoRecord title="Demo credit review" />
            {proposed && (
              <p className="text-caption text-ds-muted">A raise is already waiting for the team.</p>
            )}
            {rejected && <p className="text-caption text-ds-muted">You can ask again on Nov 19.</p>}
            {!same && !reviewing && !rejected && !proposed && (
              <div className="flex items-center justify-between gap-12">
                <p className="text-label text-ds-muted">Shipped more lately?</p>
                <Button variant="quiet" onClick={review}>
                  Ask for a review
                </Button>
              </div>
            )}
          </Panel>
          <div className="lg:hidden">{caps}</div>
          <Panel title="Limit history">
            {(proposed || rejected) && (
              <div className="border-b border-ds-line pb-16">
                <p className="text-body">
                  3,000.00 → 5,000.00 <span className="text-caption">USDC</span>
                </p>
                <p className="mt-4 text-caption text-ds-muted">
                  {rejected
                    ? "The team said no for now."
                    : "The assistant suggested it. The team is deciding."}
                </p>
                <p className="mt-4 text-caption text-ds-muted">Today</p>
              </div>
            )}
            {[
              ["2,500.00 → 3,000.00 USDC", "Assistant · within the weekly limit", "Nov 9"],
              ["0.00 → 2,500.00 USDC", "Team approval", "Oct 21"],
            ].map(([amount, reason, date]) => (
              <div key={date} className="flex flex-wrap items-center justify-between gap-12 py-8">
                <div>
                  <p className="text-body">{amount}</p>
                  <p className="mt-4 text-caption text-ds-muted">{reason}</p>
                </div>
                <span className="text-caption text-ds-muted">{date}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}
