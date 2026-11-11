"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { advanceFor, FEE_BPS, formatUsdc, parseUsdc, splitBill } from "@waybil/shared";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import {
  ArrowLeft,
  ArrowLineDown,
  ArrowUpRight,
  Check,
  CircleNotch,
  Info,
  Package,
  Plus,
  SealCheck,
  ShieldCheck,
  Wallet,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Money } from "@/components/elements/Money";
import { FanMeter, MeterLegend } from "@/components/elements/FanMeter";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { DemoMap } from "@/components/elements/DemoMap";
import { StatusPill } from "@/components/elements/StatusPill";
import { Stat } from "@/components/elements/Stat";
import { cn } from "@/lib/cn";
import { ProofLink } from "@/components/elements/ProofLink";
import { CONTRACT_RECORD_URL, LIVE, USDC_CONTRACT, WAYBIL_CONTRACT } from "@/lib/env";
import { callContract, ensureUsdcStorage } from "@/lib/wallet";
import { useAuth } from "@/providers/AuthProvider";
import { useLivePool } from "../hooks/useLivePool";
import { queueCash, queuePosition, toBalance } from "../data/live";
import { LiveDeliveries, LiveDelivery, LiveHistory, LiveSections } from "./LivePool";
import { formatNumber } from "@/lib/format";
import { INVESTOR_FIXTURES, type InvestorState } from "../data/fixtures";
import { changePoolBalance, INITIAL_BALANCE, type DemoPoolBalance } from "../data/demo";
const KEY = "waybil-demo-pool-v1";
/* Deposit and withdraw both send USDC on, so they get room for the token's callback. */
const TX_GAS = "100000000000000";
const EMPTY_BALANCE: DemoPoolBalance = {
  value: "0",
  wallet: "0",
  cash: "0",
  total: "0",
  queued: "0",
};
const wallError = (error: unknown) =>
  /reject|cancel|denied|closed/i.test(String(error))
    ? "You said no in your wallet. Nothing was sent."
    : "It didn’t go through. No money moved. Try again in a moment.";
