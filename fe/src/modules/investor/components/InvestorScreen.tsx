"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { formatUsdc, parseUsdc, splitBill } from "@waybil/shared";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { ArrowLineDown, Plus, SealCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Money } from "@/components/elements/Money";
import { FanMeter, MeterLegend } from "@/components/elements/FanMeter";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { DemoMap } from "@/components/elements/DemoMap";
import { StatusPill } from "@/components/elements/StatusPill";
import { Stat } from "@/components/elements/Stat";
import { cn } from "@/lib/cn";
import { INVESTOR_FIXTURES, type InvestorState } from "../data/fixtures";
import { changePoolBalance, INITIAL_BALANCE, type DemoPoolBalance } from "../data/demo";
const KEY = "waybil-demo-pool-v1";
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
  { title: "Earned", note: "Nov 9 · Northwind's bill #1032", amount: "960000" },
  { title: "Earned", note: "Nov 7 · Blue Ridge's bill #1028", amount: "980000" },
  { title: "Withdrawal", note: "Nov 1 · Your wallet", amount: "-500000000" },
  { title: "Deposit", note: "Oct 21 · Your wallet", amount: "5500000000" },
];
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
    [receipt, setReceipt] = useState<{ amount: string; paid: string; queued: string } | null>(null);
  const snapshot = useSyncExternalStore(subscribe, read, () => "");
  const fixture = INVESTOR_FIXTURES[initialState];
  const [previewBalance, setPreviewBalance] = useState<DemoPoolBalance | null>(null);
  const saved = balanceFromJson(snapshot);
  const busy = state === "I1.3" || state === "I2.6";
  const balance = preview
    ? (previewBalance ?? {
        ...INITIAL_BALANCE,
        value: fixture.investor.value,
        cash: fixture.pool.cash,
      })
    : saved;
  const lent = BigInt(balance.total) - BigInt(balance.cash);
  const utilization = Number((lent * 10000n) / BigInt(balance.total || "1")) / 10000;
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
    waiting = state === "I2.2";
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
  function submit() {
    if (units <= 0n || error) return;
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
    setState("I1.1");
    setReceipt(null);
  };
  const home = (
    <div className="flex flex-col gap-16 md:gap-24">
      <header>
        <h1 className="text-title">{state === "I1.2" ? "Welcome, Maya" : "Hi, Maya"}</h1>
        <p className="mt-6 text-label text-ds-muted">
          {state === "I1.2"
            ? "Here’s how the pool is doing. Deposit to start earning."
            : "Your money pays truck owners early."}
        </p>
      </header>
      <div className="grid gap-16 lg:grid-cols-[520px_1fr]">
        <section className="relative isolate flex flex-col justify-between gap-24 overflow-hidden rounded-card bg-ds-ink p-24 text-ds-bg [&>p]:relative [&>div]:relative">
          <img
            src="/illustrations/investor-glow.png"
            alt=""
            className="pointer-events-none absolute inset-0 -z-10 size-full object-cover"
          />
          <p className="text-label text-ds-line">Your money in the pool</p>
          <Money
            amount={balance.value}
            className="text-[36px] font-medium tracking-tight md:text-amount"
          />
          <p className="text-label text-ds-brand">
            {state === "I1.2"
              ? "Deposit USDC to start earning."
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
            {state !== "I1.2" && (
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
            </p>
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
          <div className="flex flex-col gap-4">
            <Money amount={balance.total} className="text-amount" />
            <p className="text-caption text-ds-muted">
              {busy
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
              {[0, 5000, 10000, 15000, 20000, 25000].map((n) => (
                <span key={n}>{n.toLocaleString()}</span>
              ))}
            </div>
            <MeterLegend value={utilization} className="mt-10" />
          </div>
          {busy && (
            <p className="rounded-row bg-ds-warning-soft p-16 text-label">
              Most of the pool is working right now. Withdrawals over 2,000.00 USDC wait until
              companies pay their bills.
            </p>
          )}
        </Panel>
      </div>
      <div className="grid gap-16 md:grid-cols-3">
        <Stat
          className="w-full"
          label="Earned by the pool"
          value={<Money amount="48600000" />}
          context="The pool earns 1.6% of each bill."
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
              See all ↗
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
    </div>
  );
  return (
    <RoleShell role="investor" current={current}>
      <div className="flex flex-col gap-24">
        {!state.startsWith("I3") ? (
          home
        ) : state === "I3.3" ? (
          <>
            <header>
              <h1 className="text-title">History</h1>
              <p className="mt-6 text-label text-ds-muted">
                Your deposits, withdrawals, and earnings.
              </p>
            </header>
            <Panel>
              {HISTORY.map((h, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-12 border-b border-ds-line py-16 last:border-0"
                >
                  <div>
                    <p className="text-body font-medium">{h.title}</p>
                    <p className="text-caption text-ds-muted">{h.note}</p>
                    <a
                      className="link focus-ring text-caption"
                      href="https://testnet.nearblocks.io/address/app.waybil.testnet"
                      target="_blank"
                      rel="noreferrer"
                    >
                      See the record on NearBlocks ↗
                    </a>
                  </div>
                  <Money amount={h.amount} className="text-heading" />
                </div>
              ))}
            </Panel>
          </>
        ) : state === "I3.2" ? (
          <DeliveryDetails id={shipmentId} />
        ) : (
          <>
            <header>
              <h1 className="text-title">Deliveries</h1>
              <p className="mt-6 text-label text-ds-muted">
                Every trip the pool paid for, with proof it arrived.
              </p>
            </header>
            <Panel>
              <div className="flex flex-wrap gap-8">
                {["All", "Waiting to be repaid", "Repaid"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "press focus-ring rounded-full px-16 py-8 text-label transition-colors duration-150 ease-base",
                      filter === f ? "bg-ds-ink text-ds-bg" : "bg-ds-canvas text-ds-muted",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {state === "I3.4" ? (
                <div className="grid min-h-360 place-content-center gap-16 text-center">
                  <img src="/illustrations/investor.svg" alt="" className="mx-auto h-96" />
                  <h2 className="text-heading">No deliveries yet</h2>
                  <p className="max-w-340 text-label text-ds-muted">
                    When the pool pays a driver early, the delivery shows up here with its proof.
                  </p>
                </div>
              ) : (
                [
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
                  {
                    id: 1039,
                    city: "Millbrook",
                    driver: "Sam",
                    amount: "117000000",
                    due: "Nov 14",
                    repaid: false,
                  },
                  {
                    id: 1032,
                    city: "Riverton",
                    driver: "Sam",
                    amount: "292500000",
                    due: "Nov 9",
                    repaid: true,
                  },
                ]
                  .filter((r) => filter === "All" || (filter === "Repaid") === r.repaid)
                  .map((r) => (
                    <Link
                      href={`/pool/deliveries/${r.id}`}
                      key={r.id}
                      className="focus-ring grid gap-10 rounded-row border-b border-ds-line py-20 md:grid-cols-[1fr_150px_130px_170px]"
                    >
                      <div>
                        <p className="text-body font-medium">Eastport to {r.city}</p>
                        <p className="text-caption text-ds-muted">
                          #{r.id} · Northwind · {r.driver}
                        </p>
                      </div>
                      <Money amount={r.amount} className="text-body" />
                      <StatusPill status={r.repaid ? "repaid" : "paidEarly"} />
                      <p className="text-label text-ds-muted">
                        {r.repaid ? "Paid back" : "Bill due"} {r.due}
                      </p>
                    </Link>
                  ))
              )}
            </Panel>
          </>
        )}
        <p className="text-center text-caption text-ds-muted">
          This demo uses sample data. It does not move money.
        </p>
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
          onClose={close}
        >
          {success ? (
            <>
              <Money amount={receipt?.amount ?? "1000000000"} className="text-amount" />
              <p className="text-label text-ds-muted">
                {deposit
                  ? "It starts paying truck owners on the next delivery."
                  : "The available part was sent in this local demo."}
              </p>
              {BigInt(receipt?.queued ?? "0") > 0n && (
                <p className="rounded-row bg-ds-warning-soft p-16 text-label">
                  {formatUsdc(BigInt(receipt!.paid))} USDC is available now.{" "}
                  {formatUsdc(BigInt(receipt!.queued))} USDC is waiting for bills to be paid.
                </p>
              )}
              <DemoRecord title={deposit ? "Demo deposit receipt" : "Demo withdrawal receipt"} />
              <div className="flex justify-between text-label">
                <span>Your money in the pool</span>
                <Money
                  amount={
                    preview && !receipt ? (deposit ? "6009720000" : "4009720000") : balance.value
                  }
                />
              </div>
              <Button onClick={close}>Done</Button>
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
                <div className="flex flex-col gap-12 rounded-row bg-ds-canvas p-16 text-label">
                  <p>Allow the deposit</p>
                  <p className="text-ds-muted">Confirm the first-time setup in your wallet.</p>
                  <p>Send {formatUsdc(units)} USDC</p>
                </div>
              ) : (
                <>
                  <p
                    className={cn(
                      "text-label text-ds-muted",
                      queued > 0n && "rounded-row bg-ds-warning-soft p-16 text-ds-ink",
                    )}
                  >
                    {deposit
                      ? "Your money pays truck owners early. The pool earns 1.6% of each bill, and you get your share."
                      : queued > 0n
                        ? `You get ${formatUsdc(paid)} USDC now. The other ${formatUsdc(queued)} USDC comes to you as bills are paid.`
                        : `You can withdraw up to ${formatUsdc(ceiling < BigInt(balance.cash) ? ceiling : BigInt(balance.cash))} USDC right now.`}
                  </p>
                  <div className="rounded-row bg-ds-canvas p-16 text-label">
                    <p>{deposit ? "From your wallet" : "To your wallet"}</p>
                    <p className="mt-4 text-caption text-ds-muted">
                      {deposit
                        ? `${formatUsdc(BigInt(balance.wallet))} USDC is available.`
                        : "The free part arrives after approval."}
                    </p>
                  </div>
                </>
              )}
              <Button
                disabled={!!error || units <= 0n}
                loading={waiting}
                loadingLabel="Waiting for wallet"
                onClick={submit}
              >
                {deposit ? "Deposit" : "Withdraw"} {formatUsdc(units)} USDC
              </Button>
              {deposit && (
                <button className="link focus-ring text-caption" onClick={() => setRisks(true)}>
                  How the pool works and its risks
                </button>
              )}
              <p className="text-caption text-ds-muted">
                This is a local demo. No wallet request is sent.
              </p>
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
function DeliveryDetails({ id }: { id: number }) {
  const bill = id === 1043 ? 150000000n : id === 1039 ? 120000000n : 300000000n;
  const city = id === 1041 ? "Harbor City" : id === 1039 ? "Millbrook" : "Riverton";
  const driver = id === 1043 ? "Jordan Lee" : "Sam";
  const split = splitBill(bill);
  return (
    <>
      <Link href="/pool/deliveries" className="focus-ring text-label text-ds-muted">
        ← Deliveries
      </Link>
      <header>
        <h1 className="text-title">Eastport to {city}</h1>
        <p className="mt-6 text-label text-ds-muted">
          #{id} · Northwind · {driver}
        </p>
      </header>
      <div className="grid items-start gap-24 lg:grid-cols-[1fr_440px]">
        <div className="flex flex-col gap-24">
          <DemoMap phase="arrived" />
          <Panel title="Proof it happened">
            {["Approved by Northwind", "Picked up by Sam", "Arrival confirmed by Harbor Hub"].map(
              (title, i) => (
                <div key={title} className="border-b border-ds-line py-12 last:border-0">
                  <h3 className="text-body font-medium">{title}</h3>
                  <p className="my-6 text-caption text-ds-muted">
                    {
                      [
                        "Hannah Brooks · Nov 12, 08:02",
                        "Sam · Nov 12, 09:14",
                        "Lena · Nov 12, 15:36",
                      ][i]
                    }
                  </p>
                  <DemoRecord title="Demo delivery proof" />
                </div>
              ),
            )}
          </Panel>
        </div>
        <Panel title="Money">
          {[
            { label: `Paid early to ${driver}`, value: split.driver },
            { label: "Northwind pays back", value: bill },
            { label: "Pool earns", value: split.pool },
            { label: "Your part at 20%", value: split.pool / 5n },
            { label: "Safety reserve", value: split.reserve },
            { label: "Waybil fee", value: split.waybil },
          ].map((r) => (
            <div key={r.label} className="flex flex-wrap justify-between gap-8 py-8 text-label">
              <span className="text-ds-muted">{r.label}</span>
              <Money amount={String(r.value)} />
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
