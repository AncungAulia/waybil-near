import { advanceFor, parseUsdc, type Shipment } from "@waybil/shared";
import { demoShipment } from "@/lib/demo-delivery";
import { nanos } from "./dates";

export const SHIPPER_STATES = {
  "P1.1": "Home",
  "P1.2": "Home, first visit",
  "P1.3": "Near the limit",
  "P1.4": "Late bill",
  "P2.1": "Empty",
  "P2.2": "Choose a driver",
  "P2.3": "Choose a destination",
  "P2.4": "Due date",
  "P2.5": "Ready to approve",
  "P2.6": "Over the limit",
  "P2.7": "Waiting for wallet",
  "P3.1": "Approved",
  "P3.2": "On the road",
  "P3.3": "Location paused",
  "P3.4": "Arrived, paid early",
  "P3.5": "Repaid",
  "P3.6": "Problem reported",
  "P3.7": "Problem report",
  "P3.8": "Settle the report",
  "P3.10": "Settle, different amount",
  "P3.9": "Settled",
  "P3.11": "Cancel shipment",
  "P3.12": "Cancelled",
  "P3.13": "Covered by reserve",
  "P4.1": "Pay",
  "P4.2": "Approving in wallet",
  "P4.3": "Not enough USDC",
  "P4.4": "Paid",
  "P5.1": "Network",
  "P5.2": "Empty network",
  "P5.3": "Invite a driver",
  "P5.4": "Add a destination",
  "P6.1": "All shipments",
  "P6.2": "Filtered: bills due",
  "P6.3": "No results",
  "P6.4": "Loading",
  "P7.1": "Credit",
  "P7.2": "Agent is reviewing",
  "P7.3": "Waiting for the team",
  "P7.4": "Limit stays the same",
  "P7.5": "Team said no",
} as const;
export type ShipperState = keyof typeof SHIPPER_STATES;

export interface DemoShipmentRow {
  shipment: Shipment;
  city: string;
  driver: string;
  cargo: string;
  due: string;
  /** When the team covered the bill from the reserve, in nanoseconds (the reserve_cover event). */
  covered?: string;
}
/* Each row keeps its own due date, so "Due in 2 days" and the detail screen agree. */
export const SHIPMENTS: DemoShipmentRow[] = [
  [
    1044,
    "Westfield",
    "Sam",
    "60 boxes of oil",
    "210",
    "Approved",
    "Not picked up yet",
    "2026-12-14",
  ],
  [
    1043,
    "Riverton",
    "Jordan Lee",
    "80 sacks of sugar",
    "150",
    "PickedUp",
    "Due Dec 13",
    "2026-12-13",
  ],
  [
    1041,
    "Harbor City",
    "Sam",
    "120 crates of coffee",
    "300",
    "PickedUp",
    "Due Dec 11",
    "2026-12-11",
  ],
  [1039, "Millbrook", "Sam", "40 crates of eggs", "120", "Paid", "Due in 2 days", "2026-11-14"],
  [1032, "Riverton", "Sam", "100 sacks of flour", "300", "Repaid", "Paid Nov 9", "2026-11-10"],
].map(([id, city, driver, cargo, bill, status, due, dueDate]) => {
  const base = demoShipment(status as Shipment["status"], status === "Paid" || status === "Repaid");
  return {
    shipment: {
      ...base,
      id: Number(id),
      qty: Number(String(cargo).split(" ")[0]),
      unit: String(cargo).split(" ")[1]!,
      bill: parseUsdc(String(bill)).toString(),
      advance: advanceFor(parseUsdc(String(bill))).toString(),
      due_at: nanos(Date.parse(String(dueDate))),
      repaid_at: base.repaid_at && nanos(Date.parse("2026-11-09")),
    },
    city: String(city),
    driver: String(driver),
    cargo: String(cargo),
    due: String(due),
  };
});

/** The late bill on P1.4. It only exists in that story, so it stays out of the list. */
export const LATE_SHIPMENT: DemoShipmentRow = {
  shipment: {
    ...demoShipment("Paid"),
    id: 1036,
    qty: 100,
    unit: "sacks",
    bill: parseUsdc("300").toString(),
    advance: advanceFor(parseUsdc("300")).toString(),
    due_at: nanos(Date.parse("2026-11-09")),
    marked_late: true,
  },
  city: "Riverton",
  driver: "Sam",
  cargo: "100 sacks of rice",
  due: "3 days late",
};

/*
 * The bill on P3.13. Sam was paid early, the bill went unpaid, and 16 days after it was due
 * the team covered it from the reserve (contract.md allows that after 14 days). It only
 * exists in the gallery, so the live demo never pauses Northwind's new shipments. Its own
 * "today" is the day it was covered, so the screen reads "16 days late" as the board does.
 */
export const COVERED_TODAY = Date.parse("2026-12-27");
export const COVERED_SHIPMENT: DemoShipmentRow = {
  shipment: { ...demoShipment("CoveredByReserve"), marked_late: true },
  city: "Harbor City",
  driver: "Sam",
  cargo: "120 crates of coffee",
  due: "Covered by the reserve",
  covered: nanos(COVERED_TODAY),
};

export const SHIPPER_FIXTURES = Object.fromEntries(
  Object.keys(SHIPPER_STATES).map((code) => [
    code,
    demoShipment(
      code === "P3.1" || code === "P3.11"
        ? "Approved"
        : code === "P3.12"
          ? "Cancelled"
          : code === "P3.13"
            ? "CoveredByReserve"
            : ["P3.6", "P3.7", "P3.8", "P3.10"].includes(code)
              ? "Reported"
              : code === "P3.5" || code === "P4.4"
                ? "Repaid"
                : ["P3.4", "P3.9", "P4.1", "P4.2", "P4.3"].includes(code)
                  ? "Paid"
                  : "PickedUp",
      ["P3.4", "P3.5", "P3.6", "P3.7", "P3.8", "P3.9", "P3.10"].includes(code),
    ),
  ]),
) as Record<ShipperState, Shipment>;
