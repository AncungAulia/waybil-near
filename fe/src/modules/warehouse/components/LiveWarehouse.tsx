"use client";
import { useState } from "react";
import { BackLink } from "@/components/elements/BackLink";
import type {
  ReportReason,
  ReportSaved,
  Shipment,
  WarehouseDestinationsResponse,
} from "@waybil/shared";
import { Camera, Check, Scan, Truck } from "@phosphor-icons/react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusPill } from "@/components/elements/StatusPill";
import { QrScanner } from "@/components/elements/QrScanner";
import { ProofLink } from "@/components/elements/ProofLink";
import { useLive } from "@/hooks/useLive";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { listShipmentsByDestination, readAll } from "@/lib/near";
import { useNames } from "@/hooks/useNames";
import { relay, shipmentFromCode } from "@/lib/relay";
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
  const { data, failed, reload } = useLive(() => load(), account, view === "arrivals" ? 15000 : 0);
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
          <Panel className="grid min-h-240 place-content-center">
            <p className="text-label text-ds-muted">Loading your arrivals.</p>
          </Panel>
        ) : data.destinations.length === 0 ? (
          <Panel className="grid min-h-320 place-content-center gap-12 text-center">
            <h1 className="text-heading">No destination yet</h1>
            <p className="mx-auto max-w-360 text-label text-ds-muted">
              The company that invited you adds this address to its network. Arrivals show up here
              after that.
            </p>
          </Panel>
        ) : view === "scan" ? (
          <ScanAndConfirm account={account} shipments={data.shipments} reload={reload} />
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
  const name = useNames(shipments.map((s) => s.driver));
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-12">
        <div>
          <h1 className="text-title">{history ? "History" : "Arrivals"}</h1>
          <p className="mt-6 text-label text-ds-muted">
            {history
              ? "Deliveries you confirmed."
              : "Trucks on the way to you. Scan the driver’s QR when one arrives."}
          </p>
        </div>
        {!history && (
          <ButtonLink href="/warehouse/scan" icon={<Scan size={17} />}>
            Scan a delivery
          </ButtonLink>
        )}
      </header>
      <Panel gap={4}>
        {shipments.length === 0 ? (
          <p className="py-12 text-label text-ds-muted">
            {history ? "No confirmed deliveries yet." : "No trucks are on the way right now."}
          </p>
        ) : (
          shipments.map((s) => (
            <div key={s.id} className="flex items-center gap-12 py-12">
              <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-canvas">
                <Truck size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-medium">Delivery #{s.id}</span>
                <span className="block text-caption break-all text-ds-muted">
                  {s.qty} {s.unit} · {name(s.driver)}
                  {history && s.arrived_at && ` · ${day(s.arrived_at)}`}
                </span>
              </span>
              <StatusPill status={statusChip(s)} />
            </div>
          ))
        )}
      </Panel>
    </>
  );
}

/* W2. Scan or type the code, count the goods, confirm or report. */
function ScanAndConfirm({
  account,
  shipments,
  reload,
}: {
  account: string;
  shipments: Shipment[];
  reload: () => void;
}) {
  const [code, setCode] = useState("");
  const [camera, setCamera] = useState(true);
  const [found, setFound] = useState<Shipment | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [good, setGood] = useState("");
  const [problem, setProblem] = useState(false);
  const [reasons, setReasons] = useState<ReportReason[]>([]);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ tx: string; reported: boolean } | null>(null);
  const name = useNames([found?.driver]);

  function lookUp(value: string) {
    const id = shipmentFromCode(value);
    const shipment = shipments.find((s) => s.id === id && s.status === "PickedUp" && !s.arrived_at);
    setNotFound(!shipment);
    if (shipment) {
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
    (!reporting || (reasons.length > 0 && reasons.length <= 4));

  async function confirm(s: Shipment) {
    setBusy(true);
    setError(null);
    try {
      let args: { id: number; good_qty: number; report_hash: string | null } = {
        id: s.id,
        good_qty: goodQty,
        report_hash: null,
      };
      if (reporting) {
        const form = new FormData();
        form.set(
          "report",
          JSON.stringify({ shipmentId: s.id, goodQty, reasons, note: note.trim() }),
        );
        photos.forEach((p) => form.append("photos", p));
        args = (await api<ReportSaved>("/reports", { body: form })).confirmArgs;
      }
      const result = await relay(account, "confirm_delivery", args);
      if (result.status === "failed") throw new Error("failed");
      setDone({ tx: result.txHash, reported: reporting });
      reload();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "The delivery was not recorded. Check your signal and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <Panel className="items-center gap-16 text-center">
        <BackLink href="/warehouse" className="self-start">
          Back to arrivals
        </BackLink>
        <span className="grid size-64 place-items-center rounded-full bg-ds-brand text-ds-ink">
          <Check size={30} weight="bold" />
        </span>
        <h1 className="text-title">{done.reported ? "Problem reported" : "Confirmed"}</h1>
        <p className="max-w-360 text-label text-ds-muted">
          {done.reported
            ? "The company reviews the report before the driver gets paid."
            : "The driver got paid just now."}
        </p>
        <ProofLink tx={done.tx} />
        <Button
          variant="secondary"
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
        <Panel>
          {camera && (
            <QrScanner
              active={camera}
              onCode={(value) => {
                setCode(value);
                lookUp(value);
              }}
              onBlocked={() => setCamera(false)}
              className="aspect-square w-full max-w-360 self-center overflow-hidden rounded-row"
            />
          )}
          <DeliveryCodeInput
            value={code}
            onChange={(value) => {
              setCode(value);
              setNotFound(false);
              if (value.length === 8) lookUp(value);
            }}
            invalid={notFound}
          />
          {notFound && (
            <p role="alert" className="text-label text-ds-danger">
              This code is not a truck on its way to you. Check it with the driver.
            </p>
          )}
        </Panel>
      ) : (
        <Panel title={`Delivery #${found.id}`}>
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
            <label className="flex items-center gap-10 text-label">
              <input
                type="checkbox"
                checked={problem}
                onChange={(e) => setProblem(e.target.checked)}
                className="size-18 accent-ds-ink"
              />
              Report a problem with the goods
            </label>
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
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-96 rounded-[14px] bg-ds-canvas p-12 text-[14px] outline-none focus-visible:outline-2 focus-visible:outline-ds-ink"
                />
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
          {error && (
            <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
              {error}
            </p>
          )}
          <Button
            className="h-52 w-full justify-between"
            disabled={!ready}
            loading={busy}
            loadingLabel="Recording"
            onClick={() => void confirm(found)}
          >
            {reporting ? "Send the report" : "Confirm delivery"}
          </Button>
          <Button variant="quiet" onClick={() => setFound(null)}>
            Scan a different code
          </Button>
        </Panel>
      )}
    </>
  );
}
