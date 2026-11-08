import { describe, expect, it } from "vitest";
import { draftNumbers, shipmentFromDraft, type ShipmentDraft } from "./form";
const draft: ShipmentDraft = {
  driver: "Sam",
  destination: "Harbor Hub",
  cargo: "120 crates of coffee",
  fee: "300.00",
  due: "2026-12-11",
};
describe("shipment drafts", () => {
  it("preserves the cargo, fee, destination and due date when approved", () => {
    const row = shipmentFromDraft({
      ...draft,
      driver: "Jordan Lee",
      destination: "Millbrook depot",
      cargo: "80 sacks of sugar",
      fee: "450.25",
    });
    expect(row.shipment).toMatchObject({
      status: "Approved",
      qty: 80,
      unit: "sacks",
      bill: "450250000",
      advance: "438993750",
      due_at: "1796947200000000000",
    });
    expect(row.driver).toBe("Jordan Lee");
    expect(row.city).toBe("Millbrook");
  });
  it("allows the remaining limit exactly and rejects even one extra base unit", () => {
    expect(draftNumbers({ ...draft, fee: "600.00" }).over).toBe(false);
    expect(() => shipmentFromDraft({ ...draft, fee: "600.000001" })).toThrow("Invalid draft");
  });
  it("rejects an unjoined driver, an unlinked place, missing counts and dates beyond 60 days", () => {
    for (const invalid of [
      { driver: "Chris Novak" },
      { destination: "Riverton branch" },
      { cargo: "coffee" },
      { cargo: "0 crates" },
      { due: "2026-11-12" },
      { due: "2027-01-12" },
    ])
      expect(draftNumbers({ ...draft, ...invalid }).valid).toBe(false);
    expect(draftNumbers({ ...draft, due: "2027-01-11" }).valid).toBe(true);
  });
});
