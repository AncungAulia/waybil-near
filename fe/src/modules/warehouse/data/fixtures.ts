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
