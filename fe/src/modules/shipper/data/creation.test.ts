import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDemoShipment, cancelDemoShipment } from "../hooks/useShipperShipments";
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
