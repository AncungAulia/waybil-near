"use client";

import { useEffect, useRef } from "react";
import { formatUsdc } from "@waybil/shared";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { KeyValue } from "@/components/elements/KeyValue";
import { FanMeter } from "@/components/elements/FanMeter";
import { cn } from "@/lib/cn";
import type { ShipperState } from "../data/fixtures";

const whole = (amount: bigint) => formatUsdc(amount).split(".")[0];
const CARD = "rounded-[24px]";

export function ShipperCredit({
  state,
  go,
  usedBefore = 2400000000n,
}: {
  state: ShipperState;
  go: (state: ShipperState) => void;
  usedBefore?: bigint;
}) {
  const reviewing = state === "P7.2";
  const proposed = state === "P7.3";
  const same = state === "P7.4";
  const rejected = state === "P7.5";
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const review = () => {
    go("P7.2");
    timer.current = setTimeout(() => go("P7.3"), 700);
  };
  const badge = reviewing
    ? "Review running"
    : proposed
      ? "Proposed 5,000"
      : same
        ? "Reviewed today"
        : rejected
          ? "Not approved"
          : "Raised Nov 9";
  const badgeIcon = reviewing || same ? "reviewing" : proposed || rejected ? "waiting" : "raised";
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

  const caps = (
    <Panel className={CARD}>
      <div className="flex flex-col gap-4">
        <h2 className="text-[17px] leading-[21px] font-semibold">
          Limits the assistant can&apos;t change
        </h2>
        <p className="text-[14px] leading-[17px] text-ds-muted">
          These limits are built into Waybil. The assistant cannot change them.
        </p>
      </div>
      <div className="[&>div]:gap-12 [&>div]:py-10 [&>div>span]:leading-[17px] [&>div>span:last-child]:font-semibold">
        <KeyValue label="Max limit per shipper" value="10,000 USDC" />
        <KeyValue label="Max raise per week" value="20%" />
        <KeyValue label="Bigger changes" value="2 of 3 team approvals" />
      </div>
    </Panel>
  );

  return (
    <>
      <div className="mb-16 md:mb-24">
        <h1 className="text-[30px] leading-[32px] font-medium tracking-[-0.03em] md:text-[40px] md:leading-[42px]">
          Credit
        </h1>
        <p className="mt-6 hidden text-[14px] leading-[17px] text-ds-muted md:block">
          Set by the Waybil credit assistant
        </p>
      </div>
      <div className="grid items-start gap-24 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-24">
          <Panel
            title="Credit limit"
            titleClassName="text-[14px] leading-[17px] font-normal text-ds-muted"
            className={CARD}
            action={
              <span className="flex items-center gap-6 rounded-full bg-ds-brand-soft px-10 py-5 text-[12px] leading-[15px] font-semibold text-ds-brand-deep">
                <CreditIcon
                  name={badgeIcon}
                  size={14}
                  className={
                    reviewing || same ? "animate-spin motion-reduce:animate-none" : undefined
                  }
                />
                {badge}
              </span>
            }
          >
            <span className="text-[44px] leading-[54px] font-semibold tracking-[-1px]">
              3,000 USDC
            </span>
            <div className="flex flex-col gap-6">
              <FanMeter
                appearance="credit"
                tone="ink"
                value={Number(usedBefore) / 3000000000}
                label="Credit limit used"
                markerLabel={whole(usedBefore) + " used"}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] leading-[13px] text-ds-muted">
                <span>0</span>
                <span>1,000</span>
                <span>2,000</span>
                <span>3,000</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-between gap-12 text-[14px] leading-[17px] text-ds-ink-2">
              <span>Used {whole(usedBefore)} USDC</span>
              <span>Available {whole(3000000000n - usedBefore)} USDC</span>
            </div>
            {(proposed || rejected) && (
              <div className="flex items-start gap-10 rounded-[14px] bg-ds-vote-soft p-14 text-ds-vote-ink">
                <CreditIcon name="team" size={18} className="shrink-0" />
                <p className="text-[14px] leading-[17px]">
                  {proposed
                    ? "The assistant suggested 5,000 USDC (+67%). This is above the weekly limit, so the team decides. One team member has approved so far."
                    : "Your limit stays at 3,000 USDC. The team wants to see two more bills paid on time before a bigger jump."}
                </p>
              </div>
            )}
          </Panel>
          <div className="hidden xl:block">{caps}</div>
        </div>
        <div className="flex min-w-0 flex-col gap-24">
          <Panel className={CARD}>
            <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-center md:gap-12">
              <h2 className="flex items-center gap-10 text-[17px] leading-[21px] font-semibold">
                <CreditIcon name="assistant" size={36} className="shrink-0" />
                Waybil credit assistant
              </h2>
              <span className="flex items-center gap-6 rounded-full bg-ds-check-soft px-10 py-5 text-[12px] leading-[15px] font-semibold text-ds-check-ink">
                <CreditIcon name="private" size={14} />
                Private check
              </span>
            </div>
            <h3 className="text-[15px] leading-[18px] font-semibold">
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
              <>
                <div role="status" aria-busy="true" className="flex flex-col gap-16">
                  <span className="sr-only">Checking your history</span>
                  {[0, 1, 2].map((i) => (
                    <span
                      aria-hidden="true"
                      key={i}
                      className="shipment-skeleton h-14 rounded-full bg-ds-surface-3"
                    />
                  ))}
                </div>
                <p className="text-[14px] leading-[17px] text-ds-muted">
                  Reviewing your last 30 days of shipments and repayments. Usually under a minute.
                </p>
              </>
            ) : same ? (
              <p className="text-[14px] leading-[17px] text-ds-muted">
                You ship about the same as last month. The assistant checks again after your next 3
                paid bills.
              </p>
            ) : (
              <ul className="flex flex-col gap-16">
                {reasons.map((reason) => (
                  <li
                    key={reason}
                    className="flex items-center gap-10 text-[15px] leading-[18px] text-ds-ink-2"
                  >
                    <CreditIcon name={rejected ? "info" : "check"} size={18} className="shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-6 pt-14">
              <p className="text-[13px] leading-[16px] text-ds-muted">
                The assistant checks your numbers in a sealed, private computer. Nobody can see
                them, not even Waybil.
              </p>
              <a
                href="https://testnet.nearblocks.io/address/app.waybil.testnet"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring self-start rounded-small text-[13px] leading-[16px] font-semibold text-ds-brand-deep"
              >
                See the record on NearBlocks ↗
              </a>
            </div>
            {!reviewing && !same && (
              <div className="flex items-center justify-between gap-12">
                <p className="min-w-0 flex-1 text-[14px] leading-[17px] text-ds-muted">
                  {proposed
                    ? "A raise is already waiting for the team."
                    : rejected
                      ? "You can ask again on Nov 19."
                      : "Shipped more lately?"}
                </p>
                <Button
                  variant="quiet"
                  className="h-40 shrink-0 text-[14px] leading-[17px] disabled:text-ds-ink disabled:opacity-40"
                  disabled={proposed || rejected}
                  onClick={review}
                >
                  Ask for a review
                </Button>
              </div>
            )}
          </Panel>
          <div className="xl:hidden">{caps}</div>
          <Panel
            title="Limit history"
            titleClassName="text-[17px] leading-[21px] font-semibold"
            className={CARD}
          >
            <div>
              {(proposed || rejected) && (
                <HistoryRow
                  amount="3,000 → 5,000 USDC"
                  reason={
                    rejected
                      ? "The team said no for now."
                      : "The assistant suggested it. The team is deciding."
                  }
                  date="Today"
                />
              )}
              <HistoryRow
                amount="2,500 → 3,000 USDC"
                reason="Assistant · within the weekly limit"
                date="Nov 9"
              />
              <HistoryRow amount="0 → 2,500 USDC" reason="Team · 2 of 3 approved" date="Oct 21" />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function HistoryRow({ amount, reason, date }: { amount: string; reason: string; date: string }) {
  return (
    <div className="flex items-center justify-between gap-12 py-12">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-[15px] leading-[18px] font-semibold">{amount}</p>
        <p className="text-[13px] leading-[16px] text-ds-muted">{reason}</p>
      </div>
      <span className="shrink-0 text-[13px] leading-[16px] text-ds-muted">{date}</span>
    </div>
  );
}

function CreditIcon({ name, size, className }: { name: string; size: number; className?: string }) {
  return (
    <img
      src={"/illustrations/credit/" + name + ".svg"}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("object-contain", className)}
    />
  );
}
