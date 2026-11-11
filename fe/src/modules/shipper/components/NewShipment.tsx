"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Plus,
  UserPlus,
  Warehouse,
} from "@phosphor-icons/react";
import { formatUsdc } from "@waybil/shared";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { DemoMap } from "@/components/elements/DemoMap";
import { KeyValue } from "@/components/elements/KeyValue";
import { CreditMeter } from "@/components/elements/CreditMeter";
import { Avatar } from "@/components/elements/Avatar";
import { ArrowUpRightGlyph } from "@/components/elements/icons";
import { GateMap } from "@/components/elements/GateMap";
import { cn } from "@/lib/cn";
import { draftNumbers, DEMO_TODAY, type ShipmentDraft } from "../data/form";
import type { ShipperState } from "../data/fixtures";

/*
 * The draft is kept for this tab, so "Invite a new driver" and "See your credit" can leave
 * the form and come back to it. It is cleared once the shipment is approved.
 */
const DRAFT_KEY = "waybil-shipper-draft-v1";
const DRAFT_FIELDS = ["driver", "destination", "cargo", "fee", "due"] as const;
function readDraft(): ShipmentDraft | undefined {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
    if (!value || typeof value !== "object") return undefined;
    const draft = value as Record<string, unknown>;
    return DRAFT_FIELDS.every((key) => typeof draft[key] === "string")
      ? (draft as unknown as ShipmentDraft)
      : undefined;
  } catch {
    return undefined;
  }
}
function saveDraft(draft: ShipmentDraft | undefined) {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* Without storage the draft only lives on this screen. */
  }
}

const DRIVERS = [
  /* The board draws Sam's avatar as "SC", so the avatar gets the full name. */
  { name: "Sam", full: "Sam Carter", plate: "NWF-204", trips: 12 },
  { name: "Jordan Lee", full: "Jordan Lee", plate: "JLE-118", trips: 4 },
  { name: "Chris Novak", full: "Chris Novak", plate: "", trips: 0 },
];
const PLACES = [
  {
    name: "Harbor Hub",
    street: "9 Pier Street",
    address: "9 Pier Street, Harbor City",
    meta: "Lena receives here · 8 trips",
    linked: true,
  },
  {
    name: "Riverton branch",
    street: "40 River Road",
    address: "40 River Road, Riverton",
    meta: "Receiver not linked yet",
    linked: false,
  },
  {
    name: "Millbrook depot",
    street: "12 Mill Lane",
    address: "12 Mill Lane, Millbrook",
    meta: "Chris receives here · 3 trips",
    linked: true,
  },
];

/* The board writes the chosen date and how far off it is: "Dec 11, 2026 · in 29 days". */
function dueLabel(due: string) {
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(due));
  const days = Math.round((Date.parse(due) - Date.parse(DEMO_TODAY)) / 86400000);
  return `${date} · in ${days} days`;
}

function FieldButton({
  label,
  value,
  hint,
  onClick,
  children,
  disabled = false,
  /** Nothing picked yet, so the board writes the prompt in grey. */
  empty = false,
  /** The list under it is open, so the board lifts the field to white with an ink border. */
  open = false,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
  empty?: boolean;
  open?: boolean;
}) {
  const field = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!field.current?.contains(event.target as Node)) onClick?.();
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open, onClick]);
  return (
    <div
      ref={field}
      data-field
      className="relative flex min-w-0 flex-col gap-8"
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.stopPropagation();
          onClick?.();
          field.current?.querySelector("button")?.focus();
        }
      }}
    >
      <span id={`${id}-label`} className="text-label">
        {label}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        /* Read as the label and the chosen value, for example "Driver, Sam · NWF-204". */
        aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        aria-expanded={onClick ? open : undefined}
        className={cn(
          "tap focus-ring flex h-52 w-full items-center justify-between gap-10 rounded-[16px] border-[1.5px] px-16 text-left text-[16px]",
          open
            ? "border-ds-ink bg-ds-bg"
            : "border-ds-canvas bg-ds-canvas hover:border-ds-canvas-hover hover:bg-ds-canvas-hover",
        )}
      >
        <span id={`${id}-value`} className={cn("min-w-0 truncate", empty && "text-ds-muted")}>
          {value}
        </span>
        <svg
          aria-hidden
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-ds-muted"
        >
          <path d="m7 9 5-5 5 5M7 15l5 5 5-5" />
        </svg>
      </button>
      {hint && (
        <p id={`${id}-hint`} className="text-caption text-ds-muted">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

/** The search line the board draws at the top of the driver and destination lists. */
function SearchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <label className="flex h-38 shrink-0 items-center gap-10 px-10">
        <MagnifyingGlass size={16} className="shrink-0 text-ds-muted" />
        <span className="sr-only">{label}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          className="min-w-0 flex-1 bg-transparent text-[14.5px] text-ds-ink outline-none placeholder:text-ds-muted focus-visible:outline-none"
        />
      </label>
      <span aria-hidden className="h-1 shrink-0 bg-ds-line" />
    </>
  );
}

