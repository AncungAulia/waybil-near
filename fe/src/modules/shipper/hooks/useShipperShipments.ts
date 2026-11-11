"use client";
import { useMemo, useSyncExternalStore } from "react";
import { LATE_SHIPMENT, SHIPMENTS, type DemoShipmentRow } from "../data/fixtures";
import { shipmentFromDraft, type ShipmentDraft } from "../data/form";
import { DEMO_NOW, nanos, shortDate } from "../data/dates";
import {
  demoCreditUsed,
  demoShipment,
  parseDemoSettlement,
  readDemoDelivery,
  readDemoSettlementJson,
  repayDemoBill,
  type DemoDelivery,
  type DemoSettlement,
} from "@/lib/demo-delivery";

/*
 * The shipper's demo state lives in localStorage, next to the delivery story that the
 * driver and warehouse tabs share. Rows, the credit used and the on-time record are all
 * derived from it, so Home, Shipments, the detail screen and Credit always agree.
 */
const CANCELLED = "waybil-demo-cancelled-v1",
  CANCELLED_AT = "waybil-demo-cancelled-at-v1",
  CREATED = "waybil-demo-created-v1",
  REPAID = "waybil-demo-repaid-v1";
/** Only shipments that are still waiting for pickup can be cancelled (contract.md). */
const CANCELLABLE = (id: number) => id === 1044 || id >= 1045;
/** Bills the shipper can pay from the fixtures. #1041 follows the delivery story instead. */
const REPAYABLE = (id: number) => id === 1039 || id === 1036;

