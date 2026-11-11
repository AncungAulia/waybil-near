"use client";
import { useState, useSyncExternalStore } from "react";
import { notFound, usePathname, useRouter } from "next/navigation";
import { RoleShell } from "@/components/layout/RoleShell";
import { BackLink } from "@/components/elements/BackLink";
import { ShipmentRowSkeleton } from "@/components/elements/ShipmentRow";
import { useDemoDelivery } from "@/hooks/useDemoDelivery";
import { ShipperHome } from "./ShipperHome";
import { NewShipment } from "./NewShipment";
import { ShipperDetail } from "./ShipperDetail";
import { ShipperNetwork } from "./ShipperNetwork";
import { ShipperCredit } from "./ShipperCredit";
import { ShipperShipments } from "./ShipperShipments";
import {
  COVERED_SHIPMENT,
  LATE_SHIPMENT,
  SHIPMENTS,
  SHIPPER_FIXTURES,
  type ShipperState,
} from "../data/fixtures";
import type { ShipmentStatus } from "@waybil/shared";
import {
  cancelDemoShipment,
  createDemoShipment,
  useShipperShipments,
} from "../hooks/useShipperShipments";

function routeFor(state: ShipperState, id: number) {
  return state.startsWith("P1")
    ? "/shipper"
    : state.startsWith("P2")
      ? "/shipper/shipments/new"
      : state.startsWith("P3") || state.startsWith("P4")
        ? `/shipper/shipments/${id}`
        : state.startsWith("P5")
          ? "/shipper/network"
          : state.startsWith("P6")
            ? "/shipper/shipments"
            : "/shipper/credit";
}
/* Which detail states each status can show. The first one is where the screen opens. */
const DETAIL_STATES: Record<ShipmentStatus, ShipperState[]> = {
  Approved: ["P3.1", "P3.11"],
  PickedUp: ["P3.2", "P3.3"],
  Reported: ["P3.6", "P3.7", "P3.8", "P3.10"],
  Paid: ["P3.4", "P4.1", "P4.2", "P4.3"],
  Repaid: ["P3.5", "P4.4"],
  Cancelled: ["P3.12"],
  CoveredByReserve: ["P3.13"],
};
function detailState(state: ShipperState, status: ShipmentStatus, settled: boolean) {
  /* A settled report is a Paid shipment that keeps its own card and can reopen the report. */
  const allowed = settled
    ? ["P3.9", "P3.7", ...DETAIL_STATES.Paid.slice(1)]
    : DETAIL_STATES[status];
  return allowed.includes(state) ? state : (allowed[0] as ShipperState);
}
const mountedSubscribe = () => () => {};
const mountedSnapshot = () => true;
const mountedServerSnapshot = () => false;
export function ShipperScreen({
  initialState = "P1.1",
  preview = false,
  shipmentId = 1041,
  initialReceipt,
}: {
  initialState?: ShipperState;
  preview?: boolean;
  shipmentId?: number;
  initialReceipt?: string;
}) {
  const [localState, setState] = useState(initialState),
    [recorded, setRecorded] = useState<string | undefined>(initialReceipt);
  const router = useRouter(),
    pathname = usePathname(),
    delivery = useDemoDelivery();
  const live = useShipperShipments();
  const rows = preview ? SHIPMENTS : live.rows;
  const mounted = useSyncExternalStore(mountedSubscribe, mountedSnapshot, mountedServerSnapshot);
  /* The gallery draws P4.4 after the bill is paid, so its limit has the 300.00 back. */
  const usedBefore = preview ? (localState === "P4.4" ? 2100000000n : 2400000000n) : live.used;
  const record = preview
    ? localState === "P4.4"
      ? { onTime: 10, total: 10 }
      : { onTime: 9, total: 9 }
    : live.record;
  /* P3.13 draws the covered bill, which only the gallery has. */
  const row = (
    preview
      ? [...(localState === "P3.13" ? [COVERED_SHIPMENT] : SHIPMENTS), LATE_SHIPMENT]
      : live.all
  ).find((r) => r.shipment.id === shipmentId);
  /* On real routes the detail screen follows the shipment's status, not the link it came from. */
  const state =
    !preview && row && (localState.startsWith("P3") || localState.startsWith("P4"))
      ? detailState(localState, row.shipment.status, shipmentId === 1041 && delivery === "settled")
      : localState;
  const go = (next: ShipperState) => {
    const href = routeFor(next, shipmentId);
    if (!preview && pathname !== href) {
      router.push(
        next === "P5.3"
          ? `${href}?invite=driver`
          : next === "P5.4"
            ? `${href}?invite=destination`
            : href,
      );
      return;
    }
    setState(next);
  };
  const open = (id: number, pay = false) => {
    if (preview) {
      go(pay ? "P4.1" : "P3.2");
      return;
    }
    router.push(`/shipper/shipments/${id}${pay ? "?pay=on" : ""}`);
  };
  if (!preview && shipmentId >= 1045 && !row) {
    if (!mounted)
      return (
        <RoleShell role="shipper" current="/shipper/shipments" detail>
          <ShipmentRowSkeleton className="w-full" />
        </RoleShell>
      );
    notFound();
  }
  const shipment = {
    ...SHIPPER_FIXTURES[state],
    ...(preview ? {} : row?.shipment),
    id: shipmentId,
  };
  const detail = state.startsWith("P2") || state.startsWith("P3") || state.startsWith("P4");
  const current = state.startsWith("P5")
    ? "/shipper/network"
    : detail || state.startsWith("P6")
      ? "/shipper/shipments"
      : "/shipper";
  return (
    <RoleShell role="shipper" current={current} detail={detail}>
      {detail && (
        <div className="mb-24">
          <BackLink onClick={() => go("P6.1")}>Shipments</BackLink>
        </div>
      )}
      {state.startsWith("P1") ? (
        <ShipperHome
          state={state}
          go={go}
          open={open}
          usedBefore={usedBefore}
          rows={rows}
          record={record}
        />
      ) : state.startsWith("P2") ? (
        <NewShipment
          key={mounted ? "restored" : "server"}
          persist={!preview && mounted}
          usedBefore={usedBefore}
          state={state}
          go={go}
          onApproved={(draft) => {
            setRecorded("Demo shipment approval");
            if (preview) go("P3.1");
            else {
              const created = createDemoShipment(draft);
              router.push(`/shipper/shipments/${created.shipment.id}?approved=on`);
            }
          }}
        />
      ) : state.startsWith("P3") || state.startsWith("P4") ? (
        <ShipperDetail
          trip={row}
          state={state}
          usedBefore={usedBefore}
          record={record}
          shipment={shipment}
          go={go}
          preview={preview}
          recorded={recorded}
          cancelledAt={live.store.cancelled[shipmentId]}
          onCancel={() => {
            if (!preview) {
              if (cancelDemoShipment(shipment.id)) setRecorded("Demo cancellation receipt");
            } else {
              setRecorded("Demo cancellation receipt");
              go("P3.12");
            }
          }}
        />
      ) : state.startsWith("P5") ? (
        <ShipperNetwork state={state} go={go} />
      ) : state.startsWith("P7") ? (
        <ShipperCredit state={state} go={go} usedBefore={usedBefore} />
      ) : (
        <ShipperShipments state={state} rows={rows} go={go} onOpen={open} recorded={recorded} />
      )}
      <p className="mt-24 text-center text-caption text-ds-muted">
        This demo uses sample data. It does not move money.
      </p>
    </RoleShell>
  );
}
