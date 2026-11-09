"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CaretUpDown,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Path,
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
import { GateMap } from "@/components/elements/GateMap";
import { cn } from "@/lib/cn";
import { draftNumbers, DEMO_TODAY, type ShipmentDraft } from "../data/form";
import type { ShipperState } from "../data/fixtures";

/** The board writes whole USDC in the summary and in the limit line. */
const plain = (amount: string) => amount.replace(/\.00$/, "");

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
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative flex min-w-0 flex-col gap-8">
      <span className="text-label">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={label}
        className="press focus-ring flex h-52 w-full items-center justify-between gap-12 rounded-[16px] bg-ds-canvas px-18 text-left text-body"
      >
        <span className="truncate">{value}</span>
        <CaretUpDown size={16} className="shrink-0 text-ds-muted" />
      </button>
      {hint && <p className="text-caption text-ds-muted">{hint}</p>}
      {children}
    </div>
  );
}

export function NewShipment({
  state,
  go,
  onApproved,
  usedBefore = 2400000000n,
}: {
  state: ShipperState;
  go: (s: ShipperState) => void;
  onApproved: (draft: ShipmentDraft) => void;
  usedBefore?: bigint;
}) {
  const filled = ["P2.4", "P2.5", "P2.6", "P2.7"].includes(state);
  const [draft, setDraft] = useState<ShipmentDraft>({
    driver: filled || state === "P2.3" ? "Sam" : "",
    destination: filled ? "Harbor Hub" : "",
    cargo: filled ? "120 crates of coffee" : "",
    fee: filled ? (state === "P2.6" ? "1200.00" : "300.00") : "",
    due: filled ? "2026-12-11" : "",
  });
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
  const update = (key: keyof ShipmentDraft, value: string) => setDraft({ ...draft, [key]: value });
  const choose = (key: keyof ShipmentDraft, value: string) => {
    update(key, value);
    setSearch("");
    go("P2.1");
  };
  const [year, monthIndex] = month.split("-").map(Number) as [number, number];
  const first = (new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const popup =
    "absolute top-80 right-0 left-0 z-20 flex max-h-420 flex-col gap-8 overflow-y-auto rounded-row border border-ds-line bg-ds-bg p-12 shadow-lg";
  const disabled = !numbers.valid || numbers.over || state === "P2.7";
  const approve = (
    <Button
      disabled={disabled}
      loading={state === "P2.7"}
      loadingLabel="Waiting for wallet"
      className="w-full justify-between"
      onClick={() => {
        go("P2.7");
        timer.current = setTimeout(() => {
          try {
            onApproved(draft);
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
  const changeMonth = (delta: number) => {
    const d = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  };

  return (
    <>
      <h1 className="text-title md:text-amount">New shipment</h1>
      {error && (
        <p role="alert" className="mt-12 text-label text-ds-danger">
          {error}
        </p>
      )}
      <p className="mt-16 mb-24 text-body text-ds-muted">
        You approve the fee and due date now. The driver can&apos;t be paid until the goods arrive.
      </p>
      <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Panel className="gap-24 p-24 md:p-28">
          <FieldButton
            disabled={state === "P2.7"}
            label="Driver"
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
                <Input
                  prefix={<MagnifyingGlass size={16} className="shrink-0 text-ds-muted" />}
                  label="Search name or plate"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {DRIVERS.filter((d) =>
                  `${d.name} ${d.plate}`.toLowerCase().includes(search.toLowerCase()),
                ).map((d) => (
                  <button
                    type="button"
                    disabled={!d.plate}
                    key={d.name}
                    onClick={() => choose("driver", d.name)}
                    className="press focus-ring flex gap-12 rounded-small p-10 text-left hover:bg-ds-canvas disabled:opacity-40"
                  >
                    <Avatar name={d.full} />
                    <span>
                      <span className="block text-label">{d.name}</span>
                      <span className="block text-caption text-ds-muted">
                        {d.plate
                          ? `${d.plate} · ${d.trips} trips with you`
                          : "Invite sent, not joined yet"}
                      </span>
                    </span>
                  </button>
                ))}
                <button
                  className="link-ink focus-ring flex items-center gap-8 p-10 text-label"
                  onClick={() => go("P5.3")}
                >
                  <UserPlus size={16} />
                  Invite a new driver
                </button>
              </div>
            )}
          </FieldButton>
          <div className="grid gap-24 md:grid-cols-2">
            <FieldButton label="Pickup" value="Main warehouse · 21 Dock Road" disabled />
            <FieldButton
              disabled={state === "P2.7"}
              label="Destination"
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
                  <Input
                    prefix={<MagnifyingGlass size={16} className="shrink-0 text-ds-muted" />}
                    label="Search places"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {PLACES.filter((p) =>
                    `${p.name} ${p.address}`.toLowerCase().includes(search.toLowerCase()),
                  ).map((p) => (
                    <button
                      key={p.name}
                      disabled={!p.linked}
                      className="press focus-ring rounded-small p-12 text-left hover:bg-ds-canvas disabled:opacity-40"
                      onClick={() => choose("destination", p.name)}
                    >
                      <Warehouse size={18} className="mb-6 text-ds-muted" />
                      <span className="block text-body">{p.name}</span>
                      <span className="block text-caption text-ds-muted">{p.address}</span>
                      <span className="block text-caption text-ds-muted">{p.meta}</span>
                    </button>
                  ))}
                  <button
                    className="link-ink focus-ring flex items-center gap-8 p-10 text-label"
                    onClick={() => setNewPlace(true)}
                  >
                    <Plus size={16} />
                    Add a new place
                  </button>
                  {pendingPlace && (
                    <p className="rounded-small bg-ds-canvas p-12 text-caption text-ds-muted">
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
            hint="Can't be changed after you approve."
            value={draft.cargo}
            onChange={(e) => update("cargo", e.target.value)}
          />
          <div className="grid gap-24 md:grid-cols-2">
            <Input
              disabled={state === "P2.7"}
              label="Shipping fee"
              inputMode="decimal"
              placeholder="0.00"
              suffix="USDC"
              value={draft.fee}
              onChange={(e) => update("fee", e.target.value)}
              hint="What you pay the driver for this trip"
              error={
                numbers.over
                  ? `That’s ${plain(formatUsdc(-numbers.left))} USDC over your limit. Pay a bill early or lower the fee.`
                  : undefined
              }
            />
            <FieldButton
              disabled={state === "P2.7"}
              label="Due date"
              value={draft.due ? dueLabel(draft.due) : "Pick a date"}
              hint="When you pay the bill"
              onClick={() => go(state === "P2.4" ? "P2.1" : "P2.4")}
            >
              {state === "P2.4" && (
                <div className={popup}>
                  <div className="flex gap-6">
                    {[30, 45, 60].map((days) => (
                      <button
                        key={days}
                        className="press focus-ring flex-1 rounded-full bg-ds-canvas py-8 text-caption"
                        onClick={() =>
                          choose(
                            "due",
                            new Date(Date.parse(DEMO_TODAY) + days * 86400000)
                              .toISOString()
                              .slice(0, 10),
                          )
                        }
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      aria-label="Previous month"
                      className="focus-ring rounded-small p-8"
                      disabled={month <= "2026-11"}
                      onClick={() => changeMonth(-1)}
                    >
                      <CaretLeft size={16} />
                    </button>
                    <span className="text-label">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(new Date(`${month}-01`))}
                    </span>
                    <button
                      aria-label="Next month"
                      className="focus-ring rounded-small p-8"
                      disabled={month >= "2027-01"}
                      onClick={() => changeMonth(1)}
                    >
                      <CaretRight size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-4">
                    {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                      <span key={day} className="py-6 text-center text-caption text-ds-muted">
                        {day}
                      </span>
                    ))}
                    {Array.from({ length: first }, (_, i) => (
                      <span key={`blank${i}`} />
                    ))}
                    {Array.from({ length: days }, (_, i) => {
                      const date = `${month}-${String(i + 1).padStart(2, "0")}`;
                      const distance = (Date.parse(date) - Date.parse(DEMO_TODAY)) / 86400000;
                      return (
                        <button
                          key={date}
                          aria-label={date}
                          aria-pressed={draft.due === date}
                          disabled={distance <= 0 || distance > 60}
                          className={cn(
                            "press focus-ring grid h-34 place-items-center rounded-[10px] text-label font-normal disabled:opacity-25",
                            draft.due === date ? "bg-ds-brand" : "hover:bg-ds-canvas",
                          )}
                          onClick={() => choose("due", date)}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-caption text-ds-muted">
                    Paying later than 60 days needs a talk with us.
                  </p>
                </div>
              )}
            </FieldButton>
          </div>
        </Panel>
        <Panel title="Summary">
          <div>
            {draft.destination ? (
              <DemoMap phase="planned" label="Planned route" className="mb-16 h-260" />
            ) : (
              <div className="mb-20 flex flex-col gap-10">
                <Path size={20} className="text-ds-muted" />
                <p className="text-[13.5px] text-ds-muted">Fill in the trip to see the numbers.</p>
              </div>
            )}
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
              value={numbers.bill > 0n ? <Money amount={numbers.bill.toString()} /> : "-"}
            />
          </div>
          <CreditMeter
            className="w-full p-0"
            label="Your limit after this trip"
            used={plain(formatUsdc(numbers.used))}
            limit="3,000"
            value={Number(numbers.used) / 3000000000}
            left={plain(formatUsdc(numbers.left < 0n ? -numbers.left : numbers.left))}
          />
          {numbers.over && (
            <button
              className="link focus-ring flex items-center gap-8 text-left text-label"
              onClick={() => go("P7.1")}
            >
              See your credit
              <ArrowRight size={16} />
            </button>
          )}
          <div className="hidden md:block">{approve}</div>
          <p className="hidden text-caption text-ds-muted md:block">{footnote}</p>
        </Panel>
      </div>
      <div className="mt-16 md:hidden">
        {approve}
        <p className="mt-12 text-center text-caption text-ds-muted">{footnote}</p>
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