export interface ShipperStore {
  created: DemoShipmentRow[];
  /** When each cancelled shipment was cancelled, in milliseconds. */
  cancelled: Record<number, number>;
  repaid: number[];
  delivery: DemoDelivery;
  settlement: DemoSettlement;
}

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function ids(json: string, allowed: (id: number) => boolean): number[] {
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v)
      ? v.filter(
          (id): id is number => typeof id === "number" && Number.isSafeInteger(id) && allowed(id),
        )
      : [];
  } catch {
    return [];
  }
}
function times(json: string): Record<string, number> {
  try {
    const v: unknown = JSON.parse(json);
    if (!v || typeof v !== "object") return {};
    return Object.fromEntries(
      Object.entries(v).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && Number.isFinite(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}
function created(json: string): DemoShipmentRow[] {
  try {
    const data = JSON.parse(json) as DemoShipmentRow[] | DemoShipmentRow;
    return (Array.isArray(data) ? data : [data]).filter(
      (row) =>
        row &&
        row.shipment &&
        Number.isSafeInteger(row.shipment.id) &&
        row.shipment.id >= 1045 &&
        Number.isSafeInteger(row.shipment.qty) &&
        row.shipment.qty > 0 &&
        /^\d+$/.test(row.shipment.bill) &&
        /^\d+$/.test(row.shipment.advance) &&
        typeof row.city === "string" &&
        typeof row.driver === "string" &&
        typeof row.cargo === "string",
    );
  } catch {
    return [];
  }
}
const DELIVERY_VALUES: string[] = ["road", "paid", "reported", "settled", "repaid"];
function parseStore(parts: string[]): ShipperStore {
  const [cancelledJson = "", cancelledAtJson = "", createdJson = "", repaidJson = ""] = parts;
  const [delivery = "road", settlement = ""] = parts.slice(4);
  const at = times(cancelledAtJson);
  return {
    created: created(createdJson),
    cancelled: Object.fromEntries(
      ids(cancelledJson, CANCELLABLE).map((id) => [id, at[id] ?? DEMO_NOW]),
    ),
    repaid: ids(repaidJson, REPAYABLE),
    delivery: (DELIVERY_VALUES.includes(delivery) ? delivery : "road") as DemoDelivery,
    settlement: parseDemoSettlement(settlement),
  };
}
function snapshotParts() {
  return [
    read(CANCELLED),
    read(CANCELLED_AT),
    read(CREATED),
    read(REPAID),
    readDemoDelivery(),
    readDemoSettlementJson(),
  ];
}
export function readShipperStore() {
  return parseStore(snapshotParts());
}

/** The moment fields a status brings with it, taken from the shared demo shipment. */
function withStatus(row: DemoShipmentRow, status: Parameters<typeof demoShipment>[0]) {
  const { picked_up_at, arrived_at, paid_at, good_qty } = demoShipment(status);
  return {
    ...row,
    shipment: {
      ...row.shipment,
      status,
      picked_up_at,
      arrived_at,
      paid_at,
      good_qty,
      repaid_at: status === "Repaid" ? nanos(DEMO_NOW) : null,
    },
    due: status === "Repaid" ? `Paid ${shortDate(DEMO_NOW)}` : row.due,
  };
}

/** Every shipment the shipper has, as the stored demo state leaves it. Includes #1036. */
export function shipperRows(store: ShipperStore): DemoShipmentRow[] {
  return [...store.created, ...SHIPMENTS, LATE_SHIPMENT].map((row) => {
    const id = row.shipment.id;
    if (store.cancelled[id] !== undefined && row.shipment.status === "Approved")
      return { ...withStatus(row, "Cancelled"), due: "Cancelled" };
    if (store.repaid.includes(id) && row.shipment.status === "Paid")
      return withStatus(row, "Repaid");
    if (id !== 1041 || store.delivery === "road") return row;
    const next = withStatus(
      row,
      store.delivery === "reported" ? "Reported" : store.delivery === "repaid" ? "Repaid" : "Paid",
    );
    /* A settled report pays the driver and gives the bill its new amount (contract.md). */
    const settled =
      store.delivery === "settled" || (store.delivery === "repaid" && store.settlement.active);
    return settled
      ? {
          ...next,
          shipment: {
            ...next.shipment,
            bill: store.settlement.bill,
            advance: store.settlement.amount,
          },
        }
      : next;
  });
}

const OPEN_FIXTURES = SHIPMENTS.filter(
  (row) => row.shipment.id !== 1041 && !["Repaid", "Cancelled"].includes(row.shipment.status),
);
/** How much of the limit is in use. The open fixture bills are part of the 2,400.00 start. */
export function shipperCreditUsed(rows: DemoShipmentRow[], store: ShipperStore) {
  const committed = rows
    .filter((row) => row.shipment.id >= 1045 && row.shipment.status === "Approved")
    .reduce((sum, row) => sum + BigInt(row.shipment.bill), 0n);
  const freed = OPEN_FIXTURES.filter((fixture) => {
    const live = rows.find((row) => row.shipment.id === fixture.shipment.id);
    return live && ["Repaid", "Cancelled"].includes(live.shipment.status);
  }).reduce((sum, row) => sum + BigInt(row.shipment.bill), 0n);
  return demoCreditUsed(store.delivery, store.settlement.bill, committed) - freed;
}

/** The on-time record. Nine bills were paid on time before the demo starts. */
export function paidRecord(rows: DemoShipmentRow[]) {
  const before = new Set(
    SHIPMENTS.filter((row) => row.shipment.status === "Repaid").map((row) => row.shipment.id),
  );
  const paidNow = rows.filter(
    (row) => row.shipment.status === "Repaid" && !before.has(row.shipment.id),
  );
  const onTime = paidNow.filter(
    (row) => BigInt(row.shipment.repaid_at ?? "0") <= BigInt(row.shipment.due_at),
  ).length;
  return { onTime: 9 + onTime, total: 9 + paidNow.length };
}

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("waybil-demo-delivery", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("waybil-demo-delivery", notify);
  };
}
const snapshot = () => JSON.stringify(snapshotParts());
const SERVER = JSON.stringify(["", "", "", "", "road", ""]);

export function useShipperShipments() {
  const json = useSyncExternalStore(subscribe, snapshot, () => SERVER);
  return useMemo(() => {
    const store = parseStore(JSON.parse(json) as string[]);
    const all = shipperRows(store);
    return {
      /** What the lists show. The late bill #1036 only belongs to the P1.4 story. */
      rows: all.filter((row) => row.shipment.id !== LATE_SHIPMENT.shipment.id),
      all,
      store,
      used: shipperCreditUsed(all, store),
      record: paidRecord(all),
    };
  }, [json]);
}

function notify() {
  window.dispatchEvent(new Event("waybil-demo-delivery"));
}

/** Cancels a shipment that is still waiting for pickup. Returns false for any other status. */
export function cancelDemoShipment(id: number, at = Date.now()) {
  const store = readShipperStore();
  const row = shipperRows(store).find((r) => r.shipment.id === id);
  if (!CANCELLABLE(id) || row?.shipment.status !== "Approved") return false;
  localStorage.setItem(CANCELLED_AT, JSON.stringify({ ...store.cancelled, [id]: at }));
  localStorage.setItem(
    CANCELLED,
    JSON.stringify([...Object.keys(store.cancelled).map(Number), id]),
  );
  notify();
  return true;
}

/** Pays a bill. Only a shipment whose driver was paid early (status Paid) has a bill to pay. */
export function repayDemoShipment(id: number) {
  if (id === 1041) return repayDemoBill();
  const store = readShipperStore();
  const row = shipperRows(store).find((r) => r.shipment.id === id);
  if (!REPAYABLE(id) || row?.shipment.status !== "Paid") return false;
  localStorage.setItem(REPAID, JSON.stringify([...store.repaid, id]));
  notify();
  return true;
}

export function createDemoShipment(draft: ShipmentDraft) {
  const store = readShipperStore();
  const id = Math.max(1044, ...store.created.map((row) => row.shipment.id)) + 1;
  const row = shipmentFromDraft(draft, id, shipperCreditUsed(shipperRows(store), store));
  localStorage.setItem(CREATED, JSON.stringify([row, ...store.created]));
  notify();
  return row;
}
