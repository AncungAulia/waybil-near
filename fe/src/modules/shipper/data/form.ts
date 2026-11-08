import { advanceFor, parseUsdc } from "@waybil/shared";
import { demoShipment } from "@/lib/demo-delivery";
import type { DemoShipmentRow } from "./fixtures";

export const DEMO_TODAY = "2026-11-12";
export interface ShipmentDraft {
  driver: string;
  destination: string;
  cargo: string;
  fee: string;
  due: string;
}
export function draftNumbers(draft: ShipmentDraft, usedBefore = 2400000000n) {
  let bill = 0n;
  try {
    bill = parseUsdc(draft.fee);
  } catch {
    /* An incomplete amount has no summary yet. */
  }
  const qty = /^(\d+)\s+([a-z]+)/i.exec(draft.cargo.trim());
  const days = (Date.parse(draft.due) - Date.parse(DEMO_TODAY)) / 86400000;
  const valid =
    ["Sam", "Jordan Lee"].includes(draft.driver) &&
    ["Harbor Hub", "Millbrook depot"].includes(draft.destination) &&
    !!qty &&
    Number(qty[1]) > 0 &&
    Number.isSafeInteger(Number(qty[1])) &&
    Number(qty[1]) <= 0xffffffff &&
    bill > 0n &&
    days > 0 &&
    days <= 60;
  return {
    bill,
    advance: advanceFor(bill),
    used: usedBefore + bill,
    left: 3000000000n - usedBefore - bill,
    valid,
    over: bill > 3000000000n - usedBefore,
  };
}

export function shipmentFromDraft(
  draft: ShipmentDraft,
  id = 1045,
  usedBefore = 2400000000n,
): DemoShipmentRow {
  const numbers = draftNumbers(draft, usedBefore);
  if (!numbers.valid || numbers.over) throw new Error("Invalid draft");
  const cargo = /^(\d+)\s+([a-z]+)/i.exec(draft.cargo.trim())!;
  return {
    shipment: {
      ...demoShipment("Approved"),
      id,
      driver: draft.driver === "Sam" ? "sam.users.waybil.testnet" : "jordan.users.waybil.testnet",
      destination: draft.destination === "Harbor Hub" ? 1 : 3,
      qty: Number(cargo[1]),
      unit: cargo[2]!,
      bill: numbers.bill.toString(),
      advance: numbers.advance.toString(),
      due_at: (BigInt(Date.parse(draft.due)) * 1000000n).toString(),
    },
    city: draft.destination === "Harbor Hub" ? "Harbor City" : "Millbrook",
    driver: draft.driver,
    cargo: draft.cargo,
    due: `Due ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(draft.due))}`,
  };
}