/* What the pool earns of each bill, from the shared fee split, for example "1.6%". */
const POOL_PERCENT = `${Number(FEE_BPS.pool) / 100}%`;
/* The sample deliveries this demo shows. The empty state counts none of them. */
const DELIVERIES = [
  {
    id: 1041,
    city: "Harbor City",
    driver: "Sam",
    amount: "292500000",
    due: "Dec 11",
    repaid: false,
  },
  {
    id: 1043,
    city: "Riverton",
    driver: "Jordan Lee",
    amount: "146250000",
    due: "Dec 13",
    repaid: false,
  },
  { id: 1039, city: "Millbrook", driver: "Sam", amount: "117000000", due: "Nov 14", repaid: false },
  { id: 1032, city: "Riverton", driver: "Sam", amount: "292500000", due: "Nov 9", repaid: true },
];
function read() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
function subscribe(fn: () => void) {
  window.addEventListener("storage", fn);
  window.addEventListener("waybil-demo-pool", fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener("waybil-demo-pool", fn);
  };
}
function balanceFromJson(json: string): DemoPoolBalance {
  try {
    const b = JSON.parse(json) as DemoPoolBalance;
    if (
      Object.values(b).length === 5 &&
      Object.values(b).every((v) => typeof v === "string" && /^\d+$/.test(v))
    )
      return b;
  } catch {
    /* Invalid demo input falls back to a disabled action or fixture. */
  }
  return INITIAL_BALANCE;
}
const HISTORY = [
  {
    title: "Earned",
    note: "Nov 9 · from Northwind's bill #1032",
    amount: "960000",
    kind: "earned",
  },
  {
    title: "Earned",
    note: "Nov 7 · from Blue Ridge's bill #1028",
    amount: "980000",
    kind: "earned",
  },
  { title: "Withdrawal", note: "Nov 1 · to your wallet", amount: "-500000000", kind: "out" },
  { title: "Deposit", note: "Oct 21 · from your wallet", amount: "5500000000", kind: "in" },
] as const;
export function InvestorScreen({
  initialState = "I1.1",
  preview = false,
  shipmentId = 1041,
}: {
  initialState?: InvestorState;
  preview?: boolean;
  shipmentId?: number;
}) {
  const [state, setState] = useState(initialState),
    [amount, setAmount] = useState(
      initialState === "I2.3" || initialState === "I2.6" ? "5000" : "1000",
    ),
    [filter, setFilter] = useState("All"),
    [risks, setRisks] = useState(false),
    [receipt, setReceipt] = useState<{
      amount: string;
      paid: string;
      queued: string;
      tx?: string;
    } | null>(null),
    [pending, setPending] = useState(false),
    [txError, setTxError] = useState<string | null>(null);
  const snapshot = useSyncExternalStore(subscribe, read, () => "");
  /* The live path reads testnet for the signed-in investor. The gallery keeps its fixtures. */
  const { profile } = useAuth();
  const live = LIVE && !preview && profile?.role === "investor" ? profile : null;
  const { data, failed, refresh } = useLivePool(live?.accountId);
  const fixture = INVESTOR_FIXTURES[initialState];
  const [previewBalance, setPreviewBalance] = useState<DemoPoolBalance | null>(null);
  const saved = balanceFromJson(snapshot);
  const balance = live
    ? data
      ? toBalance(data)
      : EMPTY_BALANCE
    : preview
      ? (previewBalance ?? {
          ...INITIAL_BALANCE,
          value: fixture.investor.value,
          cash: fixture.pool.cash,
        })
      : saved;
  const busy = live
    ? BigInt(balance.value) > 0n && BigInt(balance.cash) < BigInt(balance.value)
    : state === "I1.3" || state === "I2.6";
  const firstVisit = live ? data?.shares === 0n : state === "I1.2";
  const name = live ? live.name.split(" ")[0] || live.accountId : "Maya";
  const lent = BigInt(balance.total) - BigInt(balance.cash);
  const utilization = Number((lent * 10000n) / (BigInt(balance.total) || 1n)) / 10000;
  const share =
    BigInt(balance.total) > 0n ? Number((BigInt(balance.value) * 100n) / BigInt(balance.total)) : 0;
  const current = state.startsWith("I3")
    ? state === "I3.3"
      ? "/pool/history"
      : "/pool/deliveries"
    : "/pool";
  const deposit = state.startsWith("I2") && !["I2.5", "I2.6", "I2.7"].includes(state),
    success = state === "I2.4" || state === "I2.7",
    transfer = state.startsWith("I2"),
    waiting = state === "I2.2" || pending;
  let units = 0n;
  try {
    units = parseUsdc(amount);
  } catch {
    /* Invalid demo input falls back to a disabled action or fixture. */
  }
  const ceiling = BigInt(deposit ? balance.wallet : balance.value);
  const error =
    units > ceiling
      ? deposit
        ? `That's more than your wallet has. You can deposit up to ${formatUsdc(ceiling)} USDC.`
        : "That's more than your money in the pool."
      : undefined;
  const paid = units < BigInt(balance.cash) ? units : BigInt(balance.cash),
    queued = deposit ? 0n : units - paid;
  /* The wallet cannot cover the amount, so the row and its figure turn red. */
  const walletShort = deposit && units > BigInt(balance.wallet);
  /* What the result sheet reports once the money has moved. */
  const settledValue =
    preview && !receipt ? (deposit ? "6009720000" : "4009720000") : balance.value;
  const settledTotal =
    preview && !receipt ? (deposit ? "26000000000" : "24000000000") : balance.total;
  const settledShare = Math.round((Number(settledValue) / Number(settledTotal)) * 100);
  async function submitLive(accountId: string) {
    setTxError(null);
    setPending(true);
    try {
      const tx = deposit
        ? await ensureUsdcStorage(accountId).then(() =>
            callContract(
              USDC_CONTRACT,
              "ft_transfer_call",
              { receiver_id: WAYBIL_CONTRACT, amount: String(units), msg: "deposit" },
              { deposit: "1", gas: TX_GAS },
            ),
          )
        : await callContract(
            WAYBIL_CONTRACT,
            "withdraw",
            { amount: String(units) },
            { gas: TX_GAS },
          );
      setReceipt({ amount: String(units), paid: String(paid), queued: String(queued), tx });
      refresh();
      setState(deposit ? "I2.4" : "I2.7");
    } catch (failure) {
      setTxError(wallError(failure));
    } finally {
      setPending(false);
    }
  }
  async function payQueue() {
    try {
      await callContract(WAYBIL_CONTRACT, "process_queue", {}, { gas: TX_GAS });
      refresh();
    } catch (failure) {
      setTxError(wallError(failure));
    }
  }
  function submit() {
    if (units <= 0n || error) return;
    if (live) return void submitLive(live.accountId);
    const result = changePoolBalance(balance, deposit ? "deposit" : "withdraw", amount);
    if (preview) setPreviewBalance(result.balance);
    if (!preview) {
      localStorage.setItem(KEY, JSON.stringify(result.balance));
      window.dispatchEvent(new Event("waybil-demo-pool"));
    }
    setReceipt({ amount: String(units), paid: String(result.paid), queued: String(result.queued) });
    setState(deposit ? "I2.4" : "I2.7");
  }
  function quick(percent: number) {
    const base =
      percent === 100 && !deposit
        ? BigInt(balance.value) < BigInt(balance.cash)
          ? BigInt(balance.value)
          : BigInt(balance.cash)
        : ceiling;
    const value = (base * BigInt(percent)) / 100n;
    setAmount(`${value / 1000000n}.${(value % 1000000n).toString().padStart(6, "0")}`);
  }
  const close = () => {
    setTxError(null);
    setState("I1.1");
    setReceipt(null);
  };
  const home = (
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
            <Button
              variant="moment"
              icon={<Plus size={17} />}
              onClick={() => {
                setAmount("1000");
                setState("I2.1");
              }}
            >
              Deposit
            </Button>
            {!firstVisit && (
              <Button
                variant="secondary"
                onClick={() => {
                  setAmount("1000");
                  setState(busy ? "I2.6" : "I2.5");
                }}
              >
                Withdraw
              </Button>
            )}
          </div>
          {BigInt(balance.queued) > 0n && (
            <p className="text-label">
              {formatUsdc(BigInt(balance.queued))} USDC will arrive as bills are paid.
              {live && data && queuePosition(data.queue, live.accountId) !== null && (
                <> You are number {queuePosition(data.queue, live.accountId)} in line.</>
              )}
            </p>
          )}
          {live && data && data.queue.length > 0 && queueCash(data.pool) > 0n && (
            <Button variant="secondary" onClick={() => void payQueue()}>
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
      {live ? (
        <LiveSections data={data} />
      ) : (
        <>
          <div className="grid gap-16 md:grid-cols-3">
            <Stat
              className="w-full"
              label="Earned by the pool"
              value={<Money amount="48600000" />}
              context={`The pool earns ${POOL_PERCENT} of each bill.`}
            />
            <Stat className="w-full" label="Missed payments" value="0" context="Out of 9 trips" />
            <Stat
              className="w-full"
              label="Average trip"
              value="13 days"
              context="From payment to repayment"
            />
          </div>
          <div className="grid items-start gap-16 lg:grid-cols-2">
            <Panel title="Owed by each company">
              {[
                {
                  name: "Northwind Freight Co.",
                  pct: 0.8,
                  used: "2,400.00",
                  limit: "3,000.00",
                  note: "Every bill was paid on time.",
                },
                {
                  name: "Blue Ridge Logistics",
                  pct: 0.3,
                  used: "594.00",
                  limit: "2,000.00",
                  note: "Every bill was paid on time.",
                },
                {
                  name: "Atlas Cargo",
                  pct: 0.2,
                  used: "300.00",
                  limit: "1,500.00",
                  note: "No bills have been paid yet.",
                },
              ].map((c) => (
                <div key={c.name} className="flex flex-col gap-8 py-8">
                  <div className="flex justify-between text-label">
                    <span>{c.name}</span>
                    <span className="text-ds-muted">{Math.round(c.pct * 100)}%</span>
                  </div>
                  <FanMeter value={c.pct} label={`${c.name} credit used`} className="w-full" />
                  <p className="text-caption text-ds-muted">
                    {c.used} of {c.limit} USDC. {c.note}
                  </p>
                </div>
              ))}
            </Panel>
            <Panel
              title="Latest"
              gap={4}
              className="p-20 pb-10"
              action={
                <Link className="link focus-ring text-label" href="/pool/history">
                  See all
                </Link>
              }
            >
              {[
                {
                  icon: <ArrowLineDown size={16} />,
                  title: "Paid Sam early",
                  amount: "292500000",
                  note: "#1041 · Eastport to Harbor City",
                  when: "Today",
                },
                {
                  icon: <SealCheck size={16} />,
                  title: "Northwind paid a bill",
                  amount: "300000000",
                  note: "#1032 · 1 day early",
                  when: "Yesterday",
                },
                {
                  icon: <Plus size={16} />,
                  title: "You deposited",
                  amount: "5500000000",
                  note: "",
                  when: "Oct 21",
                },
              ].map((h) => (
                <Link
                  key={h.title}
                  href="/pool/history"
                  className="focus-ring flex items-center gap-12 py-12"
                >
                  <span className="grid size-36 shrink-0 place-items-center rounded-full bg-ds-canvas">
                    {h.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-label">{h.title}</span>
                    <span className="block text-caption text-ds-muted">
                      <Money amount={h.amount} />
                      {h.note && ` · ${h.note}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-caption text-ds-muted">{h.when}</span>
                </Link>
              ))}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
  return (
    <RoleShell role="investor" current={current}>
      <div className="flex flex-col gap-24">
        {!state.startsWith("I3") ? (
          home
        ) : live && !data ? (
          <Panel className="grid min-h-240 place-content-center text-center">
            <p className="text-label text-ds-muted">
              {failed ? "We could not load the pool. Try again in a moment." : "Loading the pool."}
            </p>
            {failed && (
              <Button variant="secondary" className="mx-auto mt-12" onClick={refresh}>
                Try again
              </Button>
            )}
          </Panel>
        ) : live && data && state === "I3.3" ? (
          <LiveHistory accountId={live.accountId} queue={data.queue} />
        ) : state === "I3.3" ? (
          <>
            <header>
              <h1 className="text-title">History</h1>
              <p className="mt-6 text-label text-ds-muted">
                Your deposits, withdrawals, and earnings.
              </p>
            </header>
            <Panel gap={4} className="px-20 py-8">
              {HISTORY.map((h, i) => (
                <div key={i} className="flex items-center gap-12 py-14">
                  <span className="grid size-38 shrink-0 place-items-center rounded-full bg-ds-canvas">
                    {h.kind === "earned" ? (
                      <SealCheck size={16} />
                    ) : h.kind === "out" ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body">{h.title}</span>
                    <span className="block text-caption text-ds-muted">{h.note}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-label",
                      h.kind === "earned" ? "text-ds-success" : "text-ds-ink",
                    )}
                  >
                    {h.kind === "earned" && "+"}
                    <Money amount={h.amount} />
                  </span>
                </div>
              ))}
            </Panel>
          </>
        ) : live && data && state === "I3.2" ? (
          <LiveDelivery
            shipment={data.deliveries.find((s) => s.id === shipmentId)}
            value={balance.value}
            total={balance.total}
          />
        ) : live && data && (state === "I3.1" || state === "I3.4") ? (
          <LiveDeliveries deliveries={data.deliveries} />
        ) : state === "I3.2" || state === "I3.5" ? (
          <DeliveryDetails
            id={shipmentId}
            value={balance.value}
            total={balance.total}
            reserve={fixture.pool.reserve}
            covered={state === "I3.5"}
          />
        ) : (
          <>
            <header>
              <h1 className="text-title">Deliveries</h1>
              <p className="mt-6 text-label text-ds-muted">
                Every trip the pool paid for, with proof it arrived.
              </p>
            </header>
            {/* With no deliveries there is nothing to filter, so the empty card stands alone. */}
            {state !== "I3.4" && (
              <div className="flex w-fit flex-wrap gap-6 rounded-full bg-ds-bg p-4">
                {[
                  { label: "All", count: 9 },
                  { label: "Waiting to be repaid", count: 3 },
                  { label: "Repaid", count: 6 },
                ].map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => setFilter(f.label)}
                    className={cn(
                      "press focus-ring flex items-center gap-6 rounded-full px-14 py-8 text-label transition-colors duration-150 ease-base",
                      filter === f.label
                        ? "bg-ds-ink text-ds-bg"
                        : "text-ds-ink-2 hover:bg-ds-canvas",
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
            <Panel
              gap={4}
              className={cn(
                "px-20 py-8",
                state === "I3.4" && "min-h-[calc(100dvh-330px)] md:min-h-[calc(100dvh-290px)]",
              )}
            >
              {state === "I3.4" ? (
                <div className="grid min-h-360 flex-1 place-content-center gap-16 text-center">
                  <img src="/illustrations/investor.svg" alt="" className="mx-auto h-96" />
                  <h2 className="text-heading">No deliveries yet</h2>
                  <p className="max-w-340 text-label text-ds-muted">
                    When the pool pays a driver early, the delivery shows up here with its proof.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden gap-16 py-12 text-caption text-ds-muted md:grid md:grid-cols-[1fr_140px_130px_170px]">
                    <span>Delivery</span>
                    <span>Paid early</span>
                    <span>Status</span>
                    <span>Bill</span>
                  </div>
                  {DELIVERIES.filter(
                    (r) => filter === "All" || (filter === "Repaid") === r.repaid,
                  ).map((r) => (
                    <Link
                      href={`/pool/deliveries/${r.id}`}
                      key={r.id}
                      className="focus-ring grid items-center gap-10 py-14 md:grid-cols-[1fr_140px_130px_170px] md:gap-16"
                    >
                      <span className="flex items-center gap-12">
                        <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-canvas">
                          <Package size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-body">Eastport to {r.city}</span>
                          <span className="block text-caption text-ds-muted">
                            #{r.id} · Northwind · {r.driver}
                          </span>
                        </span>
                      </span>
                      <Money amount={r.amount} className="text-label" />
                      <span className="justify-self-start">
                        <StatusPill status={r.repaid ? "repaid" : "paidEarly"} />
                      </span>
                      <p className="text-label text-ds-ink-2">
                        {r.repaid ? "Paid back" : "Bill due"} {r.due}
                      </p>
                    </Link>
                  ))}
                </>
              )}
            </Panel>
          </>
        )}
        {!live && (
          <p className="text-center text-caption text-ds-muted">
            This demo uses sample data. It does not move money.
          </p>
        )}
      </div>
      {transfer && (
        <ActionSheet
          title={
            success
              ? deposit
                ? "Deposit received"
                : "Withdrawn"
              : deposit
                ? "Deposit"
                : "Withdraw"
          }
          stamp={success ? <SealCheck size={34} /> : undefined}
          stampTone="brand"
          onClose={close}
        >
          {success ? (
            <>
              <Money amount={receipt?.amount ?? "1000000000"} className="text-amount" />
              <p className="text-label text-ds-muted">
                {deposit
                  ? "It starts paying truck owners on the next delivery."
                  : live
                    ? "The available part is on its way to your wallet."
                    : "The available part was sent in this local demo."}
              </p>
              {BigInt(receipt?.queued ?? "0") > 0n && (
                <p className="rounded-row bg-ds-warning-soft p-16 text-label">
                  {formatUsdc(BigInt(receipt!.paid))} USDC is available now.{" "}
                  {formatUsdc(BigInt(receipt!.queued))} USDC is waiting for bills to be paid.
                </p>
              )}
              {receipt?.tx ? (
                <ProofLink tx={receipt.tx} />
              ) : (
                <DemoRecord title={deposit ? "Demo deposit receipt" : "Demo withdrawal receipt"} />
              )}
              <div className="w-full rounded-row bg-ds-canvas p-16 text-label">
                <div className="flex justify-between gap-12 py-4">
                  <span className="text-ds-muted">Your money in the pool</span>
                  <Money amount={settledValue} />
                </div>
                <div className="flex justify-between gap-12 py-4">
                  <span className="text-ds-muted">Your share</span>
                  <span>{settledShare}%</span>
                </div>
              </div>
              <Button icon={<ArrowUpRight size={17} />} className="w-full" onClick={close}>
                Done
              </Button>
            </>
          ) : (
            <>
              <Input
                label="Amount"
                suffix="USDC"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={error}
                disabled={waiting}
              />
              {/* Small grey chips, the size the board draws them, not full buttons. */}
              <div className="flex flex-wrap gap-8">
                {[25, 50, 100].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={waiting}
                    onClick={() => quick(n)}
                    className="press focus-ring rounded-full bg-ds-canvas px-12 py-6 text-caption hover:bg-ds-surface-3 disabled:text-ds-off-ink"
                  >
                    {n === 100 ? (deposit ? "Max" : "Max now") : `${n}%`}
                  </button>
                ))}
              </div>
              {waiting ? (
                <div className="flex flex-col gap-10">
                  {[
                    {
                      title: deposit ? "Allow the deposit" : "Allow the withdrawal",
                      note: "Done in your wallet",
                      done: true,
                    },
                    {
                      title: `Send ${formatUsdc(units)} USDC`,
                      note: "Approve it in your wallet",
                      done: false,
                    },
                  ].map((step) => (
                    <div
                      key={step.title}
                      className={cn(
                        "flex items-center gap-12 rounded-row p-14",
                        step.done ? "bg-ds-canvas" : "bg-ds-brand-soft",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-26 shrink-0 place-items-center rounded-full",
                          step.done ? "bg-ds-ink text-ds-bg" : "bg-ds-brand text-ds-ink",
                        )}
                      >
                        {step.done ? (
                          <Check size={14} weight="bold" />
                        ) : (
                          <CircleNotch
                            size={14}
                            className="animate-spin motion-reduce:animate-none"
                          />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-label">{step.title}</span>
                        <span className="block text-caption text-ds-muted">{step.note}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <p className="text-label text-ds-muted">
                    {deposit
                      ? `Your money pays truck owners early. The pool earns ${POOL_PERCENT} of each bill, and you get your share.`
                      : queued > 0n
                        ? `Only ${formatUsdc(paid)} USDC is free right now. The rest is paying truck owners.`
                        : `You can withdraw up to ${formatUsdc(ceiling < BigInt(balance.cash) ? ceiling : BigInt(balance.cash))} USDC right now.`}
                  </p>
                  {queued > 0n ? (
                    <div className="flex gap-12 rounded-row bg-ds-brand-soft p-16">
                      <Info size={18} className="shrink-0 text-ds-brand-deep" />
                      <p className="text-label">
                        You get {formatUsdc(paid)} USDC now. The other {formatUsdc(queued)} USDC
                        comes to you on its own as bills are paid.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-12 rounded-row border border-ds-line p-14">
                      <Wallet size={18} className="shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-label">
                          {deposit ? "From your wallet" : "To your wallet"}
                        </span>
                        <span
                          className={cn(
                            "block text-caption",
                            deposit && walletShort ? "text-ds-danger" : "text-ds-muted",
                          )}
                        >
                          {deposit
                            ? `${formatUsdc(BigInt(balance.wallet))} USDC available`
                            : "Arrives in under a second"}
                        </span>
                      </span>
                    </div>
                  )}
                </>
              )}
              {txError && (
                <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
                  {txError}
                </p>
              )}
              <Button
                disabled={!!error || units <= 0n}
                loading={waiting}
                loadingLabel="Waiting for wallet"
                onClick={submit}
              >
                {error || units <= 0n
                  ? deposit
                    ? "Deposit"
                    : "Withdraw"
                  : `${deposit ? "Deposit" : "Withdraw"} ${formatUsdc(units)} USDC`}
              </Button>
              {deposit && !waiting && (
                <button className="link focus-ring text-caption" onClick={() => setRisks(true)}>
                  How the pool works and its risks
                </button>
              )}
              {(waiting || !live) && (
                <p className="text-caption text-ds-muted">
                  {waiting
                    ? "Two quick approvals. The first one only happens once."
                    : "This is a local demo. No wallet request is sent."}
                </p>
              )}
            </>
          )}
        </ActionSheet>
      )}
      {risks && (
        <ActionSheet title="How the pool works" onClose={() => setRisks(false)}>
          <p className="text-label">
            Your money pays drivers after a warehouse confirms delivery. Companies repay their bills
            later.
          </p>
          <p className="text-label">
            Returns depend on repayments. Missed bills can reduce the value of your share.
            Withdrawals can wait while money is lent out. The reserve may not cover every loss.
          </p>
          <Button onClick={() => setRisks(false)}>I understand</Button>
        </ActionSheet>
      )}
    </RoleShell>
  );
}
function DeliveryDetails({
  id,
  value,
  total,
  reserve,
  covered = false,
}: {
  id: number;
  value: string;
  total: string;
  reserve: string;
  covered?: boolean;
}) {
  const bill = id === 1043 ? 150000000n : id === 1039 ? 120000000n : 300000000n;
  const city = id === 1041 ? "Harbor City" : id === 1039 ? "Millbrook" : "Riverton";
  const driver = id === 1043 ? "Jordan Lee" : "Sam";
  const split = splitBill(bill);
  /* The investor's part follows their live share of the pool, not a fixed number. */
  const pool = BigInt(total);
  const share = pool > 0n ? Number((BigInt(value) * 100n) / pool) : 0;
  const part = pool > 0n ? (split.pool * BigInt(value)) / pool : 0n;
  /*
   * Covered by reserve (I3.5). The bill was never repaid, so the reserve pays back the advance
   * as far as it can and the pool shares whatever is left as a loss (docs/specs/contract.md).
   */
  const advance = advanceFor(bill);
  const reservePaid = advance < BigInt(reserve) ? advance : BigInt(reserve);
  const loss = advance - reservePaid;
  const lossPart = pool > 0n ? (loss * BigInt(value)) / pool : 0n;
  const money = covered
    ? [
        { label: `Paid early to ${driver}`, value: advance },
        { label: "Northwind paid back", value: 0n },
        { label: "Reserve paid the pool", value: reservePaid },
        { label: "Pool loss", value: loss },
        { label: `Your part of the loss (${share}%)`, value: lossPart },
      ]
    : [
        { label: `Paid early to ${driver}`, value: split.driver },
        { label: "Northwind pays back", value: bill },
        { label: "Pool earns", value: split.pool },
        { label: `Your part at ${share}%`, value: part },
        { label: "Safety reserve", value: split.reserve },
        { label: "Waybil fee", value: split.waybil },
      ];
  const steps = [
    {
      title: "Approved by Northwind",
      who: "Hannah Brooks · Nov 12, 08:02",
      detail: `Bill ${formatUsdc(bill)} USDC, due Dec 11`,
      warning: false,
    },
    {
      title: `Picked up by ${driver}`,
      who: "Nov 12, 09:14 · Main warehouse, Eastport",
      detail: "Load checked by the driver",
      warning: false,
    },
    {
      title: "Arrival confirmed by Harbor Hub",
      who: "Lena · Nov 12, 15:36",
      detail: "120 of 120 crates",
      warning: false,
    },
    ...(covered
      ? [
          {
            title: "Covered by the reserve",
            who: "Waybil team · Dec 27, 10:20",
            detail: "2 of 3 approved. Northwind is paused until it settles.",
            warning: true,
          },
        ]
      : []),
  ];
  return (
    <>
      <Link
        href="/pool/deliveries"
        className="focus-ring flex items-center gap-8 text-label text-ds-muted"
      >
        <ArrowLeft size={18} />
        Deliveries
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-12">
        <div>
          <h1 className="text-title">Eastport to {city}</h1>
          <p className="mt-6 text-label text-ds-muted">
            #{id} · Northwind · {driver}
          </p>
        </div>
        <StatusPill status={covered ? "coveredByReserve" : "paidEarly"} />
      </header>
      <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,1fr)_400px]">
        <DemoMap
          phase="arrived"
          destination={city}
          label="Delivered Nov 12"
          className="h-340 md:h-420 lg:h-500"
        />
        <div className="flex flex-col gap-16">
          <Panel title="Money" gap={4}>
            {money.map((r) => (
              <div key={r.label} className="flex flex-wrap justify-between gap-8 py-9 text-label">
                <span className="text-ds-muted">{r.label}</span>
                <Money amount={String(r.value)} />
              </div>
            ))}
          </Panel>
          <Panel title="Proof it happened" gap={4}>
            {/* Sample steps have no transaction, so the panel says where the links go. */}
            <p className="text-caption text-ds-muted">
              These are sample steps. Each link opens the demo account, not a real transaction.
            </p>
            {steps.map((step) => (
              <div key={step.title} className="flex gap-14 py-12">
                <span
                  className={cn(
                    "mt-2 grid size-26 shrink-0 place-items-center rounded-full text-ds-bg",
                    step.warning ? "bg-ds-warning" : "bg-ds-ink",
                  )}
                >
                  {step.warning ? (
                    <ShieldCheck size={14} weight="bold" />
                  ) : (
                    <Check size={14} weight="bold" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-label">{step.title}</span>
                  <span className="block text-caption text-ds-muted">{step.who}</span>
                  <span className="block text-caption text-ds-ink-2">{step.detail}</span>
                  <a
                    className="link focus-ring mt-4 inline-block text-caption"
                    href={CONTRACT_RECORD_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    See the record on NearBlocks ↗
                  </a>
                </span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}
