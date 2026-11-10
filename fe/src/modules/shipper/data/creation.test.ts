import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cancelDemoShipment,
  createDemoShipment,
  paidRecord,
  readShipperStore,
  repayDemoShipment,
  shipperCreditUsed,
  shipperRows,
} from "../hooks/useShipperShipments";
import type { ShipmentDraft } from "./form";
let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  vi.stubGlobal("window", new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());
const draft: ShipmentDraft = {
  driver: "Sam",
  destination: "Harbor Hub",
  cargo: "120 crates of coffee",
  fee: "100.00",
  due: "2026-12-11",
};
it("assigns a new id and keeps earlier approved fees unchanged", () => {
  const first = createDemoShipment(draft),
    second = createDemoShipment({ ...draft, fee: "150.00" });
  expect(first.shipment.id).toBe(1045);
  expect(second.shipment.id).toBe(1046);
  const saved = JSON.parse(values.get("waybil-demo-created-v1")!);
  expect(saved[0].shipment.bill).toBe("150000000");
  expect(saved[1].shipment.bill).toBe("100000000");
});
it("reserves the credit of approved trips and releases it on cancellation", () => {
  const first = createDemoShipment({ ...draft, fee: "500.00" });
  expect(() => createDemoShipment({ ...draft, fee: "100.01" })).toThrow("Invalid draft");
  cancelDemoShipment(first.shipment.id);
  expect(createDemoShipment({ ...draft, fee: "600.00" }).shipment.bill).toBe("600000000");
});
it("releases a fixture bill on cancellation and refuses shipments already on the road", () => {
  expect(cancelDemoShipment(1041)).toBe(false);
  expect(() => createDemoShipment({ ...draft, fee: "600.01" })).toThrow("Invalid draft");
  expect(cancelDemoShipment(1044)).toBe(true);
  const rows = shipperRows(readShipperStore());
  expect(rows.find((r) => r.shipment.id === 1044)?.shipment.status).toBe("Cancelled");
  expect(createDemoShipment({ ...draft, fee: "810.00" }).shipment.bill).toBe("810000000");
});
it("pays only bills whose driver was paid early and keeps the result for every shipment", () => {
  expect(repayDemoShipment(1044)).toBe(false);
  expect(repayDemoShipment(1041)).toBe(false);
  const before = readShipperStore();
  expect(shipperCreditUsed(shipperRows(before), before)).toBe(2400000000n);
  expect(repayDemoShipment(1039)).toBe(true);
  expect(repayDemoShipment(1039)).toBe(false);
  const store = readShipperStore();
  const rows = shipperRows(store);
  expect(rows.find((r) => r.shipment.id === 1039)?.shipment.status).toBe("Repaid");
  expect(shipperCreditUsed(rows, store)).toBe(2280000000n);
  expect(paidRecord(rows)).toEqual({ onTime: 10, total: 10 });
});
it("follows the warehouse confirmation for #1041", () => {
  values.set("waybil-demo-delivery-v1", "paid");
  let rows = shipperRows(readShipperStore());
  expect(rows.find((r) => r.shipment.id === 1041)?.shipment.status).toBe("Paid");
  expect(repayDemoShipment(1041)).toBe(true);
  const store = readShipperStore();
  rows = shipperRows(store);
  expect(rows.find((r) => r.shipment.id === 1041)?.shipment.status).toBe("Repaid");
  expect(shipperCreditUsed(rows, store)).toBe(2100000000n);
});
