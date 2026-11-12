"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  billForDriverAmount,
  driverAmountForGoodUnits,
  formatUsdc,
  parseUsdc,
  type Shipment,
  type Trip,
  type TripCreate,
  type ReportDetail,
} from "@waybil/shared";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Money } from "@/components/elements/Money";
import { StatusPill } from "@/components/elements/StatusPill";
import { TripMap } from "@/components/elements/TripMap";
import { TimelineStep } from "@/components/elements/TimelineStep";
import { duration, remaining, truckNow } from "@/lib/route";
import { Skeleton } from "@/components/elements/Skeleton";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import { useClock, usePlaces, useTrips } from "@/hooks/useTrips";
import { forgetPickup, pickupFor } from "../data/pendingTrip";
import { SearchPicker } from "@/components/ui/SearchPicker";
import { api } from "@/lib/api";
import { CONTRACT_RECORD_URL, USDC_CONTRACT, WAYBIL_CONTRACT } from "@/lib/env";
import { statusChip } from "@/lib/status";
import { callContract } from "@/lib/wallet";
import { Alert, DoneNote, failure, type Done } from "./live/shared";
import { names, repayMessage, shortDay, toRow, type LiveShipperData } from "../data/live";

const REASONS: Record<string, string> = {
  damaged: "Damaged",
  missing: "Missing",
  wrong_goods: "Wrong goods",
  other: "Other",
};

