"use client";
import { useState } from "react";
import {
  ArrowRight,
  CaretRight,
  Check,
  Plus,
  UserPlus,
  WarningCircle,
} from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { Money } from "@/components/elements/Money";
import { Stat } from "@/components/elements/Stat";
import { FanMeter, MeterLegend } from "@/components/elements/FanMeter";
import { DemoMap } from "@/components/elements/DemoMap";
import { formatUsdc } from "@waybil/shared";
import { ShipmentList } from "./ShipmentList";
import { LATE_SHIPMENT, type DemoShipmentRow, type ShipperState } from "../data/fixtures";
import { DEMO_NOW, daysBetween, millis } from "../data/dates";

/* The three tabs on the Shipments card, and which statuses each one shows. */
type Tab = "active" | "paid" | "history";
const TABS: { value: Tab; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "paid", label: "Paid early" },
  { value: "history", label: "History" },
];
/* A bill covered by the reserve left the limit, so it sits in History with the closed ones. */
const done = (row: DemoShipmentRow) =>
  ["Repaid", "Cancelled", "CoveredByReserve"].includes(row.shipment.status);
const TAB_ROWS: Record<Tab, (row: DemoShipmentRow) => boolean> = {
  active: (row) => !done(row),
  paid: (row) => row.shipment.status === "Paid",
  history: done,
};
const daysLeft = (row: DemoShipmentRow) => daysBetween(DEMO_NOW, millis(row.shipment.due_at)!);
const byDue = (a: DemoShipmentRow, b: DemoShipmentRow) =>
  Number(BigInt(a.shipment.due_at) - BigInt(b.shipment.due_at));

