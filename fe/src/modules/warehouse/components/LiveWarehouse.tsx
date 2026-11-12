"use client";
import { useAuth } from "@/providers/AuthProvider";
import { Greeting } from "@/components/elements/Greeting";
import { qk } from "@/lib/queryKeys";
import { Checkbox } from "@/components/ui/Checkbox";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useInvalidate } from "@/hooks/useInvalidate";
import { BackLink } from "@/components/elements/BackLink";
import type {
  ArrivalLookupResponse,
  ReportReason,
  ReportSaved,
  Shipment,
  WarehouseDestinationsResponse,
} from "@waybil/shared";
import { Camera, Package, Scan, Truck } from "@phosphor-icons/react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NameTag } from "@/components/ui/Tag";
import { StatusPill } from "@/components/elements/StatusPill";
import { QrScanner } from "@/components/elements/QrScanner";
import { ProofLink } from "@/components/elements/ProofLink";
import {
  FILL_PAGE,
  FILL_UNDER_HEADER,
  FILL_UNDER_HEADER_ACTION,
  FillEmpty,
} from "@/components/elements/EmptyState";
import { SkeletonGroup, SkeletonHeader, SkeletonListPanel } from "@/components/elements/Skeleton";
import { useLive } from "@/hooks/useLive";
import { usePlaces } from "@/hooks/useTrips";
import { RouteMap } from "@/components/elements/RouteMap";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { listShipmentsByDestination, readAll } from "@/lib/near";
import { useNames } from "@/hooks/useNames";
import { cleanArrivalCode, relay } from "@/lib/relay";
import { statusChip } from "@/lib/status";
import { DeliveryCodeInput } from "./DeliveryCodeInput";
import "./warehouse.css";

/*
 * The warehouse screens on testnet (#85). The backend finds this account's destinations from
 * the warehouse invites it accepted (GET /v1/me/destinations, #80 open question 3).
 * Confirmations are signed by the phone's device key and relayed by the backend.
 */

export type WarehouseView = "arrivals" | "scan" | "history";

async function load() {
  const { destinations } = await api<WarehouseDestinationsResponse>("/me/destinations");
  const lists = await Promise.all(
    destinations.map((d) =>
      readAll((from, limit) => listShipmentsByDestination(d.id, { from, limit })),
    ),
  );
  return { destinations, shipments: lists.flat().sort((a, b) => b.id - a.id) };
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "damaged", label: "Damaged" },
  { value: "missing", label: "Missing" },
  { value: "wrong_goods", label: "Wrong goods" },
  { value: "other", label: "Other" },
];
const day = (ns: string | null) =>
  ns
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
        new Date(Number(BigInt(ns) / 1000000n)),
      )
    : "";

export function LiveWarehouse({ view, account }: { view: WarehouseView; account: string }) {
  const { data, failed, reload } = useLive(() => load(), qk.warehouse(account), 10000);
  const current =
    view === "scan" ? "/warehouse/scan" : view === "history" ? "/warehouse/history" : "/warehouse";
  return (
    <RoleShell role="warehouse" current={current}>
      <div className="flex flex-col gap-24">
        {failed ? (
          <Panel className="grid min-h-240 place-content-center gap-12 text-center">
            <p className="text-label text-ds-muted">
              We could not load your arrivals. Try again in a moment.
            </p>
            <Button variant="secondary" className="mx-auto" onClick={reload}>
              Try again
            </Button>
          </Panel>
        ) : !data ? (
          <SkeletonGroup label="Loading your arrivals." className="flex flex-col gap-24">
            <SkeletonHeader />
            <SkeletonListPanel rows={4} title={false} />
          </SkeletonGroup>
        ) : data.destinations.length === 0 ? (
          <Joined
            fallback={
              <FillEmpty
                as="h1"
                image="/illustrations/network/empty-warehouse.svg"
                title="No destination yet"
                body="The company that invited you adds this address to its network. Arrivals show up here after that."
                className={FILL_PAGE}
              />
            }
          />
        ) : view === "scan" ? (
          <ScanAndConfirm account={account} shipments={data.shipments} />
        ) : (
          <List
            history={view === "history"}
            shipments={data.shipments.filter((s) =>
              view === "history"
                ? !["Approved", "PickedUp"].includes(s.status) || s.arrived_at
                : s.status === "PickedUp" && !s.arrived_at,
            )}
          />
        )}
      </div>
    </RoleShell>
  );
}

