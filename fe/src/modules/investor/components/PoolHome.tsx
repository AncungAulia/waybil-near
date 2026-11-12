import { formatUsdc } from "@waybil/shared";
import { Greeting } from "@/components/elements/Greeting";
import { Plus } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { FanMeter, MeterLegend } from "@/components/elements/FanMeter";
import { Skeleton } from "@/components/elements/Skeleton";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import type { DemoPoolBalance } from "../data/demo";
import { queueCash, queuePosition, type LivePool } from "../data/live";
import { LiveSections } from "./LivePool";
import { DemoPoolSections } from "./DemoPoolSections";

/* The pool home (I1): the investor's money, the pool meter and what sits under them. */
export function PoolHome({
  liveAccount,
  data,
  failed = false,
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
  /* The live pool could not be read, so the sections under the cards stay hidden. */
  failed?: boolean;
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
  /* Live numbers wait for testnet. Until they arrive the cards show skeletons, never a 0.00. */
  const loading = live && !data;
  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <header>
        {firstVisit ? (
          <h1 className="text-title break-words">Welcome, {name}</h1>
        ) : (
          <Greeting name={name} />
        )}
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
          {/* The amount, the line under it and the buttons sit together at the bottom of the card. */}
          <div className="flex flex-col gap-20">
            <div className="flex flex-col gap-6">
              {/* The amount scales with the card so it fits a 320 px phone. It reaches full size by 390. */}
              <div className="@container">
                {loading ? (
                  <span className="flex h-[clamp(39px,21cqw,54px)] items-center md:h-54">
                    <Skeleton className="h-32 w-200 max-w-full bg-ds-bg/15" />
                  </span>
                ) : (
                  <Money
                    amount={balance.value}
                    className="text-[clamp(26px,14cqw,36px)] font-medium tracking-tight md:text-amount"
                  />
                )}
              </div>
              <p className="text-label text-ds-brand">
                {loading ? (
                  <Skeleton className="my-3 w-140 bg-ds-bg/15" />
                ) : firstVisit ? (
                  "Deposit USDC to start earning."
                ) : live ? (
                  `Your share is ${share}%.`
                ) : (
                  `Your share is ${share}%. You earned 9.72 USDC in this sample.`
                )}
              </p>
            </div>
            {/* On a phone the two actions share the width, half each. */}
            <div
              className={cn(
                "grid gap-10 md:flex [&>button]:min-w-0 [&>button]:justify-between",
                !firstVisit && "grid-cols-2",
              )}
            >
              <Button variant="moment" icon={<Plus size={17} />} onClick={onDeposit}>
                Deposit
              </Button>
              {!firstVisit && (
                <Button variant="secondary" onClick={onWithdraw}>
                  Withdraw
                </Button>
              )}
            </div>
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
            loading ? (
              <Skeleton className="h-10 w-72" />
            ) : (
              <span className="text-caption text-ds-muted">
                {Math.round(utilization * 100)}% paid out
              </span>
            )
          }
        >
          <div className="@container flex flex-col gap-4">
            {loading ? (
              <span className="flex h-[clamp(29px,14.3cqw,44px)] items-center">
                <Skeleton className="h-28 w-220 max-w-full" />
              </span>
            ) : (
              <Money
                amount={balance.total}
                className="text-[clamp(26px,13cqw,40px)] leading-[1.1] font-medium tracking-[-0.035em]"
              />
            )}
            <p className="text-caption text-ds-muted">
              {loading ? (
                <Skeleton className="my-3 h-10 w-260 max-w-full" />
              ) : busy && !live ? (
                "23,000.00 is paid out early and 2,000.00 is free."
              ) : (
                `${formatUsdc(BigInt(balance.total) - BigInt(balance.cash))} USDC is paid out early. ${formatUsdc(BigInt(balance.cash))} USDC is free.`
              )}
            </p>
          </div>
          <div className="py-20">
            <FanMeter
              label="Pool money paid out"
              value={utilization}
              markerLabel={`${formatUsdc(lent)} paid out`}
              describe={(at, inUse) => {
                const mark = (BigInt(balance.total) * BigInt(Math.round(at * 1000))) / 1000n;
                return `The ${formatUsdc(mark)} USDC mark is ${inUse ? "paid out early" : "still free"}.`;
              }}
              className="w-full"
            />
            <div className="mt-8 flex justify-between text-caption text-ds-muted">
              {(live
                ? [0, 1, 2, 3, 4, 5].map((i) =>
                    Number((BigInt(balance.total) * BigInt(i)) / 5000000n),
                  )
                : [0, 5000, 10000, 15000, 20000, 25000]
              ).map((n, i) => (
                /* A small pool can repeat a value, so the mark's place is the key. */
                <span key={i}>{formatNumber(n)}</span>
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
      {live ? <LiveSections data={data} failed={failed} /> : <DemoPoolSections />}
    </div>
  );
}