/* P3 and P4 for one shipment, with the actions its status allows. */
export function LiveShipment({
  data,
  id,
  refresh,
}: {
  data: LiveShipperData;
  id: number;
  refresh: () => void;
}) {
  const created = useSearchParams().get("tx");
  const s = data.shipments.find((x) => x.id === id);
  const { trips, data: tripData, reload: reloadTrips } = useTrips(s ? [s.id] : []);
  const [done, setDone] = useState<Done>(
    created ? { text: "The shipment is approved. The driver can pick it up.", tx: created } : null,
  );
  const [sheet, setSheet] = useState<"cancel" | "pay" | "settle" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (s?.status !== "Reported") return;
    api<ReportDetail>(`/reports/${id}`)
      .then((r) => {
        setReport(r);
        const suggested = driverAmountForGoodUnits(BigInt(s.bill), r.goodQty, s.qty);
        setAmount(String(Number(suggested) / 1000000));
      })
      .catch(() => setReport(null));
  }, [id, s?.status, s?.bill, s?.qty]);

  if (!s)
    return (
      <Panel className="grid min-h-240 place-content-center text-center">
        <h1 className="text-heading">This shipment could not be found</h1>
        <p className="mt-8 text-label text-ds-muted">It is not one of your shipments.</p>
      </Panel>
    );

  const row = toRow(s, data);
  const { places } = names(data.invites);
  const warehouse = data.network.destinations.find((d) => d.id === s.destination)?.warehouse;
  let driverAmount = 0n;
  try {
    driverAmount = parseUsdc(amount);
  } catch {
    driverAmount = 0n;
  }
  const settleOk = driverAmount > 0n && driverAmount <= BigInt(s.advance);
  const short = BigInt(s.bill) > data.wallet;

  async function send(run: () => Promise<string>, text: string) {
    setBusy(true);
    setError(null);
    try {
      const tx = await run();
      setDone({ text, tx });
      setSheet(null);
      refresh();
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }
  const cancel = () =>
    send(
      () => callContract(WAYBIL_CONTRACT, "cancel_shipment", { id }, { gas: "50000000000000" }),
      "The shipment is cancelled. Its credit is free again.",
    );
  const pay = () =>
    send(
      () =>
        callContract(
          USDC_CONTRACT,
          "ft_transfer_call",
          { receiver_id: WAYBIL_CONTRACT, amount: s.bill, msg: repayMessage(id) },
          { deposit: "1", gas: "100000000000000" },
        ),
      `You paid ${formatUsdc(BigInt(s.bill))} USDC. The credit is free again.`,
    );
  const settle = () =>
    send(
      () =>
        callContract(
          WAYBIL_CONTRACT,
          "settle_report",
          { id, driver_amount: String(driverAmount) },
          { gas: "100000000000000" },
        ),
      `The driver got ${formatUsdc(driverAmount)} USDC. The new bill is ${formatUsdc(billForDriverAmount(driverAmount))} USDC.`,
    );

  const steps = [
    { title: "You approved it", at: s.approved_at },
    { title: `Picked up by ${row.driver}`, at: s.picked_up_at },
    {
      title: `Arrived at ${row.city}`,
      at: s.arrived_at,
      detail: s.good_qty === null ? "" : `${s.good_qty} of ${s.qty} ${s.unit} in good shape`,
    },
    { title: `${row.driver} got paid`, at: s.paid_at },
    { title: "You paid the bill", at: s.repaid_at },
  ];
  /* Every step of the journey, done or still to come. The first one not done is happening now. */
  const firstOpen = steps.findIndex((step) => !step.at);
  const timeline = steps.map((step, i) => ({
    ...step,
    state:
      s.status === "Cancelled" && i === 1
        ? ("failed" as const)
        : s.status === "Reported" && i === 2
          ? ("paused" as const)
          : step.at
            ? ("done" as const)
            : i === firstOpen && s.status !== "Cancelled"
              ? ("current" as const)
              : ("next" as const),
    time:
      s.status === "Cancelled" && i === 1
        ? "Cancelled before pickup."
        : step.at
          ? shortDay(step.at)
          : i === firstOpen
            ? "Happening next."
            : "Still to come.",
  }));
  const trip = trips[0];
  const days = Math.ceil((Number(BigInt(s.due_at) / 1_000_000n) - Date.now()) / 86400000);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-12">
        <div className="min-w-0">
          <h1 className="text-title break-all">
            {trips[0] ? `${trips[0].pickup.name} to ${trips[0].destination.name}` : row.route}
          </h1>
          <p className="mt-6 text-label break-all text-ds-muted">
            Shipment #{s.id}. {row.driver} carries {row.cargo}.
          </p>
        </div>
        <StatusPill status={statusChip(s)} />
      </header>
      <DoneNote done={done} />
      {/* The map on the left. The bill, progress and trip facts stack on the right. */}
      <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-24">
        <div className="flex flex-col gap-10 lg:sticky lg:top-104">
          {!tripData ? (
            /* The map's place is held while the trip loads, so nothing jumps in later. */
            <Skeleton className="h-340 w-full rounded-card lg:h-560" />
          ) : trip ? (
            <>
              <TripMap
                trip={trip}
                status={s.status}
                caption={false}
                className="h-340 rounded-card lg:h-560"
              />
              <RouteNote trip={trip} status={s.status} />
            </>
          ) : s.status === "Approved" || s.status === "PickedUp" ? (
            <AddTrip shipment={s} onAdded={reloadTrips} />
          ) : (
            <div className="grid h-200 place-items-center rounded-card bg-ds-bg p-24 text-center text-label text-ds-muted">
              This shipment was recorded without a map.
            </div>
          )}
        </div>
        <div className="flex flex-col gap-16">
          <BillCard
            status={s.status}
            bill={s.bill}
            due={shortDay(s.due_at)}
            days={days}
            onCancel={() => setSheet("cancel")}
            onPay={() => setSheet("pay")}
            onSettle={report ? () => setSheet("settle") : undefined}
          />
          <Panel title="Progress">
            <div className="flex flex-col gap-16">
              {timeline.map((step) => (
                <div key={step.title}>
                  <TimelineStep state={step.state} title={step.title} time={step.time} />
                  {step.detail && (
                    <p className="mt-4 pl-38 text-caption text-ds-ink-2">{step.detail}</p>
                  )}
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Trip">
            <div className="flex flex-col gap-12">
              <BillRow label="Driver">{row.driver}</BillRow>
              <BillRow label="Cargo">{row.cargo}</BillRow>
              <BillRow label="From">{trip ? trip.pickup.name : "Not set"}</BillRow>
              <BillRow label="To">
                {trip?.destination.name ?? (warehouse && places[warehouse]?.name) ?? "Not set"}
              </BillRow>
              <BillRow label="The driver gets">
                <Money amount={s.advance} />
              </BillRow>
              <BillRow label="Waybil fee">
                <Money amount={String(BigInt(s.bill) - BigInt(s.advance))} />
              </BillRow>
            </div>
            <a
              className="link focus-ring inline-block text-caption"
              href={CONTRACT_RECORD_URL}
              target="_blank"
              rel="noreferrer"
            >
              See the record on NearBlocks ↗
            </a>
          </Panel>
        </div>
      </div>
      {s.status === "Reported" && report && (
        <Panel title="Problem report">
          <p className="text-label">
            {report.goodQty} of {s.qty} {s.unit} arrived in good shape.{" "}
            {report.reasons.map((r) => REASONS[r]).join(", ")}.
          </p>
          {report.note && <p className="text-label text-ds-ink-2">{report.note}</p>}
          <div className="flex flex-wrap gap-10">
            {report.photos.map((p) => (
              <a
                key={p.sha256}
                href={p.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="focus-ring overflow-hidden rounded-small"
              >
                <img
                  src={p.signedUrl}
                  alt="Photo from the warehouse"
                  className="size-96 object-cover"
                />
              </a>
            ))}
          </div>
        </Panel>
      )}
      {sheet === "cancel" && (
        <ActionSheet title="Cancel this shipment?" onClose={() => setSheet(null)}>
          <p className="text-label">
            The driver can’t pick it up anymore, and its credit is free again.
          </p>
          {error && <Alert>{error}</Alert>}
          <Button
            variant="danger"
            loading={busy}
            loadingLabel="Waiting for wallet"
            onClick={() => void cancel()}
          >
            Cancel shipment
          </Button>
        </ActionSheet>
      )}
      {sheet === "pay" && (
        <ActionSheet title="Pay the bill" onClose={() => setSheet(null)}>
          <Money amount={s.bill} className="text-amount" />
          <p className={short ? "text-label text-ds-danger" : "text-label text-ds-muted"}>
            {short
              ? `You have ${formatUsdc(data.wallet)} USDC. Get more before you pay.`
              : `You have ${formatUsdc(data.wallet)} USDC in your wallet.`}
          </p>
          {error && <Alert>{error}</Alert>}
          <Button
            disabled={short}
            loading={busy}
            loadingLabel="Waiting for wallet"
            onClick={() => void pay()}
          >
            Pay {formatUsdc(BigInt(s.bill))} USDC
          </Button>
        </ActionSheet>
      )}
      {sheet === "settle" && report && (
        <ActionSheet title="Settle the report" onClose={() => setSheet(null)}>
          <p className="text-label text-ds-muted">
            {report.goodQty} of {s.qty} {s.unit} arrived in good shape. Pay the driver for those, or
            choose another amount up to {formatUsdc(BigInt(s.advance))} USDC.
          </p>
          <Input
            label="The driver gets"
            suffix="USDC"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={
              amount && !settleOk
                ? `Enter an amount above zero and up to ${formatUsdc(BigInt(s.advance))} USDC.`
                : undefined
            }
          />
          {settleOk && (
            <p className="text-label">
              Your new bill is {formatUsdc(billForDriverAmount(driverAmount))} USDC.
            </p>
          )}
          {error && <Alert>{error}</Alert>}
          <Button
            disabled={!settleOk}
            loading={busy}
            loadingLabel="Waiting for wallet"
            onClick={() => void settle()}
          >
            Pay the driver
          </Button>
        </ActionSheet>
      )}
    </>
  );
}

/*
 * A shipment recorded without its trip (an older one, or one whose trip could not be saved
 * in time) gets its map here once the shipper says where the goods are picked up.
 */
function AddTrip({
  shipment,
  onAdded,
}: {
  shipment: { id: number; driver: string; destination: number };
  onAdded: () => void;
}) {
  const shipmentId = shipment.id;
  const { data } = usePlaces();
  const pickups = (data?.places ?? []).filter((p) => p.kind === "pickup");
  const [pickup, setPickup] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* The pickup chosen when this shipment was approved finishes the trip on its own. */
  const noted = pickupFor(shipment);
  useEffect(() => {
    if (!noted) return;
    api(`/trips/${shipmentId}`, {
      method: "PUT",
      body: { pickupPlaceId: noted } satisfies TripCreate,
    })
      .then(() => {
        forgetPickup();
        onAdded();
      })
      .catch(() => forgetPickup());
  }, [noted, shipmentId, onAdded]);
  if (noted) return null;
  if (data && !pickups.length) return null;
  return (
    <Panel title="Show this trip on the map" className="h-full">
      <p className="text-label text-ds-muted">
        This shipment has no map yet. Choose where the goods are picked up.
      </p>
      <SearchPicker
        label="Pickup from"
        appearance="company"
        placeholder="Choose a pickup point"
        value={pickup}
        options={pickups.map((p) => ({ value: p.id, label: p.name, detail: p.address }))}
        emptyText="Loading your pickup points."
        onChange={setPickup}
      />
      {error && <Alert>{error}</Alert>}
      <Button
        disabled={!pickup}
        loading={busy}
        loadingLabel="Drawing the route"
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await api(`/trips/${shipmentId}`, {
              method: "PUT",
              body: { pickupPlaceId: pickup } satisfies TripCreate,
            });
            onAdded();
          } catch (e) {
            setError(failure(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Show the map
      </Button>
    </Panel>
  );
}

/* One short line under the map: the road, or how much is left while the truck drives. */
function RouteNote({ trip, status }: { trip: Trip; status: Shipment["status"] }) {
  const now = useClock(status === "PickedUp" && !!trip.simulation);
  if (status === "PickedUp") {
    const truck = truckNow(trip, now);
    const left = remaining(trip, truck);
    const at =
      left.minutesLeft == null
        ? null
        : new Date(now + left.minutesLeft * 60000).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          });
    return (
      <div className="flex justify-between gap-12 px-4 text-label">
        <span>{at ? `Arriving around ${at}` : "On the road"}</span>
        <span className="text-ds-muted">{Math.round(left.kmLeft)} km left to go</span>
      </div>
    );
  }
  return (
    <p className="px-4 text-caption text-ds-muted">
      {trip.pickup.name} to {trip.destination.name} is {Math.round(trip.distanceKm)} km by road
      {trip.durationMin != null ? `, about ${duration(trip.durationMin)} of driving` : ""}.
    </p>
  );
}

/*
 * The bill as the card that matters most. Dark with a large amount while it is open, red while
 * a report holds it, and plain once it is paid or the shipment is cancelled. Its one action
 * sits at the bottom.
 */
function BillCard({
  status,
  bill,
  due,
  days,
  onCancel,
  onPay,
  onSettle,
}: {
  status: Shipment["status"];
  bill: string;
  due: string;
  days: number;
  onCancel: () => void;
  onPay: () => void;
  onSettle?: () => void;
}) {
  const amount = `${formatUsdc(BigInt(bill))} USDC`;
  if (status === "Repaid" || status === "Cancelled" || status === "CoveredByReserve")
    return (
      <section className="flex flex-col gap-8 rounded-card bg-ds-bg p-24">
        <Tag className="w-fit">{status === "Cancelled" ? "Cancelled" : "Bill repaid"}</Tag>
        <p className="text-[28px] leading-[1.15] font-semibold">{amount}</p>
        <p className="text-label text-ds-muted">
          {status === "Cancelled"
            ? "Nothing is owed. The credit is free again."
            : "Your payment is complete."}
        </p>
      </section>
    );
  const held = status === "Reported";
  const late = days < 0;
  return (
    <section
      className={cn(
        "flex flex-col gap-8 rounded-card p-24",
        held || late ? "bg-ds-danger-soft text-ds-ink" : "bg-ds-ink text-ds-bg",
      )}
    >
      <span
        className={cn(
          "w-fit rounded-full px-10 py-2 text-[12px] font-semibold",
          held || late ? "bg-ds-danger text-ds-bg" : "bg-ds-brand text-ds-ink",
        )}
      >
        {held ? "Bill on hold" : "Your bill"}
      </span>
      <p className="text-[32px] leading-[1.15] font-semibold">{amount}</p>
      <p className={cn("text-label", held || late ? "text-ds-ink-2" : "text-ds-bg/70")}>
        {held
          ? "Nothing is due while the problem is open."
          : late
            ? `It was due ${due}, ${-days} ${days === -1 ? "day" : "days"} ago.`
            : status === "Paid"
              ? `The driver is paid. Pay by ${due}, in ${days} ${days === 1 ? "day" : "days"}.`
              : `Due ${due}, in ${days} ${days === 1 ? "day" : "days"}. You pay once the driver is paid.`}
      </p>
      {status === "Approved" && (
        <Button variant="secondary" className="mt-8 w-full justify-between" onClick={onCancel}>
          Cancel shipment
        </Button>
      )}
      {status === "Paid" && (
        <Button variant="moment" className="mt-8 w-full justify-between" onClick={onPay}>
          Pay {amount}
        </Button>
      )}
      {held && (
        <Button className="mt-8 w-full justify-between" disabled={!onSettle} onClick={onSettle}>
          Settle the report
        </Button>
      )}
    </section>
  );
}

/* One line of the bill, a label on the left and its value on the right. */
function BillRow({
  label,
  strong = false,
  children,
}: {
  label: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex justify-between gap-12 text-label", strong && "font-semibold")}>
      <span className={strong ? "text-ds-ink" : "text-ds-muted"}>{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
