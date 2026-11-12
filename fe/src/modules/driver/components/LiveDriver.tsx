"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatUsdc, type Shipment } from "@waybil/shared";
import { ArrowDown, Buildings, Copy, NavigationArrow, Package, Truck } from "@phosphor-icons/react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { StatusPill } from "@/components/elements/StatusPill";
import { DeliveryQr } from "@/components/elements/DeliveryQr";
import { ProofLink } from "@/components/elements/ProofLink";
import { BackLink } from "@/components/elements/BackLink";
import { TripMap } from "@/components/elements/TripMap";
import { useTrips } from "@/hooks/useTrips";
import { sharingNote, useShareLocation } from "@/hooks/useShareLocation";
import { directionsUrl, duration } from "@/lib/route";
import { FILL_UNDER_HEADER, FillEmpty } from "@/components/elements/EmptyState";
import {
  SkeletonGroup,
  SkeletonHeader,
  SkeletonListPanel,
  SkeletonTripPage,
} from "@/components/elements/Skeleton";
import { useLive } from "@/hooks/useLive";
import { useNames } from "@/hooks/useNames";
import { ApiError } from "@/lib/api";
import { CONTRACT_RECORD_URL } from "@/lib/env";
import { listShipmentsByDriver, readAll } from "@/lib/near";
import { arrivalCode, relay } from "@/lib/relay";
import { statusChip } from "@/lib/status";
import { cn } from "@/lib/cn";

/*
 * The driver screens on testnet (#85). Pickup is signed by the phone's device key and
 * relayed by the backend, so the driver sees no wallet and pays no fees. Company names come
 * from GET /v1/profiles (#80, open question 1) and fall back to the account id.
 */

export type DriverView = "trips" | "trip" | "payouts" | "companies";

const day = (ns: string | null) =>
  ns
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
        new Date(Number(BigInt(ns) / 1000000n)),
      )
    : "";

export function LiveDriver({
  view,
  account,
  shipmentId,
}: {
  view: DriverView;
  account: string;
  shipmentId?: number;
}) {
  /* Trips read again every 10 seconds while the tab is in view, so a new trip, a pickup and
   * the payout show up on their own. */
  const { data, failed, reload } = useLive(
    () =>
      readAll((from, limit) => listShipmentsByDriver(account, { from, limit })).then((list) =>
        list.sort((a, b) => b.id - a.id),
      ),
    account,
    10000,
  );
  const current =
    view === "payouts" ? "/driver/payouts" : view === "companies" ? "/driver/companies" : "/driver";
  return (
    <RoleShell role="driver" current={current} detail={view === "trip"}>
      <div className="flex flex-col gap-24">
        {failed ? (
          <Panel className="grid min-h-240 place-content-center gap-12 text-center">
            <p className="text-label text-ds-muted">
              We could not load your trips. Try again in a moment.
            </p>
            <Button variant="secondary" className="mx-auto" onClick={reload}>
              Try again
            </Button>
          </Panel>
        ) : !data ? (
          <SkeletonGroup label="Loading your trips." className="flex flex-col gap-24">
            <SkeletonHeader />
            <SkeletonListPanel rows={4} />
          </SkeletonGroup>
        ) : view === "trip" ? (
          <Trip
            account={account}
            shipment={data.find((s) => s.id === shipmentId)}
            reload={reload}
          />
        ) : view === "payouts" ? (
          <Payouts trips={data} />
        ) : view === "companies" ? (
          <Companies trips={data} />
        ) : (
          <Trips trips={data} />
        )}
      </div>
    </RoleShell>
  );
}

function Row({ s }: { s: Shipment }) {
  const router = useRouter();
  const name = useNames([s.shipper]);
  return (
    <button
      type="button"
      onClick={() => router.push(`/driver/trips/${s.id}`)}
      className="tap focus-ring flex w-full items-center gap-12 rounded-row p-16 text-left hover:bg-ds-canvas"
    >
      <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-canvas">
        <Truck size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium">Trip #{s.id}</span>
        <span className="mt-4 block text-[12.5px] break-all text-ds-muted">
          {s.qty} {s.unit} for {name(s.shipper)}
        </span>
      </span>
      <span className="flex flex-col items-end gap-6">
        <Money amount={s.advance} className="text-body font-medium" />
        <StatusPill status={statusChip(s)} />
      </span>
    </button>
  );
}

/* K1. */
function Trips({ trips }: { trips: Shipment[] }) {
  const open = trips.filter((s) => ["Approved", "PickedUp", "Reported"].includes(s.status));
  const done = trips.filter((s) => !open.includes(s));
  return (
    <>
      <header>
        <h1 className="text-title">Trips</h1>
        <p className="mt-6 text-label text-ds-muted">
          Confirm pickup, show your QR at the destination, and get paid on arrival.
        </p>
      </header>
      {trips.length === 0 ? (
        <FillEmpty
          image="/illustrations/driver.svg"
          title="No trips yet"
          body="When a company sends you a trip, it shows up here."
          className={FILL_UNDER_HEADER}
        />
      ) : (
        <>
          <Panel title="Open trips" gap={4}>
            {open.length === 0 && <p className="py-8 text-label text-ds-muted">No open trips.</p>}
            {open.map((s) => (
              <Row key={s.id} s={s} />
            ))}
          </Panel>
          {done.length > 0 && (
            <Panel title="Done" gap={4}>
              {done.map((s) => (
                <Row key={s.id} s={s} />
              ))}
            </Panel>
          )}
        </>
      )}
    </>
  );
}