/* W1 and W3. */
function List({ history, shipments }: { history: boolean; shipments: Shipment[] }) {
  const { profile } = useAuth();
  const name = useNames(shipments.map((s) => s.driver));
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-12">
        <div className="min-w-0">
          {history ? (
            <h1 className="text-title">History</h1>
          ) : (
            <Greeting name={profile?.name || undefined} />
          )}
          <p className="mt-6 text-label text-ds-muted">
            {history
              ? "Deliveries you confirmed."
              : "Trucks on the way to you. Scan the driver’s QR when one arrives."}
          </p>
        </div>
        {!history && (
          <ButtonLink href="/warehouse/scan" icon={<Scan size={17} />} className="w-full md:w-auto">
            Scan a delivery
          </ButtonLink>
        )}
      </header>
      {shipments.length === 0 ? (
        history ? (
          <FillEmpty
            icon={<Package size={26} />}
            title="Nothing received yet"
            body="Deliveries you confirm or report show up here."
            className={FILL_UNDER_HEADER}
          />
        ) : (
          <FillEmpty
            image="/illustrations/warehouse/empty.svg"
            title="No trucks on the way"
            body="When a company sends a trip to you, it shows up here with the driver’s name."
            className={FILL_UNDER_HEADER_ACTION}
          />
        )
      ) : (
        <Panel gap={4}>
          {shipments.map((s) => (
            <div key={s.id} className="flex items-center gap-12 py-12">
              <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-canvas">
                <Truck size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-medium">Delivery #{s.id}</span>
                <span className="block text-caption break-all text-ds-muted">
                  {name(s.driver)} brings {s.qty} {s.unit}.
                  {history && s.arrived_at && ` It arrived ${day(s.arrived_at)}.`}
                </span>
              </span>
              <StatusPill status={statusChip(s)} />
            </div>
          ))}
        </Panel>
      )}
    </>
  );
}