/* The calendar shows November 2026 to January 2027. Today and anything past 60 days is off. */
const DUE_FROM = "2026-11-01";
const DUE_TO = "2027-01-31";
const DAY_MS = 86400000;
const addDays = (date: string, n: number) =>
  new Date(Date.parse(date) + n * DAY_MS).toISOString().slice(0, 10);
const dueBlocked = (date: string) => {
  const distance = (Date.parse(date) - Date.parse(DEMO_TODAY)) / DAY_MS;
  return distance <= 0 || distance > 60;
};
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SPOKEN_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/*
 * The P2.4 month grid, built as an ARIA grid. Only one day is in the tab order. The arrows
 * move by a day or a week, Home and End go to the start and end of the week, Page Up and
 * Page Down change the month, and Enter or Space picks the day. Days that can't be picked
 * stay reachable but say they are unavailable. Moving between days never animates.
 */
function DueGrid({
  month,
  due,
  labelledBy,
  onMonth,
  onPick,
}: {
  month: string;
  due: string;
  labelledBy: string;
  onMonth: (month: string) => void;
  onPick: (date: string, from: HTMLElement) => void;
}) {
  const [year, monthIndex] = month.split("-").map(Number) as [number, number];
  const first = (new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const dates = Array.from(
    { length: days },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
  const [focused, setFocused] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  /* Set by a key press, so the day that becomes tabbable also takes focus once drawn. */
  const moved = useRef(false);
  const inMonth = (date: string | null): date is string => !!date && date.startsWith(month);
  const tabbable =
    (inMonth(focused) && focused) ||
    (inMonth(due) && due) ||
    dates.find((date) => !dueBlocked(date)) ||
    dates[0]!;
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    grid.current?.querySelector<HTMLElement>(`[data-date="${tabbable}"]`)?.focus();
  });
  const moveTo = (date: string) => {
    const next = date < DUE_FROM ? DUE_FROM : date > DUE_TO ? DUE_TO : date;
    moved.current = true;
    setFocused(next);
    if (!next.startsWith(month)) onMonth(next.slice(0, 7));
  };
  /* The same day in another month, or that month's last day when it is shorter. */
  const shiftMonth = (date: string, delta: number) => {
    const [y, m, d] = date.split("-").map(Number) as [number, number, number];
    const last = new Date(Date.UTC(y, m + delta, 0)).getUTCDate();
    return new Date(Date.UTC(y, m - 1 + delta, Math.min(d, last))).toISOString().slice(0, 10);
  };
  const cells: (string | null)[] = [...Array<null>(first).fill(null), ...dates];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  return (
    <div ref={grid} role="grid" aria-labelledby={labelledBy} className="flex flex-col gap-y-2">
      <div role="row" className="grid grid-cols-7 gap-x-4">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day, i) => (
          <span
            key={day}
            role="columnheader"
            aria-label={WEEKDAYS[i]}
            className="py-6 text-center text-[11.5px] text-ds-muted"
          >
            {day}
          </span>
        ))}
      </div>
      {weeks.map((week, w) => (
        <div key={w} role="row" className="grid grid-cols-7 gap-x-4">
          {week.map((date, i) => {
            if (!date) return <span key={`blank${i}`} role="gridcell" />;
            const blocked = dueBlocked(date);
            const weekday = (new Date(date).getUTCDay() + 6) % 7;
            return (
              <div
                key={date}
                role="gridcell"
                data-date={date}
                tabIndex={date === tabbable ? 0 : -1}
                aria-selected={due === date}
                aria-disabled={blocked || undefined}
                aria-label={`${SPOKEN_DATE.format(new Date(date))}${blocked ? ", not available" : ""}`}
                className={cn(
                  /* The hit area reaches 40 px tall without making the day bigger. */
                  "focus-ring grid h-34 place-items-center rounded-[10px] text-label font-normal before:absolute before:inset-x-0 before:-inset-y-3",
                  blocked ? "opacity-25" : "tap",
                  due === date ? "bg-ds-brand font-semibold" : !blocked && "hover:bg-ds-canvas",
                )}
                onClick={(event) => {
                  if (!blocked) onPick(date, event.currentTarget);
                }}
                onKeyDown={(event) => {
                  const key = event.key;
                  if (key === "ArrowLeft") moveTo(addDays(date, -1));
                  else if (key === "ArrowRight") moveTo(addDays(date, 1));
                  else if (key === "ArrowUp") moveTo(addDays(date, -7));
                  else if (key === "ArrowDown") moveTo(addDays(date, 7));
                  else if (key === "Home") moveTo(addDays(date, -weekday));
                  else if (key === "End") moveTo(addDays(date, 6 - weekday));
                  else if (key === "PageUp") moveTo(shiftMonth(date, -1));
                  else if (key === "PageDown") moveTo(shiftMonth(date, 1));
                  else if (key === "Enter" || key === " ") {
                    if (!blocked) onPick(date, event.currentTarget);
                  } else return;
                  event.preventDefault();
                }}
              >
                {Number(date.slice(8))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function NewShipment({
  state,
  go,
  onApproved,
  usedBefore = 2400000000n,
  persist = false,
}: {
  state: ShipperState;
  go: (s: ShipperState) => void;
  onApproved: (draft: ShipmentDraft) => void;
  usedBefore?: bigint;
  /** Keep the draft in this tab. Only on real routes, after the screen has mounted. */
  persist?: boolean;
}) {
  const filled = ["P2.4", "P2.5", "P2.6", "P2.7"].includes(state);
  const [draft, setDraft] = useState<ShipmentDraft>(
    () =>
      (persist && readDraft()) || {
        driver: filled || state === "P2.3" ? "Sam" : "",
        destination: filled ? "Harbor Hub" : "",
        cargo: filled ? "120 crates of coffee" : "",
        fee: filled ? (state === "P2.6" ? "1200.00" : "300.00") : "",
        due: filled ? "2026-12-11" : "",
      },
  );
  /* A field says what is wrong once the person has left it. */
  const [touched, setTouched] = useState({ cargo: false, fee: false });
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("2026-12");
  const [newPlace, setNewPlace] = useState(false);
  const [pendingPlace, setPendingPlace] = useState("");
  const [error, setError] = useState("");
  const [placeName, setPlaceName] = useState("Harbor Hub");
  const [placeAddress, setPlaceAddress] = useState("9 Pier Street, Harbor City");
  const [receiver, setReceiver] = useState("lena@harborhub.com");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const numbers = draftNumbers(draft, usedBefore);
  const update = (key: keyof ShipmentDraft, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (persist) saveDraft(next);
  };
  const choose = (key: keyof ShipmentDraft, value: string) => {
    update(key, value);
    setSearch("");
    go("P2.1");
  };
  const [year, monthIndex] = month.split("-").map(Number) as [number, number];
  const dueId = useId();
  /* Picking a date closes the calendar, so focus goes back to the Due date field. */
  const pickDue = (date: string, from: HTMLElement) => {
    const field = from.closest("[data-field]")?.querySelector<HTMLElement>("button");
    choose("due", date);
    field?.focus();
  };
  const popup =
    "absolute top-82 right-0 left-0 z-20 flex max-h-420 flex-col gap-4 overflow-y-auto rounded-[18px] border border-ds-line bg-ds-bg p-6 shadow-lg";
  const disabled = !numbers.valid || numbers.over;
  const approve = (
    <Button
      disabled={disabled}
      loading={state === "P2.7"}
      loadingLabel="Waiting for wallet"
      className={cn(
        "h-52 w-full justify-between",
        disabled &&
          "disabled:text-ds-muted [&>span:last-child]:bg-ds-line-strong [&>span:last-child]:text-ds-bg",
      )}
      icon={<ArrowUpRightGlyph size={17} />}
      onClick={() => {
        go("P2.7");
        timer.current = setTimeout(() => {
          try {
            onApproved(draft);
            if (persist) saveDraft(undefined);
          } catch {
            go("P2.5");
            setError("The demo shipment was not saved. Please try again.");
          }
        }, 600);
      }}
    >
      Approve shipment
    </Button>
  );
  /* While the wallet is open the note says what to do there (P2.7). */
  const footnote =
    state === "P2.7"
      ? "Approve the request in your wallet."
      : "Once approved, the fee and due date can’t be changed.";
  /* The board darkens that note while the wallet waits, because it is now an instruction. */
  const noteTone = state === "P2.7" ? "text-ds-ink" : "text-ds-muted";
  const changeMonth = (delta: number) => {
    const d = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  };

  return (
    <>
      {/* The board sets this title tighter than the shared type styles: 30/32 and 40/42. */}
      <h1 className="text-title text-[30px] leading-[32px] md:text-amount md:text-[40px] md:leading-[42px]">
        New shipment
      </h1>
      {error && (
        <p role="alert" className="mt-12 text-label text-ds-danger">
          {error}
        </p>
      )}
      <p className="mt-16 mb-16 text-[14px] leading-[1.45] text-ds-muted md:mt-24 md:mb-24 md:text-[15px]">
        You approve the fee and due date now. The driver can&apos;t be paid until the goods arrive.
      </p>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-16 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel
          className={cn(
            "gap-20 p-20 md:p-28",
            state === "P2.3" && "pb-110 md:pb-130",
            state === "P2.4" && "pb-380 md:pb-28",
          )}
        >
          <FieldButton
            disabled={state === "P2.7"}
            label="Driver"
            open={state === "P2.2"}
            empty={!draft.driver}
            value={
              draft.driver
                ? `${draft.driver} · ${DRIVERS.find((d) => d.name === draft.driver)?.plate ?? ""}`
                : "Choose a driver"
            }
            hint="Only drivers in your network"
            onClick={() => {
              setSearch("");
              go(state === "P2.2" ? "P2.1" : "P2.2");
            }}
          >
            {state === "P2.2" && (
              <div className={popup}>
                <SearchRow label="Search name or plate" value={search} onChange={setSearch} />
                {DRIVERS.filter((d) =>
                  `${d.name} ${d.plate}`.toLowerCase().includes(search.toLowerCase()),
                ).map((d) => (
                  <button
                    type="button"
                    disabled={!d.plate}
                    key={d.name}
                    onClick={() => choose("driver", d.name)}
                    className={cn(
                      "tap focus-ring flex items-center gap-12 rounded-[12px] p-10 text-left hover:bg-ds-canvas disabled:opacity-50",
                      (draft.driver === d.name || (!draft.driver && d.name === DRIVERS[0].name)) &&
                        "bg-ds-canvas",
                    )}
                  >
                    <Avatar name={d.full} />
                    <span className="flex min-w-0 flex-col gap-2">
                      <span className="truncate text-[15px] font-medium">{d.name}</span>
                      <span className="truncate text-[12.5px] text-ds-muted">
                        {d.plate
                          ? `${d.plate} · ${d.trips} trips with you`
                          : "Invite sent, not joined yet"}
                      </span>
                    </span>
                  </button>
                ))}
                <span aria-hidden className="h-1 shrink-0 bg-ds-line" />
                <button
                  className="link focus-ring flex items-center gap-10 px-10 py-12 text-[14px] font-medium"
                  onClick={() => go("P5.3")}
                >
                  <UserPlus size={16} />
                  Invite a new driver
                </button>
              </div>
            )}
          </FieldButton>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-20 md:grid-cols-2 md:gap-16">
            <FieldButton label="Pickup" value="Main warehouse · 21 Dock Road" disabled />
            <FieldButton
              disabled={state === "P2.7"}
              label="Destination"
              open={state === "P2.3"}
              empty={!draft.destination}
              value={
                draft.destination
                  ? `${draft.destination} · ${PLACES.find((p) => p.name === draft.destination)?.street ?? ""}`
                  : "Choose a destination"
              }
              onClick={() => {
                setSearch("");
                go(state === "P2.3" ? "P2.1" : "P2.3");
              }}
            >
              {state === "P2.3" && (
                <div className={popup}>
                  <SearchRow label="Search places" value={search} onChange={setSearch} />
                  {PLACES.filter((p) =>
                    `${p.name} ${p.address}`.toLowerCase().includes(search.toLowerCase()),
                  ).map((p) => (
                    <button
                      key={p.name}
                      disabled={!p.linked}
                      className={cn(
                        "tap focus-ring flex items-center gap-12 rounded-[12px] p-10 text-left hover:bg-ds-canvas",
                        (draft.destination === p.name ||
                          (!draft.destination && p.name === PLACES[0].name)) &&
                          "bg-ds-canvas",
                      )}
                      onClick={() => choose("destination", p.name)}
                    >
                      <span className="grid size-36 shrink-0 place-items-center rounded-[10px] bg-ds-canvas">
                        <Warehouse size={16} />
                      </span>
                      <span className="flex min-w-0 flex-col gap-2">
                        <span className="truncate text-[14.5px] font-medium">{p.name}</span>
                        <span className="truncate text-[12.5px] text-ds-ink-2">{p.address}</span>
                        <span
                          className={cn(
                            "truncate text-caption",
                            p.linked ? "text-ds-muted" : "text-ds-warning",
                          )}
                        >
                          {p.meta}
                        </span>
                      </span>
                    </button>
                  ))}
                  <span aria-hidden className="h-1 shrink-0 bg-ds-line" />
                  <button
                    className="link focus-ring flex items-center gap-10 px-10 py-12 text-[14px] font-medium"
                    onClick={() => setNewPlace(true)}
                  >
                    <Plus size={16} />
                    Add a new place
                  </button>
                  {pendingPlace && (
                    <p className="rounded-[12px] bg-ds-canvas p-12 text-caption text-ds-muted">
                      {pendingPlace} is waiting for the receiver to join.
                    </p>
                  )}
                </div>
              )}
            </FieldButton>
          </div>
          <Input
            disabled={state === "P2.7"}
            label="Cargo"
            placeholder="e.g. 120 crates of coffee"
            value={draft.cargo}
            onChange={(e) => update("cargo", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, cargo: true }))}
            error={
              touched.cargo && numbers.cargoError
                ? "Start with a number, like 120 crates."
                : undefined
            }
          />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-20 md:grid-cols-2 md:gap-16">
            <Input
              disabled={state === "P2.7"}
              label="Shipping fee"
              inputMode="decimal"
              placeholder="0.00"
              suffix="USDC"
              value={draft.fee}
              onChange={(e) => update("fee", e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, fee: true }))}
              hint="What you pay the driver for this trip"
              error={
                touched.fee && numbers.feeError
                  ? "Enter an amount like 300.00."
                  : numbers.over
                    ? `That’s ${formatUsdc(-numbers.left)} USDC over your limit. Pay a bill early or lower the fee.`
                    : undefined
              }
            />
            <FieldButton
              disabled={state === "P2.7"}
              label="Due date"
              open={state === "P2.4"}
              empty={!draft.due}
              value={draft.due ? dueLabel(draft.due) : "Pick a date"}
              hint="When you pay the bill"
              onClick={() => go(state === "P2.4" ? "P2.1" : "P2.4")}
            >
              {state === "P2.4" && (
                <div className={cn(popup, "gap-14 p-16")}>
                  <div className="flex gap-8">
                    {[30, 45, 60].map((days) => (
                      <button
                        key={days}
                        className="tap focus-ring h-32 flex-1 rounded-full bg-ds-canvas text-label before:absolute before:inset-x-0 before:-inset-y-4 hover:bg-ds-canvas-hover"
                        onClick={(event) =>
                          pickDue(
                            new Date(Date.parse(DEMO_TODAY) + days * 86400000)
                              .toISOString()
                              .slice(0, 10),
                            event.currentTarget,
                          )
                        }
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                  {/* The board hangs the two arrows on the card's padding edge, so the
                      tap target's own padding is pulled back out. */}
                  <div className="-mx-11 -my-11 flex items-center justify-between">
                    <button
                      aria-label="Previous month"
                      className="press focus-ring rounded-small p-8 text-ds-ink disabled:text-ds-muted"
                      disabled={month <= "2026-11"}
                      onClick={() => changeMonth(-1)}
                    >
                      <CaretLeft size={18} />
                    </button>
                    <span id={`${dueId}-month`} className="text-[14px] font-medium">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(new Date(`${month}-01`))}
                    </span>
                    <button
                      aria-label="Next month"
                      className="press focus-ring rounded-small p-8 text-ds-ink disabled:text-ds-muted"
                      disabled={month >= "2027-01"}
                      onClick={() => changeMonth(1)}
                    >
                      <CaretRight size={18} />
                    </button>
                  </div>
                  <DueGrid
                    month={month}
                    due={draft.due}
                    labelledBy={`${dueId}-month`}
                    onMonth={setMonth}
                    onPick={(date, from) => pickDue(date, from)}
                  />
                  <p className="text-caption text-ds-muted">
                    Paying later than 60 days needs a talk with us.
                  </p>
                </div>
              )}
            </FieldButton>
          </div>
        </Panel>
        <Panel title="Summary" titleClassName="text-[18px] leading-[1.3]">
          {draft.destination ? (
            <DemoMap
              phase="planned"
              label={null}
              zoom={1.435}
              destination={draft.destination}
              className="h-260 rounded-[16px]"
            />
          ) : (
            /* The board draws the waiting summary as a grey box with the route mark centred. */
            <div className="flex flex-col items-center gap-6 rounded-[18px] bg-ds-canvas px-16 py-28 text-center">
              <svg
                aria-hidden
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ds-muted"
              >
                <circle cx="6" cy="17" r="3" />
                <path d="M9 17h8a3 3 0 0 0 0-6H7a3.5 3.5 0 0 1 0-7h8" />
                <circle cx="18" cy="4" r="3" />
              </svg>
              <p className="text-[13.5px] leading-[1.45] text-ds-muted">
                Fill in the trip to see the numbers
              </p>
            </div>
          )}
          <div className="divide-y divide-ds-line">
            <KeyValue
              label="Shipping fee"
              value={numbers.bill > 0n ? <Money amount={numbers.bill.toString()} /> : "-"}
            />
            <KeyValue
              label="Driver gets on arrival"
              value={numbers.bill > 0n ? <Money amount={numbers.advance.toString()} /> : "-"}
            />
            <KeyValue
              label={
                draft.due
                  ? `You pay by ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(draft.due))}`
                  : "You pay by the due date"
              }
              /* The board draws the amount you owe heavier than the two facts above it. */
              value={
                numbers.bill > 0n ? (
                  <span className="font-semibold">
                    <Money amount={numbers.bill.toString()} />
                  </span>
                ) : (
                  "-"
                )
              }
            />
          </div>
          <CreditMeter
            className="w-full p-0 [&>div:last-child]:flex-wrap [&>div:last-child]:gap-x-12 [&>div:last-child]:gap-y-6"
            rulerTone="ink"
            label="Your limit after this trip"
            used={formatUsdc(numbers.used)}
            limit="3,000.00"
            value={Number(numbers.used) / 3000000000}
            left={formatUsdc(numbers.left < 0n ? -numbers.left : numbers.left)}
          />
          {numbers.over && (
            <button
              className="link-ink focus-ring flex items-center gap-4 text-left text-label font-semibold"
              onClick={() => go("P7.1")}
            >
              See your credit
              <ArrowRight size={14} />
            </button>
          )}
          <div className="hidden md:block">{approve}</div>
          <p className={cn("hidden text-[12.5px] leading-[1.45] md:block", noteTone)}>{footnote}</p>
        </Panel>
      </div>
      <div className="mt-16 md:hidden">
        {approve}
        <p className={cn("mt-14 text-center text-[12.5px] leading-[1.45]", noteTone)}>{footnote}</p>
      </div>
      {newPlace && (
        <ActionSheet title="Add a destination" onClose={() => setNewPlace(false)}>
          <Input label="Name" value={placeName} onChange={(e) => setPlaceName(e.target.value)} />
          <Input
            label="Address"
            value={placeAddress}
            onChange={(e) => setPlaceAddress(e.target.value)}
          />
          <GateMap />
          <Input
            label="Receiver's work email"
            type="email"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
          />
          <Button
            disabled={!placeName.trim() || !placeAddress.trim() || !/^\S+@\S+\.\S+$/.test(receiver)}
            onClick={() => {
              setPendingPlace(placeName);
              go("P2.3");
              setNewPlace(false);
            }}
          >
            Add and send invite
          </Button>
        </ActionSheet>
      )}
    </>
  );
}
