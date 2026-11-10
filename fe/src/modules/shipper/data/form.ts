import { advanceFor, parseUsdc } from "@waybil/shared";
import { demoShipment } from "@/lib/demo-delivery";
import type { DemoShipmentRow } from "./fixtures";
import { DEMO_TODAY } from "./dates";

export { DEMO_TODAY };
/** An amount with at most two decimals, the way the fee field reads it. */
const FEE = /^\d+(\.\d{1,2})?$/;
const CARGO = /^(\d+)\s+([a-z]+)/i;
export interface ShipmentDraft {
  driver: string;
  destination: string;
  cargo: string;
  fee: string;
  due: string;
}
export function draftNumbers(draft: ShipmentDraft, usedBefore = 2400000000n) {
  let bill = 0n;
  const fee = draft.fee.trim();
  if (FEE.test(fee)) {
    try {
      bill = parseUsdc(fee);
    } catch {
      /* An incomplete amount has no summary yet. */
    }
  }
  const qty = CARGO.exec(draft.cargo.trim());
  const days = (Date.parse(draft.due) - Date.parse(DEMO_TODAY)) / 86400000;
  const cargoValid =
    !!qty &&
    Number(qty[1]) > 0 &&
    Number.isSafeInteger(Number(qty[1])) &&
    Number(qty[1]) <= 0xffffffff;
  const feeValid = bill > 0n;
  const valid =
    ["Sam", "Jordan Lee"].includes(draft.driver) &&
    ["Harbor Hub", "Millbrook depot"].includes(draft.destination) &&
    cargoValid &&
    feeValid &&
    days > 0 &&
    days <= 60;
  return {
    /** Something is typed in the field and it can't be read. Empty fields are just unfinished. */
    cargoError: !!draft.cargo.trim() && !cargoValid,
    feeError: !!fee && !feeValid,
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
  const cargo = CARGO.exec(draft.cargo.trim())!;
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
