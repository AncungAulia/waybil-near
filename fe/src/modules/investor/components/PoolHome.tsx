import { formatUsdc } from "@waybil/shared";
import { Plus } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { FanMeter, MeterLegend } from "@/components/elements/FanMeter";
import { formatNumber } from "@/lib/format";
import type { DemoPoolBalance } from "../data/demo";
import { queueCash, queuePosition, type LivePool } from "../data/live";
import { LiveSections } from "./LivePool";
import { DemoPoolSections } from "./DemoPoolSections";

/* The pool home (I1): the investor's money, the pool meter and what sits under them. */
export function PoolHome({
  liveAccount,
  data,
  balance,
  firstVisit,
  name,
  share,
  utilization,
  lent,
  busy,
  onDeposit,
  onWithdraw,
  onPayQueue,
}: {
  /* The signed-in investor on the live path, or null for the demo. */
  liveAccount: string | null;
  data: LivePool | null;
  balance: DemoPoolBalance;
  firstVisit: boolean;
  name: string;
  share: number;
  utilization: number;
  lent: bigint;
  busy: boolean;
  onDeposit: () => void;
  onWithdraw: () => void;
  onPayQueue: () => void;
}) {
  const live = liveAccount !== null;
  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <header>
        <h1 className="text-title">{firstVisit ? `Welcome, ${name}` : `Hi, ${name}`}</h1>
        <p className="mt-6 text-label text-ds-muted">
          {firstVisit
            ? "Here’s how the pool is doing. Deposit to start earning."
            : "Your money pays truck owners early."}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-[520px_1fr]">
        <section className="relative isolate flex flex-col justify-between gap-24 overflow-hidden rounded-card bg-ds-ink p-24 text-ds-bg [&>p]:relative [&>div]:relative">
          <img
            src="/illustrations/investor-glow.png"
            alt=""
            className="pointer-events-none absolute inset-0 -z-10 size-full object-cover"
          />
          <p className="text-label text-ds-line">Your money in the pool</p>
          {/* The amount scales with the card so it fits a 320 px phone. It reaches full size by 390. */}
          <div className="@container">
            <Money
              amount={balance.value}
              className="text-[clamp(26px,14cqw,36px)] font-medium tracking-tight md:text-amount"
            />
          </div>
          <p className="text-label text-ds-brand">
            {firstVisit
              ? "Deposit USDC to start earning."
              : live
                ? `Your share is ${share}%.`
                : `Your share is ${share}%. You earned 9.72 USDC in this sample.`}
          </p>
          <div className="flex flex-col gap-10 md:flex-row [&>button]:justify-between">
            <Button variant="moment" icon={<Plus size={17} />} onClick={onDeposit}>
              Deposit
            </Button>
            {!firstVisit && (
              <Button variant="secondary" onClick={onWithdraw}>
                Withdraw
              </Button>
            )}
          </div>
          {BigInt(balance.queued) > 0n && (
            <p className="text-label">
              {formatUsdc(BigInt(balance.queued))} USDC will arrive as bills are paid.
              {live && data && queuePosition(data.queue, liveAccount) !== null && (
                <> You are number {queuePosition(data.queue, liveAccount)} in line.</>
              )}
            </p>
          )}
          {live && data && data.queue.length > 0 && queueCash(data.pool) > 0n && (
            <Button variant="secondary" onClick={onPayQueue}>
              Pay out the queue
            </Button>
          )}
        </section>
        <Panel
          title="The pool"
          action={
            <span className="text-caption text-ds-muted">
              {Math.round(utilization * 100)}% paid out
            </span>
          }
        >
          <div className="@container flex flex-col gap-4">
            <Money
              amount={balance.total}
              className="text-[clamp(26px,13cqw,40px)] leading-[1.1] font-medium tracking-[-0.035em]"
            />
            <p className="text-caption text-ds-muted">
              {busy && !live
                ? "23,000.00 is paid out early and 2,000.00 is free."
                : `${formatUsdc(BigInt(balance.total) - BigInt(balance.cash))} USDC is paid out early. ${formatUsdc(BigInt(balance.cash))} USDC is free.`}
            </p>
          </div>
          <div className="py-20">
            <FanMeter
              label="Pool money paid out"
              value={utilization}
              markerLabel={`${formatUsdc(lent)} paid out`}
              className="w-full"
            />
            <div className="mt-8 flex justify-between text-caption text-ds-muted">
              {(live
                ? [0, 1, 2, 3, 4, 5].map((i) =>
                    Number((BigInt(balance.total) * BigInt(i)) / 5000000n),
                  )
                : [0, 5000, 10000, 15000, 20000, 25000]
              ).map((n) => (
                <span key={n}>{formatNumber(n)}</span>
              ))}
            </div>
            <MeterLegend value={utilization} className="mt-10" />
          </div>
          {busy && (
            <p className="rounded-row bg-ds-warning-soft p-16 text-label">
              Most of the pool is working right now. Withdrawals over{" "}
              {formatUsdc(BigInt(balance.cash))} USDC wait until companies pay their bills.
            </p>
          )}
        </Panel>
      </div>
      {live ? <LiveSections data={data} /> : <DemoPoolSections />}
    </div>
  );
}
