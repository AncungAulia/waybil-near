"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  billForDriverAmount,
  driverAmountForGoodUnits,
  formatUsdc,
  parseUsdc,
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
import { duration } from "@/lib/route";
import { Skeleton } from "@/components/elements/Skeleton";
import { NameTag } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import { usePlaces, useTrips } from "@/hooks/useTrips";
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
            {row.driver} carries {row.cargo} on #{s.id}.
          </p>
        </div>
        <StatusPill status={statusChip(s)} />
      </header>
      <DoneNote done={done} />
      {/* The route and the bill side by side, the same height. */}
      <div className="grid items-stretch gap-24 lg:grid-cols-[minmax(0,1fr)_400px]">
        {!tripData ? (
          /* The map's place is held while the trip loads, so nothing jumps in later. */
          <Skeleton className="h-320 w-full rounded-card md:h-420" />
        ) : trips[0] ? (
          <Panel title="Route">
            <div className="grid grid-cols-3 gap-12">
              <Fact label="Distance" value={`${Math.round(trips[0].distanceKm)} km`} />
              <Fact
                label="Drive time"
                value={trips[0].durationMin == null ? "Not known" : duration(trips[0].durationMin)}
              />
              <Fact
                label="Truck"
                value={
                  s.status === "Approved"
                    ? "Not left yet"
                    : s.status === "PickedUp"
                      ? "On the road"
                      : s.status === "Cancelled"
                        ? "Cancelled"
                        : "Arrived"
                }
              />
            </div>
            <TripMap trip={trips[0]} status={s.status} caption={false} className="md:h-420" />
          </Panel>
        ) : s.status === "Approved" || s.status === "PickedUp" ? (
          <AddTrip shipment={s} onAdded={reloadTrips} />
        ) : null}
        <Panel title="Bill" className={cn("h-full", tripData && !trips[0] && "lg:col-start-2")}>
          <BillRow label="Driver">{row.driver}</BillRow>
          <BillRow label="Cargo">{row.cargo}</BillRow>
          <BillRow label="The driver gets on arrival">
            <Money amount={s.advance} />
          </BillRow>
          <BillRow label="Waybil fee">
            <Money amount={String(BigInt(s.bill) - BigInt(s.advance))} />
          </BillRow>
          <BillRow label="You pay" strong>
            <Money amount={s.bill} />
          </BillRow>
          <BillRow label="Due">
            {shortDay(s.due_at)}
            {s.status !== "Repaid" && s.status !== "Cancelled" && days >= 0
              ? `, in ${days} ${days === 1 ? "day" : "days"}`
              : ""}
          </BillRow>
          {/* The actions sit at the bottom of the card. */}
          <div className="flex-1" />
          {s.status === "Approved" && (
            <Button variant="danger" onClick={() => setSheet("cancel")}>
              Cancel shipment
            </Button>
          )}
          {s.status === "Paid" && (
            <Button onClick={() => setSheet("pay")}>Pay {formatUsdc(BigInt(s.bill))} USDC</Button>
          )}
          {s.status === "Reported" && (
            <Button disabled={!report} onClick={() => setSheet("settle")}>
              Settle the report
            </Button>
          )}
        </Panel>
      </div>
      <Panel title="Trip">
        <div className="grid gap-28 md:grid-cols-2">
          <div className="flex flex-col gap-18">
            {timeline.map((step) => (
              <div key={step.title}>
                <TimelineStep state={step.state} title={step.title} time={step.time} />
                {step.detail && (
                  <p className="mt-4 pl-38 text-caption text-ds-ink-2">{step.detail}</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-16 rounded-row bg-ds-canvas p-20">
            {trip && (
              <Stop
                kind="pickup"
                label="Pickup"
                name={trip.pickup.name}
                address={trip.pickup.address}
              />
            )}
            {trip && (
              <p className="ml-6 border-l-2 border-dashed border-ds-line-strong py-4 pl-18 text-caption text-ds-muted">
                {Math.round(trip.distanceKm)} km by road
                {trip.durationMin != null ? `, about ${duration(trip.durationMin)}` : ""}.
              </p>
            )}
            {warehouse && (
              <Stop
                kind="destination"
                label="Destination"
                name={trip?.destination.name ?? places[warehouse]?.name ?? warehouse}
                address={trip?.destination.address ?? places[warehouse]?.address ?? ""}
              />
            )}
            <a
              className="link focus-ring mt-auto inline-block text-caption"
              href={CONTRACT_RECORD_URL}
              target="_blank"
              rel="noreferrer"
            >
              See the record on NearBlocks ↗
            </a>
          </div>
        </div>
      </Panel>
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

/* One end of the trip, a dot for the pickup and a square for the destination, as on the map. */
function Stop({
  kind,
  label,
  name,
  address,
}: {
  kind: "pickup" | "destination";
  label: string;
  name: string;
  address: string;
}) {
  return (
    <div className="flex items-start gap-12">
      <span
        aria-hidden
        className={cn(
          "mt-3 grid shrink-0 place-items-center bg-ds-ink",
          kind === "pickup"
            ? "size-14 rounded-full border-[3px] border-ds-bg"
            : "size-16 rounded-[4px]",
        )}
      >
        {kind === "destination" && <span className="size-6 rounded-[1px] bg-ds-brand" />}
      </span>
      <div className="min-w-0">
        <NameTag name={name} tag={label} bold />
        {address && <p className="text-caption text-ds-muted">{address}</p>}
      </div>
    </div>
  );
}

/* A small number with its label, for the route card. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-row bg-ds-canvas px-14 py-10">
      <p className="text-caption text-ds-muted">{label}</p>
      <p className="text-label font-semibold">{value}</p>
    </div>
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
