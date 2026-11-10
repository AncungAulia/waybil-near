"use client";
import { useState, useSyncExternalStore } from "react";
import { notFound, usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { RoleShell } from "@/components/layout/RoleShell";
import { ShipmentRowSkeleton } from "@/components/elements/ShipmentRow";
import { useDemoDelivery, useDemoSettlement } from "@/hooks/useDemoDelivery";
import { demoCreditUsed } from "@/lib/demo-delivery";
import { ShipperHome } from "./ShipperHome";
import { NewShipment } from "./NewShipment";
import { ShipperDetail } from "./ShipperDetail";
import { ShipperNetwork } from "./ShipperNetwork";
import { ShipperCredit } from "./ShipperCredit";
import { ShipperShipments } from "./ShipperShipments";
import { SHIPMENTS, SHIPPER_FIXTURES, type ShipperState } from "../data/fixtures";
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
    delivery = useDemoDelivery(),
    settlement = useDemoSettlement();
  const liveRows = useShipperShipments();
  const rows = preview ? SHIPMENTS : liveRows;
  const mounted = useSyncExternalStore(mountedSubscribe, mountedSnapshot, mountedServerSnapshot);
  const committed = preview
    ? 0n
    : rows
        .filter((row) => row.shipment.id >= 1045 && row.shipment.status === "Approved")
        .reduce((sum, row) => sum + BigInt(row.shipment.bill), 0n);
  const usedBefore = preview ? 2400000000n : demoCreditUsed(delivery, settlement.bill, committed);
  let state = localState;
  if (!preview && shipmentId === 1041 && ["P3.2", "P3.3", "P3.4", "P3.6", "P3.9"].includes(state)) {
    if (delivery === "paid") state = "P3.4";
    else if (delivery === "reported") state = "P3.6";
    else if (delivery === "settled") state = "P3.9";
    else if (delivery === "repaid") state = "P3.5";
  }
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
  const row = rows.find((r) => r.shipment.id === shipmentId);
  if (!preview && shipmentId >= 1045 && !row) {
    if (!mounted)
      return (
        <RoleShell role="shipper" current="/shipper/shipments" detail>
          <ShipmentRowSkeleton className="w-full" />
        </RoleShell>
      );
    notFound();
  }
  let shipment = { ...SHIPPER_FIXTURES[state], ...(preview ? {} : row?.shipment), id: shipmentId };
  if (!preview && shipmentId === 1036)
    shipment = { ...shipment, status: "Paid", marked_late: true };
  if (
    !preview &&
    shipmentId === 1041 &&
    (delivery === "settled" || (delivery === "repaid" && settlement.active))
  )
    shipment = { ...shipment, bill: settlement.bill, advance: settlement.amount };
  const detail = state.startsWith("P2") || state.startsWith("P3") || state.startsWith("P4");
  const current = state.startsWith("P5")
    ? "/shipper/network"
    : detail || state.startsWith("P6")
      ? "/shipper/shipments"
      : "/shipper";
  return (
    <RoleShell role="shipper" current={current} detail={detail}>
      {detail && (
        <button
          className="press focus-ring mb-24 flex items-center gap-8 rounded-small text-label text-ds-muted"
          onClick={() => go("P6.1")}
        >
          <ArrowLeft size={18} />
          Shipments
        </button>
      )}
      {state.startsWith("P1") ? (
        <ShipperHome state={state} go={go} open={open} usedBefore={usedBefore} />
      ) : state.startsWith("P2") ? (
        <NewShipment
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
          trip={preview ? undefined : row}
          state={state}
          shipment={shipment}
          go={go}
          preview={preview}
          recorded={recorded}
          onCancel={() => {
            if (!preview) {
              cancelDemoShipment(shipment.id);
              router.push(`/shipper/shipments?cancelled=${shipment.id}`);
            } else {
              setRecorded("Demo cancellation receipt");
              go("P6.1");
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
