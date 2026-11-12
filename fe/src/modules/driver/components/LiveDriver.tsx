"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatUsdc, type Shipment } from "@waybil/shared";
import { ArrowDown, Buildings, Copy, Package, Truck } from "@phosphor-icons/react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { StatusPill } from "@/components/elements/StatusPill";
import { DeliveryQr } from "@/components/elements/DeliveryQr";
import { ProofLink } from "@/components/elements/ProofLink";
import { BackLink } from "@/components/elements/BackLink";
import { FILL_UNDER_HEADER, FillEmpty } from "@/components/elements/EmptyState";
import { SkeletonGroup, SkeletonHeader, SkeletonListPanel } from "@/components/elements/Skeleton";
import { useLive } from "@/hooks/useLive";
import { useNames } from "@/hooks/useNames";
import { ApiError } from "@/lib/api";
import { CONTRACT_RECORD_URL } from "@/lib/env";
import { listShipmentsByDriver, readAll } from "@/lib/near";
import { arrivalCode, relay } from "@/lib/relay";
import { statusChip } from "@/lib/status";

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
          {s.qty} {s.unit} · {name(s.shipper)}
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
  return (
    <>
      {back}
      <header className="flex flex-wrap items-center justify-between gap-12">
        <div className="min-w-0">
          <h1 className="text-title">Trip #{s.id}</h1>
          <p className="mt-6 text-label break-all text-ds-muted">
            {s.qty} {s.unit} · {name(s.shipper)}
          </p>
        </div>
        <StatusPill status={statusChip(s)} />
      </header>
      {tx && (
        <Panel className="gap-8">
          <p className="text-label">Recorded.</p>
          <ProofLink tx={tx} />
        </Panel>
      )}
      {s.status === "Approved" && (
        <Panel title="Waiting for pickup">
          <p className="text-label text-ds-muted">
            Load the goods, then confirm the pickup. You get {formatUsdc(BigInt(s.advance))} USDC
            the moment the warehouse confirms the delivery.
          </p>
          {error && (
            <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
              {error}
            </p>
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
      {["Paid", "Repaid", "CoveredByReserve"].includes(s.status) && (
        <Panel title="You got paid">
          <Money amount={s.advance} className="text-amount" />
          <p className="text-label text-ds-muted">Paid {day(s.paid_at)} to your account.</p>
        </Panel>
      )}
      {s.status === "Cancelled" && (
        <Panel title="Trip cancelled">
          <p className="text-label">The company cancelled this trip. Don’t pick up the goods.</p>
        </Panel>
      )}
      <a
        className="link focus-ring inline-flex w-fit items-center gap-4 text-[14px] font-medium"
        href={CONTRACT_RECORD_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        See the record on NearBlocks ↗
      </a>
    </>
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
                    {day(s.paid_at)} · {name(s.shipper)}
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