export function ShipperHome({
  state,
  go,
  open,
  usedBefore = 2400000000n,
  rows,
  record,
}: {
  state: ShipperState;
  go: (s: ShipperState) => void;
  open: (id: number, pay?: boolean) => void;
  usedBefore?: bigint;
  /** The shipper's shipments as the demo state has them now. */
  rows: DemoShipmentRow[];
  record: { onTime: number; total: number };
}) {
  const [tab, setTab] = useState<Tab>("active");
  const first = state === "P1.2",
    late = state === "P1.4",
    near = state === "P1.3";
  /*
   * A bill covered by the reserve pauses new shipments until it is settled with the team
   * (contract.md). It uses the same paused pattern as the late bill on P1.4.
   */
  const covered = rows.find((row) => row.shipment.status === "CoveredByReserve");
  const paused = late || !!covered;
  const used = first ? 0n : near ? 2790000000n : usedBefore;
  const left = (3000000000n - used).toString();
  /*
   * What the limit is holding, soonest bill first, as P1.1 and P1.4 draw it. On a late
   * screen the overdue bill takes the top row in place of the one due next.
   */
  const openRows = rows.filter((row) => !done(row)).sort(byDue);
  const bills = openRows.filter((row) => row.shipment.status === "Paid");
  const using = (late ? [LATE_SHIPMENT, ...openRows] : openRows).slice(0, 3);
  /* The bill card shows the soonest open bill, or the late one on P1.4. */
  const next = late ? LATE_SHIPMENT : bills[0];
  const nextDays = next ? daysLeft(next) : 0;
  const dueThisWeek = bills.filter((row) => daysLeft(row) <= 7);
  const weekTotal = (late ? [LATE_SHIPMENT] : dueThisWeek).reduce(
    (sum, row) => sum + BigInt(row.shipment.bill),
    0n,
  );
  /* A late bill is the soft danger card on the board, an open one the ink card with the glow. */
  const bill = next && (
    <Panel className={late ? "bg-ds-danger-soft" : "bill-card bg-ds-ink text-ds-bg"}>
      <p className={cn("text-label", late ? "text-ds-danger" : "text-ds-brand")}>
        {nextDays < 0
          ? `${-nextDays} ${nextDays === -1 ? "day" : "days"} late`
          : nextDays === 0
            ? "Due today"
            : `Due in ${nextDays} ${nextDays === 1 ? "day" : "days"}`}
      </p>
      <p className={cn("text-label", late ? "text-ds-ink-2" : "text-ds-on-night")}>
        Bill for #{next.shipment.id} · Eastport to {next.city}
      </p>
      <Money amount={next.shipment.bill} className="text-amount" />
      <Button
        variant={late ? "primary" : "moment"}
        className="w-full justify-between"
        onClick={() => open(next.shipment.id, true)}
      >
        {late ? "Pay now" : "Pay early"}
      </Button>
    </Panel>
  );
  return (
    <div className="flex flex-col gap-24">
      <div className="flex flex-wrap items-end justify-between gap-16">
        <div>
          <h1 className="text-title md:text-amount">
            {first ? "Welcome" : "Good morning"}, Northwind
          </h1>
          <p className="mt-6 text-label text-ds-muted">Thursday, Nov 12</p>
        </div>
        <div className="flex w-full gap-12 md:w-auto">
          <Button
            variant="secondary"
            icon={<UserPlus size={17} />}
            className="hidden md:inline-flex"
            onClick={() => go("P5.3")}
          >
            Invite driver
          </Button>
          <Button
            icon={<Plus size={17} />}
            className="w-full justify-between md:w-auto"
            disabled={paused}
            onClick={() => go("P2.1")}
          >
            New shipment
          </Button>
        </div>
      </div>
      {!late && covered && (
        <div className="flex items-center gap-12 rounded-row bg-ds-danger-soft p-16 text-ds-danger">
          <WarningCircle size={20} className="shrink-0" />
          <p className="flex-1 text-[14px]">
            A bill was covered by the reserve. New shipments are paused until you settle it with our
            team.
          </p>
          <button
            className="focus-ring shrink-0 text-[14px] font-medium underline transition-colors duration-150 ease-base hover:text-ds-ink"
            onClick={() => open(covered.shipment.id)}
          >
            See the bill
          </button>
        </div>
      )}
      {late && (
        <div className="flex items-center gap-12 rounded-row bg-ds-danger-soft p-16 text-ds-danger">
          <WarningCircle size={20} className="shrink-0" />
          <p className="flex-1 text-[14px]">
            Bill for #1036 is 3 days late. New shipments are paused until it&apos;s paid.
          </p>
          <button
            className="focus-ring shrink-0 text-[14px] font-medium underline transition-colors duration-150 ease-base hover:text-ds-ink"
            onClick={() => open(1036)}
          >
            Pay now
          </button>
        </div>
      )}
      <div className="hidden gap-16 md:grid md:grid-cols-3">
        <Stat
          className="w-full"
          label="Your open bills"
          value={<Money amount={used.toString()} />}
          context={first ? "Nothing yet" : "4 trips paid early"}
        />
        <Stat
          className="w-full"
          label="Due this week"
          value={<Money amount={first ? "0" : weekTotal.toString()} />}
          context={
            first
              ? "No bills"
              : late
                ? "1 late bill"
                : dueThisWeek.length === 1
                  ? "1 bill"
                  : `${dueThisWeek.length} bills`
          }
        />
        <Stat
          className="w-full"
          label="Paid on time"
          value={
            first ? "New" : late ? "90%" : `${Math.round((record.onTime / record.total) * 100)}%`
          }
          context={
            first
              ? "Builds as you pay"
              : late
                ? "9 of 10 bills"
                : `${record.onTime} of ${record.total} bills`
          }
        />
      </div>
      {!first && bill && <div className="md:hidden">{bill}</div>}
      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-16 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-16">
          {first && (
            <Panel
              title="Get set up"
              action={<span className="text-caption text-ds-muted">1 of 3 done</span>}
            >
              {[
                ["Invite a driver", "Sam joined", "P5.3"],
                ["Add a destination", "Where your goods go", "P5.4"],
                ["Create your first shipment", "Approve a trip before the truck leaves", "P2.1"],
              ].map(([title, note, next], i) => (
                <button
                  key={title}
                  className="press focus-ring flex items-center gap-16 rounded-small p-12 text-left"
                  onClick={() => go(next as ShipperState)}
                >
                  {/* Only the step that is done carries a tick. The rest keep an empty circle. */}
                  <span className="grid size-32 shrink-0 place-items-center rounded-full bg-ds-canvas">
                    {i === 0 && <Check size={18} />}
                  </span>
                  <span className="flex-1">
                    <span className="block text-body">{title}</span>
                    <span className="block text-caption text-ds-muted">{note}</span>
                  </span>
                  <CaretRight size={16} className="shrink-0 text-ds-muted" />
                </button>
              ))}
            </Panel>
          )}
          <Panel
            title="On the road"
            titleClassName="text-[18px]"
            action={
              !first && (
                <button className="link focus-ring text-caption" onClick={() => open(1041)}>
                  Open map
                </button>
              )
            }
            className="flex-1 p-18"
          >
            <DemoMap
              controls
              empty={first}
              label={first ? "No trucks on the road yet" : "2 trucks moving"}
              twoTrucks={!first}
              className="h-340 md:h-500 lg:h-full lg:min-h-600"
            />
          </Panel>
        </div>
        <div className="flex flex-col gap-16">
          <Panel
            title="Credit limit"
            titleClassName="text-body"
            action={
              <span className="text-label text-ds-muted">
                {Math.round(Number(used) / 30000000)}% used
              </span>
            }
          >
            <Money
              amount={left}
              className="text-[32px] font-medium min-[360px]:text-[38px] tracking-[-0.035em]"
            />
            <p className="text-label font-normal text-ds-muted">
              left to use, out of 3,000.00 USDC
            </p>
            <FanMeter
              className="w-full"
              value={Number(used) / 3000000000}
              label="Credit limit used"
              markerLabel={first ? "Nothing used" : `${formatUsdc(used)} USDC used`}
            />
            <div className="flex justify-between text-caption text-ds-muted">
              <span>0</span>
              <span>1,000</span>
              <span>2,000</span>
              <span>3,000</span>
            </div>
            <MeterLegend value={Number(used) / 3000000000} />
            <div className="border-t border-ds-line pt-16">
              <h3 className={cn("mb-12", first ? "text-[14.5px] font-medium" : "text-label")}>
                {first ? "Nothing in use yet" : "What's using it"}
              </h3>
              {first ? (
                <p className="text-label font-normal text-ds-muted">
                  Each shipment you approve uses part of your limit until you pay its bill.
                </p>
              ) : (
                using.map((r, i) => (
                  <button
                    key={r.shipment.id}
                    className="focus-ring mb-12 flex w-full items-center gap-10 text-left text-caption"
                    onClick={() => open(r.shipment.id)}
                  >
                    {/* The soonest bill is marked in brand, a late one in red, the rest in ink. */}
                    <span
                      aria-hidden
                      className={cn(
                        "size-8 shrink-0 rounded-full",
                        i > 0 ? "bg-ds-ink" : late ? "bg-ds-danger" : "bg-ds-brand",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      #{r.shipment.id} Eastport to {r.city}
                      <span className="block text-ds-muted">{r.due}</span>
                    </span>
                    <Money amount={r.shipment.bill} />
                  </button>
                ))
              )}
              {!first && (
                <button className="link focus-ring text-caption" onClick={() => go("P6.1")}>
                  View all
                </button>
              )}
            </div>
            {/* The card already shows an arrow, so the label drops the "↗" (root AGENTS.md). */}
            <button
              className="link-ink focus-ring flex items-center gap-8 self-start text-[14px] font-medium"
              onClick={() => go("P7.1")}
            >
              View credit details
              <ArrowRight size={16} />
            </button>
          </Panel>
          {!first && bill && <div className="hidden md:block">{bill}</div>}
        </div>
      </div>
      {!first && (
        <Panel
          title="Shipments"
          /* On a narrow phone the tabs drop under the title instead of pushing the card wide. */
          className="[&>div:first-child]:flex-wrap [&>div:first-child]:gap-y-12"
          action={
            <Segmented
              options={TABS}
              value={tab}
              onChange={setTab}
              label="Which shipments to show"
            />
          }
        >
          <ShipmentList rows={rows.filter(TAB_ROWS[tab])} onOpen={open} meta="due" />
        </Panel>
      )}
    </div>
  );
}