/* W2. Scan or type the code, count the goods, confirm or report. */
function ScanAndConfirm({ account, shipments }: { account: string; shipments: Shipment[] }) {
  const [code, setCode] = useState("");
  const [camera, setCamera] = useState(true);
  const [found, setFound] = useState<Shipment | null>(null);
  /* Why a code did not open a delivery, so the message can say what really happened. */
  const [miss, setMiss] = useState<
    | { kind: "unknown" }
    | { kind: "done"; id: number; at: string | null }
    | { kind: "early"; id: number }
    | null
  >(null);
  const setNotFound = (value: boolean) => !value && setMiss(null);
  const [good, setGood] = useState("");
  const [problem, setProblem] = useState(false);
  const [reasons, setReasons] = useState<ReportReason[]>([]);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ tx: string; reported: boolean } | null>(null);
  const invalidate = useInvalidate();
  const name = useNames([found?.driver]);

  /* The code the driver showed, kept to send with the confirmation. */
  const [arrivalCode, setArrivalCode] = useState<string | null>(null);
  /* The backend knows which shipment a random code belongs to, and answers only for ours. */
  async function lookUp(value: string) {
    const code = cleanArrivalCode(value);
    let id: number | null = null;
    if (code)
      id = await api<ArrivalLookupResponse>("/arrivals/lookup", { body: { code } })
        .then((r) => r.shipmentId)
        .catch(() => null);
    const known = shipments.find((s) => s.id === id);
    const shipment = known && known.status === "PickedUp" && !known.arrived_at ? known : undefined;
    setMiss(
      shipment
        ? null
        : !known
          ? { kind: "unknown" }
          : known.status === "Approved"
            ? { kind: "early", id: known.id }
            : { kind: "done", id: known.id, at: known.arrived_at },
    );
    if (shipment) {
      setArrivalCode(code);
      setFound(shipment);
      setGood(String(shipment.qty));
      setCamera(false);
    }
  }
  const goodQty = /^\d+$/.test(good) ? Number(good) : -1;
  const short = !!found && goodQty >= 0 && goodQty < found.qty;
  const reporting = problem || short;
  const ready =
    !!found &&
    goodQty >= 0 &&
    goodQty <= found.qty &&
    /* A report needs a reason and a short note. The backend refuses one without a note. */
    (!reporting || (reasons.length > 0 && reasons.length <= 4 && note.trim().length > 0));

  /* Saves the report first when there is a problem, then has the relayer record the delivery. */
  async function record(s: Shipment) {
    let args: { id: number; good_qty: number; report_hash: string | null } = {
      id: s.id,
      good_qty: goodQty,
      report_hash: null,
    };
    if (reporting) {
      const form = new FormData();
      form.set("report", JSON.stringify({ shipmentId: s.id, goodQty, reasons, note: note.trim() }));
      photos.forEach((p) => form.append("photos", p));
      args = (await api<ReportSaved>("/reports", { body: form })).confirmArgs;
    }
    const result = await relay(account, "confirm_delivery", args, arrivalCode ?? undefined);
    if (result.status === "failed") throw new Error("failed");
    return { tx: result.txHash, reported: reporting };
  }
  const confirmation = useMutation({
    mutationFn: record,
    onSuccess: (result) => {
      setDone(result);
      /* The delivery moves to history, and its trip ends on the map. */
      void invalidate(qk.warehouse(account), qk.allTrips());
    },
    onError: (e) =>
      setError(
        e instanceof ApiError
          ? e.message
          : "The delivery was not recorded. Check your signal and try again.",
      ),
  });
  const busy = confirmation.isPending;
  function confirm(s: Shipment) {
    setError(null);
    confirmation.mutate(s);
  }

  if (done)
    return (
      /* A rare, happy moment: it fills the window and plays a short celebration once. */
      <Panel className={cn("relative items-center gap-16 text-center", FILL_PAGE)}>
        <BackLink href="/warehouse" className="self-start">
          Back to arrivals
        </BackLink>
        <div className="flex flex-1 flex-col items-center justify-center gap-16">
          <span className="relative grid size-88 place-items-center">
            <span aria-hidden className="confirm-ring absolute inset-0 rounded-full bg-ds-brand" />
            <span
              aria-hidden
              className="confirm-ring confirm-ring-late absolute inset-0 rounded-full bg-ds-brand"
            />
            <span
              className={cn(
                "confirm-pop relative grid size-88 place-items-center rounded-full",
                done.reported ? "bg-ds-danger-soft text-ds-danger" : "bg-ds-brand text-ds-ink",
              )}
            >
              <svg viewBox="0 0 24 24" className="size-40" aria-hidden>
                <path
                  className="confirm-check"
                  d="M5 12.5l4.5 4.5L19 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </span>
          <h1 className="confirm-rise text-title" style={{ animationDelay: "250ms" }}>
            {done.reported ? "Problem reported" : "Confirmed"}
          </h1>
          <p
            className="confirm-rise max-w-360 text-label text-ds-muted"
            style={{ animationDelay: "300ms" }}
          >
            {done.reported
              ? "The company reviews the report before the driver gets paid."
              : "The driver got paid just now."}
          </p>
          <span className="confirm-rise" style={{ animationDelay: "350ms" }}>
            <ProofLink tx={done.tx} />
          </span>
        </div>
        <Button
          variant="secondary"
          className="confirm-rise w-full justify-between md:w-auto"
          style={{ animationDelay: "400ms" }}
          onClick={() => {
            setDone(null);
            setFound(null);
            setCode("");
            setProblem(false);
            setReasons([]);
            setNote("");
            setPhotos([]);
            setCamera(true);
          }}
        >
          Scan another delivery
        </Button>
      </Panel>
    );

  return (
    <>
      <header>
        <h1 className="text-title">Confirm a delivery</h1>
        <p className="mt-6 text-label text-ds-muted">
          Scan the QR on the driver’s phone or type the 8-character code.
        </p>
      </header>
      {!found ? (
        <Panel className={cn("justify-center", FILL_UNDER_HEADER)}>
          {/* Two ways in, one under the other: the camera, then the typed code. */}
          <div className="mx-auto flex w-full max-w-488 flex-col items-center gap-18">
            {camera && (
              <QrScanner
                active={camera}
                onCode={(value) => {
                  /* Show what was read in the boxes, tidied the same way as typing. */
                  const tidy = value
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toUpperCase()
                    .slice(0, 8);
                  setCode(tidy);
                  void lookUp(tidy);
                }}
                onBlocked={() => setCamera(false)}
                className="aspect-square w-full max-w-360 overflow-hidden rounded-row"
              />
            )}
            {camera && (
              <div className="flex w-full items-center gap-12 text-caption text-ds-muted">
                <span aria-hidden className="h-px flex-1 bg-ds-line" />
                or type the code
                <span aria-hidden className="h-px flex-1 bg-ds-line" />
              </div>
            )}
            <DeliveryCodeInput
              value={code}
              onChange={(value) => {
                setCode(value);
                setNotFound(false);
                if (value.length === 8) void lookUp(value);
              }}
              invalid={miss?.kind === "unknown"}
            />
            {miss?.kind === "unknown" ? (
              <p role="alert" className="text-center text-label text-ds-danger">
                This code is not a truck on its way to you. Check it with the driver.
              </p>
            ) : miss?.kind === "done" ? (
              <p role="status" className="text-center text-label">
                Delivery #{miss.id} was already confirmed
                {miss.at
                  ? ` on ${new Date(Number(BigInt(miss.at) / 1_000_000n)).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : ""}
                . You can find it in History.
              </p>
            ) : miss?.kind === "early" ? (
              <p role="status" className="text-center text-label">
                Delivery #{miss.id} isn’t picked up yet. The driver confirms the pickup first.
              </p>
            ) : (
              <p className="max-w-320 text-center text-caption text-ds-muted">
                The 8 characters are under the QR on the driver’s phone.
              </p>
            )}
          </div>
        </Panel>
      ) : (
        <Panel title={`Delivery #${found.id}`} className={FILL_UNDER_HEADER}>
          <p className="text-label break-all text-ds-muted">
            {found.qty} {found.unit} from {name(found.driver)}
          </p>
          <Input
            label={`How many ${found.unit} arrived in good shape?`}
            inputMode="numeric"
            value={good}
            onChange={(e) => setGood(e.target.value)}
            error={
              good && (goodQty < 0 || goodQty > found.qty)
                ? `Enter a number from 0 to ${found.qty}.`
                : undefined
            }
          />
          {!short && (
            <Checkbox checked={problem} onChange={setProblem}>
              Report a problem with the goods
            </Checkbox>
          )}
          {reporting && (
            <>
              <fieldset className="flex flex-col gap-8">
                <legend className="mb-8 text-label">What went wrong?</legend>
                <div className="flex flex-wrap gap-8">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={cn(
                        "tap flex cursor-pointer items-center gap-6 rounded-full px-14 py-8 text-[13px] font-medium",
                        reasons.includes(r.value)
                          ? "bg-ds-ink text-ds-bg"
                          : "bg-ds-canvas hover:bg-ds-canvas-hover",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={reasons.includes(r.value)}
                        onChange={() =>
                          setReasons((list) =>
                            list.includes(r.value)
                              ? list.filter((x) => x !== r.value)
                              : [...list, r.value],
                          )
                        }
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-8 text-label">
                Note
                <textarea
                  value={note}
                  maxLength={2000}
                  required
                  placeholder="Three crates were wet at the bottom."
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-96 rounded-[14px] bg-ds-canvas p-12 text-[14px] outline-none placeholder:text-ds-off-ink focus-visible:outline-2 focus-visible:outline-ds-ink"
                />
                <span className="text-caption text-ds-muted">
                  Tell the company what happened in one sentence. It is needed to send the report.
                </span>
              </label>
              <label className="tap focus-ring flex w-fit cursor-pointer items-center gap-8 rounded-full bg-ds-canvas px-14 py-10 text-label hover:bg-ds-canvas-hover">
                <Camera size={17} />
                {photos.length ? `${photos.length} photos added` : "Add photos"}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  capture="environment"
                  className="sr-only"
                  onChange={(e) =>
                    setPhotos(
                      [...(e.target.files ?? [])]
                        .filter((f) => f.size <= 2 * 1024 * 1024)
                        .slice(0, 5),
                    )
                  }
                />
              </label>
              <p className="text-caption text-ds-muted">Up to 5 JPG or PNG photos, 2 MB each.</p>
            </>
          )}
          {/* The card fills the window and the buttons sit at the bottom, by the thumb on a phone. */}
          <div aria-hidden className="flex-1" />
          {error && (
            <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
              {error}
            </p>
          )}
          {/* Full width on a phone. From a tablet up, side by side in the bottom right corner. */}
          <div className="flex flex-col gap-10 md:flex-row-reverse md:justify-start md:self-end">
            <Button
              className="h-52 w-full justify-between md:w-auto"
              disabled={!ready}
              loading={busy}
              loadingLabel="Recording"
              onClick={() => confirm(found)}
            >
              {reporting ? "Send the report" : "Confirm delivery"}
            </Button>
            <Button variant="quiet" className="md:w-auto" onClick={() => setFound(null)}>
              Scan a different code
            </Button>
          </div>
        </Panel>
      )}
    </>
  );
}

/*
 * Shown after the warehouse accepted an invite and before the company added the address to
 * its network on chain. It names the place and the company, so the staff know they are in the
 * right spot and only wait for one more step.
 */
function Joined({ fallback }: { fallback: React.ReactNode }) {
  const { data } = usePlaces();
  const places = (data?.places ?? []).filter((p) => p.kind === "destination");
  const name = useNames(places.map((p) => p.shipperId));
  if (!data) return <SkeletonListPanel rows={2} title={false} />;
  if (!places.length) return <>{fallback}</>;
  return (
    <>
      <header>
        <h1 className="text-title">
          {places.length === 1 ? places[0]!.name : "Your destinations"}
        </h1>
        <p className="mt-6 text-label text-ds-muted">
          You joined. The company still has to add this address to its network. Arrivals show up
          here after that.
        </p>
      </header>
      {places.map((p) => (
        <Panel key={p.id} className="gap-12">
          <div>
            <NameTag name={p.name} tag="Waiting to be added" bold />
            <p className="text-caption text-ds-muted">For {name(p.shipperId)}</p>
            <p className="mt-4 text-caption text-ds-muted">{p.address}</p>
          </div>
          <RouteMap pin={{ lat: p.lat, lng: p.lng }} className="h-240 w-full md:h-320" />
        </Panel>
      ))}
    </>
  );
}
