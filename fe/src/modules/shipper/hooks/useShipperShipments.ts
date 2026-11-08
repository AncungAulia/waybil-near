"use client";
import { useMemo, useSyncExternalStore } from "react";
import { SHIPMENTS, type DemoShipmentRow } from "../data/fixtures";
import { shipmentFromDraft, type ShipmentDraft } from "../data/form";
import {
  demoCreditUsed,
  readDemoDelivery,
  readDemoSettlementJson,
  parseDemoSettlement,
} from "@/lib/demo-delivery";
const CANCELLED = "waybil-demo-cancelled-v1",
  CREATED = "waybil-demo-created-v1";
function read(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function snapshot() {
  return JSON.stringify([read(CANCELLED), read(CREATED)]);
}
function ids(json: string): number[] {
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v)
      ? v.filter(
          (id): id is number =>
            typeof id === "number" &&
            Number.isSafeInteger(id) &&
            ([1041, 1044].includes(id) || id >= 1045),
        )
      : [];
  } catch {
    return [];
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
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("waybil-demo-delivery", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("waybil-demo-delivery", notify);
  };
}
export function useShipperShipments() {
  const json = useSyncExternalStore(subscribe, snapshot, () => '["",""]');
  return useMemo(() => {
    const [cancelledJson, createdJson] = JSON.parse(json) as [string, string];
    const extra = created(createdJson);
    const cancelled = ids(cancelledJson);
    return [...extra, ...SHIPMENTS].map((row) =>
      cancelled.includes(row.shipment.id)
        ? { ...row, shipment: { ...row.shipment, status: "Cancelled" as const }, due: "Cancelled" }
        : row,
    );
  }, [json]);
}
export function cancelDemoShipment(id: number) {
  localStorage.setItem(CANCELLED, JSON.stringify([...new Set([...ids(read(CANCELLED)), id])]));
  window.dispatchEvent(new Event("waybil-demo-delivery"));
}
export function createDemoShipment(draft: ShipmentDraft) {
  const previous = created(read(CREATED));
  const cancelled = ids(read(CANCELLED));
  const committed = previous
    .filter((row) => !cancelled.includes(row.shipment.id))
    .reduce((sum, row) => sum + BigInt(row.shipment.bill), 0n);
  const id = Math.max(1044, ...previous.map((row) => row.shipment.id)) + 1;
  const row = shipmentFromDraft(
    draft,
    id,
    demoCreditUsed(
      readDemoDelivery(),
      parseDemoSettlement(readDemoSettlementJson()).bill,
      committed,
    ),
  );
  localStorage.setItem(CREATED, JSON.stringify([row, ...previous]));
  window.dispatchEvent(new Event("waybil-demo-delivery"));
  return row;
}
