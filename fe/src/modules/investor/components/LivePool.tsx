"use client";
import { qk } from "@/lib/queryKeys";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FEE_BPS,
  splitBill,
  type PoolHistoryItem,
  formatUsdc,
  type PoolHistoryResponse,
  type QueueEntry,
  type Shipment,
} from "@waybil/shared";
import {
  ArrowLineDown,
  Clock,
  ClockCounterClockwise,
  Package,
  SealCheck,
} from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { FILL_UNDER_HEADER, FillEmpty } from "@/components/elements/EmptyState";
import { Money } from "@/components/elements/Money";
import { FanMeter } from "@/components/elements/FanMeter";
import { StatusPill } from "@/components/elements/StatusPill";
import { TimelineStep } from "@/components/elements/TimelineStep";
import { Stat } from "@/components/elements/Stat";
import {
  SkeletonGroup,
  SkeletonTripPage,
  SkeletonListPanel,
  SkeletonRow,
  SkeletonStats,
} from "@/components/elements/Skeleton";
import { cn } from "@/lib/cn";
import { api } from "@/lib/api";
import { useLive } from "@/hooks/useLive";
import { useNames } from "@/hooks/useNames";
import { CONTRACT_RECORD_URL } from "@/lib/env";
import { BackLink } from "@/components/elements/BackLink";
import { ProofLink } from "@/components/elements/ProofLink";
import { statusChip } from "@/lib/status";
import { latestEvents, poolStats, type LivePool } from "../data/live";

/*
 * The investor screens on testnet data (#86). The views give shipments, shippers and the
 * queue, but no list of deposits or withdrawals, so History points to NearBlocks for those.
 */

const POOL_PERCENT = `${Number(FEE_BPS.pool) / 100}%`;
const day = (ns: string | null) =>
  ns
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
        new Date(Number(BigInt(ns) / 1000000n)),
      )
    : "";
const percent = (part: bigint, whole: bigint) =>
  whole > 0n ? Number((part * 100n) / whole) / 100 : 0;

