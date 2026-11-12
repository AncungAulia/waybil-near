import type { Shipment } from "@waybil/shared";
import { demoShipment } from "@/lib/demo-delivery";

export const WAREHOUSE_STATES = {
  "W1.1": "Arrivals",
  "W1.2": "Truck almost here",
  "W1.3": "Nothing expected",
  "W2.1": "Scan",
  "W2.2": "Camera permission",
  "W2.3": "Check and confirm",
  "W2.4": "Wrong warehouse",
  "W2.5": "Confirming",
  "W2.6": "Confirmed",
  "W2.7": "Report a problem",
  "W2.8": "Report sent",
  "W2.9": "Type code",
  "W2.10": "Code does not match",
  "W2.11": "Camera blocked",
  "W2.12": "Already confirmed",
  "W3.1": "History",
  "W3.2": "Nothing yet",
} as const;
export type WarehouseState = keyof typeof WAREHOUSE_STATES;
export const WAREHOUSE_FIXTURES = Object.fromEntries(
  Object.keys(WAREHOUSE_STATES).map((code) => [
    code,
    demoShipment(
      code === "W2.8" ? "Reported" : ["W2.6", "W2.12", "W3.1"].includes(code) ? "Paid" : "PickedUp",
      ["W2.6", "W2.8", "W2.12", "W3.1"].includes(code),
    ),
  ]),
) as Record<WarehouseState, Shipment>;

/** The code the board types for W2.10 (one wrong character) and the half-typed W2.9 code. */
export const MISMATCHED_CODE = "7K2Q9F4N";
export const PARTIAL_CODE = "7K2Q9F";
/** What Lena reports by default. */
export const DEFAULT_REASONS = ["Damaged"];
export const DEFAULT_GOOD_QTY = "112";
export const DEFAULT_REPORT_NOTE = "8 crates arrived wet, 4 of them torn open.";
/** The trucks expected today, as driver, shipment and arrival time. */
export const EXPECTED_ARRIVALS = [
  ["Sam from Eastport", "Northwind sends 120 crates of coffee on #1041.", "in 1 h 20 min"],
  ["Jordan Lee from Riverton", "Blue Ridge sends 80 sacks of sugar on #1047.", "in 2 h 40 min"],
  ["Chris Novak from Millbrook", "Northwind sends 40 crates of eggs on #1050.", "Not left yet"],
] as const;
/** Sam's arrival time once the truck is almost here (W1.2). */
export const ARRIVING_SOON = "in 5 min";
/** Deliveries received at Harbor Hub, as id, from, driver, cargo, status and time. */
export const HISTORY = [
  ["1041", "Eastport", "Sam", "120 of 120 crates", "Confirmed", "Today, 15:36"],
  ["1038", "Riverton", "Jordan Lee", "72 of 80 sacks", "Problem reported", "Nov 10, 11:02"],
  ["1035", "Millbrook", "Chris Novak", "40 of 40 crates", "Confirmed", "Nov 9, 16:45"],
  ["1030", "Eastport", "Sam", "100 of 100 sacks", "Confirmed", "Nov 7, 09:20"],
] as const;