/* K2 for one trip. */
function Trip({
  account,
  shipment: s,
  reload,
}: {
  account: string;
  shipment: Shipment | undefined;
  reload: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const name = useNames([s?.shipper]);
  const { trips, data: tripData } = useTrips(s ? [s.id] : []);
  const trip = trips[0];
  const sharing = useShareLocation(s?.id, s?.status === "PickedUp");
  /* A company with no name set would keep the page waiting, so stop waiting after 3 seconds. */
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);
  const back = <BackLink href="/driver">Trips</BackLink>;
  if (!s)
    return (
      <>
        {back}
        <Panel className="grid min-h-240 place-content-center text-center">
          <h1 className="text-heading">This trip could not be found</h1>
          <p className="mt-8 text-label text-ds-muted">It is not one of your trips.</p>
        </Panel>
      </>
    );

  async function pickup(id: number) {
    setBusy(true);
    setError(null);
    try {
      const result = await relay(account, "confirm_pickup", { id });
      setTx(result.txHash);
      if (result.status === "failed") setError("The pickup was not recorded. Try again.");
      reload();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "The pickup could not be sent. Check your signal.",
      );
    } finally {
      setBusy(false);
    }
  }
  const code = arrivalCode(s.id);
  /* The page shows once the trip and the company name are in, so nothing changes under the reader. */
  if (!tripData || (name(s.shipper) === s.shipper && !waited))
    return (
      <>
        {back}
        <SkeletonTripPage label="Loading this trip." />
      </>
    );
  return (
    <>
      {back}
      <header className="flex flex-wrap items-center justify-between gap-12">
        <div className="min-w-0">
          {/* The title waits for the trip and the company name, so it never flashes raw ids. */}
          <h1 className="text-title break-words">
            {trip ? `${trip.pickup.name} to ${trip.destination.name}` : `Trip #${s.id}`}
          </h1>
          <p className="mt-6 text-label break-all text-ds-muted">
            Trip #{s.id} for {name(s.shipper)}.
          </p>
        </div>
        <StatusPill status={statusChip(s)} />
      </header>
      {/* The map on the left, at the full height of the cards on the right. */}
      <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-24">
        <div className="flex flex-col gap-10">
          {trip ? (
            <>
              <TripMap
                trip={trip}
                status={s.status}
                caption={false}
                className="h-300 rounded-card lg:h-auto lg:min-h-480 lg:flex-1"
              />
              <p className="px-4 text-caption text-ds-muted">
                {s.status === "PickedUp"
                  ? sharingNote(sharing.state)
                  : `${trip.pickup.name} to ${trip.destination.name} is ${Math.round(trip.distanceKm)} km by road${trip.durationMin != null ? `, about ${duration(trip.durationMin)} of driving` : ""}.`}
              </p>
            </>
          ) : (
            <div className="grid h-200 place-items-center rounded-card bg-ds-bg p-24 text-center text-label text-ds-muted">
              This trip has no map yet. The company adds the pickup point.
            </div>
          )}
        </div>
        <div className="flex flex-col gap-16">
          {tx && (
            <Panel className="gap-8">
              <p className="text-label">Recorded.</p>
              <ProofLink tx={tx} />
            </Panel>
          )}
          {s.status === "Approved" && (
            <Panel title="Waiting for pickup">
              <p className="text-label text-ds-muted">Load the goods, then confirm the pickup.</p>
              {error && (
                <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
                  {error}
                </p>
              )}
              {trip && (
                <ButtonLink
                  href={directionsUrl(trip.pickup.lat, trip.pickup.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  icon={<NavigationArrow size={17} />}
                  className="h-52 w-full justify-between"
                >
                  Directions to the pickup
                </ButtonLink>
              )}
              <Button
                className="h-52 w-full justify-between"
                icon={<Package size={17} />}
                loading={busy}
                loadingLabel="Recording"
                onClick={() => void pickup(s.id)}
              >
                Confirm pickup
              </Button>
            </Panel>
          )}
          {s.status === "PickedUp" && (
            <Panel title="Show this at the destination">
              <p className="text-label text-ds-muted">
                The warehouse scans this QR or types the code to confirm the delivery.
              </p>
              <DeliveryQr code={code} />
              <p className="text-center font-mono text-[28px] tracking-[0.2em]">{code}</p>
              <Button
                variant="secondary"
                icon={<Copy size={17} />}
                className="w-full justify-between"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? "Code copied" : "Copy the code"}
              </Button>
              {trip && (
                <ButtonLink
                  href={directionsUrl(trip.destination.lat, trip.destination.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  icon={<NavigationArrow size={17} />}
                  className="w-full justify-between"
                >
                  Directions to the destination
                </ButtonLink>
              )}
            </Panel>
          )}
          {s.status === "Reported" && (
            <Panel title="Problem reported">
              <p className="text-label">
                The warehouse found a problem with the goods. Your payout waits until the company
                settles it.
              </p>
            </Panel>
          )}
          {s.status === "Cancelled" && (
            <Panel title="Trip cancelled">
              <p className="text-label">
                The company cancelled this trip. Don’t pick up the goods.
              </p>
            </Panel>
          )}
          <PayCard
            amount={s.advance}
            paid={["Paid", "Repaid", "CoveredByReserve"].includes(s.status)}
            paidOn={s.paid_at ? day(s.paid_at) : ""}
            destination={trip?.destination.name ?? "the warehouse"}
          />
          <Panel title="Trip">
            <div className="flex flex-col gap-12">
              <Fact label="Company">{name(s.shipper)}</Fact>
              <Fact label="Pickup">{trip?.pickup.name ?? "Not set"}</Fact>
              <Fact label="Drop-off">{trip?.destination.name ?? "Not set"}</Fact>
              <Fact label="Cargo">
                {s.qty} {s.unit}
              </Fact>
            </div>
            <a
              className="link focus-ring inline-flex w-fit items-center gap-4 text-caption"
              href={CONTRACT_RECORD_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              See the record on NearBlocks ↗
            </a>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* What the driver gets: dark with a large amount until paid, then plain with the day it landed. */
function PayCard({
  amount,
  paid,
  paidOn,
  destination,
}: {
  amount: string;
  paid: boolean;
  paidOn: string;
  destination: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-8 rounded-card p-24",
        paid ? "bg-ds-bg" : "bg-ds-ink text-ds-bg",
      )}
    >
      <span
        className={cn(
          "w-fit rounded-full px-10 py-2 text-[12px] font-semibold",
          paid ? "bg-ds-success-soft text-ds-success" : "bg-ds-brand text-ds-ink",
        )}
      >
        {paid ? "You got paid" : "You get on arrival"}
      </span>
      <p className="text-[32px] leading-[1.15] font-semibold">{formatUsdc(BigInt(amount))} USDC</p>
      <p className={cn("text-label", paid ? "text-ds-muted" : "text-ds-bg/70")}>
        {paid
          ? `Paid ${paidOn} to your account.`
          : `Paid the moment ${destination} confirms the delivery.`}
      </p>
    </section>
  );
}

/* One trip fact, the label on the left and the value on the right. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-12 text-label">
      <span className="text-ds-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/* K3.1 and K3.2. */
function Payouts({ trips }: { trips: Shipment[] }) {
  const paid = trips.filter((s) => s.paid_at);
  const total = paid.reduce((sum, s) => sum + BigInt(s.advance), 0n);
  const name = useNames(paid.map((s) => s.shipper));
  return (
    <>
      <header>
        <h1 className="text-title">Payouts</h1>
        <p className="mt-6 text-label text-ds-muted">Money you got the moment goods arrived.</p>
      </header>
      {paid.length === 0 ? (
        <FillEmpty
          icon={<ArrowDown size={26} />}
          title="No payouts yet"
          body="You get paid the moment a warehouse confirms your delivery."
          className={FILL_UNDER_HEADER}
        />
      ) : (
        <>
          <Panel title="Total paid">
            <Money amount={String(total)} className="text-amount" />
          </Panel>
          <Panel gap={4}>
            {paid.map((s) => (
              <Link
                key={s.id}
                href={`/driver/trips/${s.id}`}
                className="tap focus-ring -mx-12 flex items-center justify-between gap-12 rounded-row px-12 py-12 hover:bg-ds-canvas"
              >
                <span className="min-w-0">
                  <span className="block text-label">Trip #{s.id}</span>
                  <span className="block text-caption break-all text-ds-muted">
                    Paid {day(s.paid_at)} for {name(s.shipper)}
                  </span>
                </span>
                <Money amount={s.advance} className="shrink-0 text-label" />
              </Link>
            ))}
          </Panel>
        </>
      )}
    </>
  );
}

/* K3.3. */
function Companies({ trips }: { trips: Shipment[] }) {
  const companies = [...new Set(trips.map((s) => s.shipper))];
  const name = useNames(companies);
  return (
    <>
      <header>
        <h1 className="text-title">Companies</h1>
        <p className="mt-6 text-label text-ds-muted">The companies that send you trips.</p>
      </header>
      {companies.length === 0 ? (
        <FillEmpty
          icon={<Buildings size={26} />}
          title="No companies yet"
          body="Accept an invite link from a company to start getting trips from it."
          className={FILL_UNDER_HEADER}
        />
      ) : (
        <Panel gap={4}>
          {companies.map((c) => (
            <div key={c} className="py-12">
              <p className="text-label break-all">{name(c)}</p>
              <p className="text-caption text-ds-muted">
                {trips.filter((s) => s.shipper === c).length} trips
              </p>
            </div>
          ))}
        </Panel>
      )}
    </>
  );
}