/** Stats, credit per company and the latest money moments on the pool page. */
export function LiveSections({
  data,
  failed = false,
}: {
  data: LivePool | null;
  failed?: boolean;
}) {
  const name = useNames(
    data
      ? [...Object.keys(data.shippers), ...data.deliveries.flatMap((s) => [s.shipper, s.driver])]
      : [],
  );
  if (!data)
    return failed ? null : (
      <SkeletonGroup label="Loading the pool." className="flex flex-col gap-16 md:gap-24">
        <SkeletonStats />
        <div className="grid items-start gap-16 lg:grid-cols-2">
          <SkeletonListPanel rows={3} />
          <SkeletonListPanel rows={3} />
        </div>
      </SkeletonGroup>
    );
  const stats = poolStats(data.deliveries);
  const companies = Object.entries(data.shippers).filter(
    (entry): entry is [string, NonNullable<(typeof entry)[1]>] => entry[1] !== null,
  );
  const latest = latestEvents(data.deliveries);
  return (
    <>
      <div className="grid gap-16 md:grid-cols-3">
        <Stat
          className="w-full"
          label="Earned by the pool"
          value={<Money amount={String(stats.earned)} />}
          context={`The pool earns ${POOL_PERCENT} of each bill.`}
        />
        <Stat
          className="w-full"
          label="Missed payments"
          value={String(stats.missed)}
          context={`Out of ${stats.trips} ${stats.trips === 1 ? "trip" : "trips"}`}
        />
        <Stat
          className="w-full"
          label="Average trip"
          value={stats.averageDays === null ? "None yet" : `${stats.averageDays} days`}
          context="From payment to repayment"
        />
      </div>
      <div className="grid items-start gap-16 lg:grid-cols-2">
        <Panel title="Owed by each company">
          {companies.length === 0 && (
            <p className="py-8 text-label text-ds-muted">No company owes the pool yet.</p>
          )}
          {companies.map(([account, shipper]) => {
            const used = BigInt(shipper.owed) + BigInt(shipper.committed);
            const pct = percent(used, BigInt(shipper.limit));
            return (
              <div key={account} className="flex flex-col gap-8 py-8">
                <div className="flex justify-between gap-12 text-label">
                  <span className="min-w-0 break-all">{name(account)}</span>
                  <span className="text-ds-muted">{Math.round(pct * 100)}%</span>
                </div>
                <FanMeter value={pct} label={`${account} credit used`} className="w-full" />
                <p className="text-caption text-ds-muted">
                  <Money amount={String(used)} /> of <Money amount={shipper.limit} />.{" "}
                  {shipper.paused
                    ? "The team paused this company."
                    : shipper.late_bills > 0
                      ? `${shipper.late_bills} ${shipper.late_bills === 1 ? "bill is" : "bills are"} late.`
                      : "No bill is late."}
                </p>
              </div>
            );
          })}
        </Panel>
        <Panel
          title="Latest"
          gap={4}
          className="p-20 pb-10"
          action={
            <Link className="link focus-ring text-label" href="/pool/deliveries">
              See all
            </Link>
          }
        >
          {latest.length === 0 && (
            <p className="py-12 text-label text-ds-muted">Nothing has happened in the pool yet.</p>
          )}
          {latest.map(({ kind, shipment: s }) => (
            <Link
              key={`${kind}-${s.id}`}
              href={`/pool/deliveries/${s.id}`}
              className="tap focus-ring -mx-12 flex items-center gap-12 rounded-[16px] px-12 py-12 hover:bg-ds-canvas"
            >
              <span className="grid size-36 shrink-0 place-items-center rounded-full bg-ds-canvas">
                {kind === "paid" ? <ArrowLineDown size={16} /> : <SealCheck size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-label break-all">
                  {kind === "paid"
                    ? `Paid ${name(s.driver)} early`
                    : `${name(s.shipper)} paid a bill`}
                </span>
                <span className="block text-caption text-ds-muted">
                  <Money amount={kind === "paid" ? s.advance : s.bill} /> for #{s.id}
                </span>
              </span>
              <span className="shrink-0 text-caption text-ds-muted">
                {day(kind === "paid" ? s.paid_at : s.repaid_at)}
              </span>
            </Link>
          ))}
        </Panel>
      </div>
    </>
  );
}

/** I3.1 and I3.4 with the shipments the pool paid for. */
export function LiveDeliveries({ deliveries }: { deliveries: Shipment[] }) {
  const name = useNames(deliveries.flatMap((s) => [s.shipper, s.driver]));
  const [filter, setFilter] = useState("All");
  const repaid = deliveries.filter((s) => s.status === "Repaid").length;
  const shown = deliveries.filter(
    (s) => filter === "All" || (filter === "Repaid") === (s.status === "Repaid"),
  );
  return (
    <>
      <header>
        <h1 className="text-title">Deliveries</h1>
        <p className="mt-6 text-label text-ds-muted">
          Every trip the pool paid for, with proof it arrived.
        </p>
      </header>
      {deliveries.length > 0 && (
        <div className="flex w-fit flex-wrap gap-6 rounded-full bg-ds-bg p-4">
          {[
            { label: "All", count: deliveries.length },
            { label: "Waiting to be repaid", count: deliveries.length - repaid },
            { label: "Repaid", count: repaid },
          ].map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setFilter(f.label)}
              className={cn(
                "tap focus-ring flex items-center gap-6 rounded-full px-14 py-8 text-label",
                filter === f.label ? "bg-ds-ink text-ds-bg" : "text-ds-ink-2 hover:bg-ds-canvas",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "text-caption",
                  filter === f.label ? "text-ds-on-night" : "text-ds-muted",
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      )}
      {deliveries.length === 0 ? (
        <FillEmpty
          image="/illustrations/investor.svg"
          title="No deliveries yet"
          body="When the pool pays a driver early, the delivery shows up here with its proof."
          className={FILL_UNDER_HEADER}
        />
      ) : (
        <Panel gap={4} className="px-20 py-8">
          <div className="hidden gap-16 py-12 text-caption text-ds-muted md:grid md:grid-cols-[1fr_140px_150px_170px]">
            <span>Delivery</span>
            <span>Paid early</span>
            <span>Status</span>
            <span>Bill</span>
          </div>
          {shown.length === 0 && (
            <p className="py-14 text-label text-ds-muted">No delivery fits this filter yet.</p>
          )}
          {shown.map((s) => (
            <Link
              href={`/pool/deliveries/${s.id}`}
              key={s.id}
              className="tap focus-ring -mx-12 grid items-center gap-10 rounded-[16px] px-12 py-14 hover:bg-ds-canvas md:grid-cols-[1fr_140px_150px_170px] md:gap-16"
            >
              <span className="flex min-w-0 items-center gap-12">
                <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-canvas">
                  <Package size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-body break-all">{name(s.shipper)}</span>
                  <span className="block text-caption break-all text-ds-muted">
                    {name(s.driver)} drives #{s.id}.
                  </span>
                </span>
              </span>
              <Money amount={s.advance} className="text-label" />
              <span className="justify-self-start">
                <StatusPill status={statusChip(s)} />
              </span>
              <p className="text-label text-ds-ink-2">
                {s.status === "Repaid"
                  ? `Paid back ${day(s.repaid_at)}`
                  : s.status === "CoveredByReserve"
                    ? "Covered by the reserve"
                    : `Bill due ${day(s.due_at)}`}
              </p>
            </Link>
          ))}
        </Panel>
      )}
    </>
  );
}

/** I3.2 for any shipment the pool paid for. */
export function LiveDelivery({
  shipment: s,
  value,
  total,
}: {
  shipment: Shipment | undefined;
  value: string;
  total: string;
}) {
  const name = useNames([s?.shipper, s?.driver]);
  /* Names arrive a moment later. Wait up to 3 seconds so raw account ids never flash. */
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);
  const back = <BackLink href="/pool/deliveries">Deliveries</BackLink>;
  if (!s)
    return (
      <>
        {back}
        <Panel className="grid min-h-240 place-content-center text-center">
          <h1 className="text-heading">This delivery could not be found</h1>
          <p className="mt-8 text-label text-ds-muted">
            The pool has not paid for a delivery with this number.
          </p>
        </Panel>
      </>
    );
  const split = splitBill(BigInt(s.bill));
  const pool = BigInt(total);
  const share = Math.round(percent(BigInt(value), pool) * 100);
  const part = pool > 0n ? (split.pool * BigInt(value)) / pool : 0n;
  const covered = s.status === "CoveredByReserve";
  const money = covered
    ? [
        { label: `Paid early to ${name(s.driver)}`, value: BigInt(s.advance) },
        { label: "The company paid back", value: 0n },
      ]
    : [
        { label: `Paid early to ${name(s.driver)}`, value: BigInt(s.advance) },
        {
          label: s.status === "Repaid" ? "The company paid back" : "The company pays back",
          value: BigInt(s.bill),
        },
        { label: "Pool earns", value: split.pool },
        { label: `Your part at ${share}%`, value: part },
        { label: "Safety reserve", value: split.reserve },
        { label: "Waybil fee", value: split.waybil },
      ];
  const steps = [
    {
      title: `Approved by ${name(s.shipper)}`,
      at: s.approved_at,
      detail: `Bill due ${day(s.due_at)}`,
    },
    { title: `Picked up by ${name(s.driver)}`, at: s.picked_up_at, detail: `${s.qty} ${s.unit}` },
    {
      title: "Arrival confirmed by the warehouse",
      at: s.arrived_at,
      detail: s.good_qty === null ? "" : `${s.good_qty} of ${s.qty} ${s.unit} in good shape`,
    },
    { title: `${name(s.driver)} got paid`, at: s.paid_at, detail: "" },
    { title: "The company paid the bill", at: s.repaid_at, detail: "" },
  ];
  /* Every step, done or still to come, so the card reads as the whole journey. */
  const next = steps.findIndex((step) => !step.at);
  const named = !!s && (waited || (name(s.shipper) !== s.shipper && name(s.driver) !== s.driver));
  if (!named)
    return (
      <>
        {back}
        <SkeletonTripPage label="Loading this delivery." />
      </>
    );
  return (
    <>
      {back}
      <header className="flex flex-wrap items-center justify-between gap-12">
        <div className="min-w-0">
          <h1 className="text-title break-all">Delivery #{s.id}</h1>
          <p className="mt-6 text-label break-all text-ds-muted">
            {name(s.driver)} drives for {name(s.shipper)}.
          </p>
        </div>
        <StatusPill status={statusChip(s)} />
      </header>
      {/* Both columns fill the window and end level. */}
      <div className="grid gap-16 lg:min-h-[calc(100dvh-300px)] lg:grid-cols-2">
        <div className="flex flex-col gap-16">
          {/* What this delivery earned the investor, first and large, in its own card. */}
          {!covered && (
            <section className="rounded-card bg-ds-ink p-24 text-ds-bg">
              <p className="text-label text-ds-bg/70">Your part of this delivery</p>
              <Money amount={String(part)} className="mt-4 block text-amount" />
              <p className="mt-4 text-caption text-ds-bg/70">
                {share}% of the {formatUsdc(split.pool)} USDC the pool earns from this bill.
              </p>
            </section>
          )}
          <Panel title="Money" className="flex-1">
            {/* The rows spread over the card, so it never ends in a blank space. */}
            <div className="flex flex-1 flex-col justify-between gap-12">
              {money.map((r) => (
                <div key={r.label} className="flex flex-wrap justify-between gap-8 text-label">
                  <span className="break-words text-ds-muted">{r.label}</span>
                  <Money amount={String(r.value)} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <Panel title="Proof it happened" className="h-full">
          <div className="flex flex-1 flex-col justify-between gap-16">
            {steps.map((step, i) => (
              <div key={step.title}>
                <TimelineStep
                  state={step.at ? "done" : i === next ? "current" : "next"}
                  title={step.title}
                  time={step.at ? day(step.at) : i === next ? "Happening next." : "Still to come."}
                />
                {step.at && step.detail && (
                  <p className="mt-4 pl-38 text-caption text-ds-ink-2">{step.detail}</p>
                )}
              </div>
            ))}
          </div>
          <a
            className="link focus-ring inline-block pt-8 text-caption"
            href={CONTRACT_RECORD_URL}
            target="_blank"
            rel="noreferrer"
          >
            See the record on NearBlocks ↗
          </a>
        </Panel>
      </div>
    </>
  );
}

/** I3.3. Waiting withdrawals from the queue, and NearBlocks for everything already done. */
/* Pool events as the contract recorded them. The backend reads them from the indexer. */
const KIND: Record<PoolHistoryItem["kind"], { label: string; sign: "+" | "-" | "" }> = {
  deposit: { label: "Deposit", sign: "+" },
  withdraw_paid: { label: "Withdrawal paid", sign: "-" },
  withdraw_queued: { label: "Withdrawal asked, waiting for cash", sign: "" },
  withdraw_failed: { label: "Payout bounced, back in the queue", sign: "" },
};
const isoDay = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));

export function LiveHistory({ accountId, queue }: { accountId: string; queue: QueueEntry[] }) {
  const mine = queue.filter((entry) => entry.investor === accountId);
  const { data, failed, reload } = useLive(
    () => api<PoolHistoryResponse>("/me/history"),
    qk.poolHistory(accountId),
  );
  return (
    <>
      <header>
        <h1 className="text-title">History</h1>
        <p className="mt-6 text-label text-ds-muted">Your deposits, withdrawals, and earnings.</p>
      </header>
      {mine.length > 0 && (
        <Panel title="Waiting" gap={4} className="px-20 py-8">
          {mine.map((entry) => (
            <div key={entry.requested_at} className="flex items-center gap-12 py-14">
              <span className="grid size-38 shrink-0 place-items-center rounded-full bg-ds-canvas">
                <Clock size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body">Withdrawal waiting</span>
                <span className="block text-caption text-ds-muted">
                  Asked {day(entry.requested_at)}. It is paid as bills are repaid.
                </span>
              </span>
              <Money amount={entry.amount} className="shrink-0 text-label" />
            </div>
          ))}
        </Panel>
      )}
      {data && data.items.length === 0 && mine.length === 0 ? (
        <FillEmpty
          icon={<ClockCounterClockwise size={26} />}
          title="Nothing here yet"
          body="Your first deposit shows up here, with its proof."
          className={FILL_UNDER_HEADER}
        />
      ) : (
        <Panel gap={4} className="px-20 py-8">
          {failed && !data ? (
            <div className="flex flex-col items-start gap-12 py-14">
              <p className="text-label text-ds-muted">
                We could not load your history right now. Try again in a minute.
              </p>
              <button className="link focus-ring text-label" onClick={reload}>
                Try again
              </button>
            </div>
          ) : !data ? (
            <SkeletonGroup label="Loading your history.">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </SkeletonGroup>
          ) : data.items.length === 0 ? (
            <p className="py-14 text-label text-ds-muted">
              Nothing yet. Your first deposit shows up here.
            </p>
          ) : (
            data.items.map((item) => (
              <div
                key={`${item.txHash}-${item.kind}-${item.at}`}
                className="flex items-center gap-12 py-14"
              >
                <span className="grid size-38 shrink-0 place-items-center rounded-full bg-ds-canvas">
                  {item.kind === "deposit" ? <ArrowLineDown size={16} /> : <Clock size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body">{KIND[item.kind].label}</span>
                  <span className="block text-caption text-ds-muted">{isoDay(item.at)}</span>
                  <ProofLink tx={item.txHash} className="text-caption" />
                </span>
                <span className="shrink-0 text-label tabular-nums">
                  {KIND[item.kind].sign}
                  <Money amount={item.amount} />
                </span>
              </div>
            ))
          )}
        </Panel>
      )}
    </>
  );
}
