import { billForDriverAmount, driverAmountForGoodUnits, type Shipment } from "@waybil/shared";
import { demoShipment } from "@/lib/demo-delivery";

export const DRIVER_STATES = {
  "K1.1": "Trips",
  "K1.2": "Just got paid",
  "K1.3": "No trips yet",
  "K2.1": "Waiting for pickup",
  "K2.2": "Confirm pickup",
  "K2.3": "Location permission",
  "K2.4": "On the road",
  "K2.5": "Show QR",
  "K2.6": "Sending the money",
  "K2.7": "Taking longer",
  "K2.8": "Paid",
  "K2.9": "Problem reported",
  "K2.10": "Problem report",
  "K2.11": "Report settled",
  "K2.12": "Problem on the road",
  "K2.13": "No signal",
  "K3.1": "Payouts",
  "K3.2": "No payouts yet",
  "K3.3": "Companies",
  "K3.4": "New company invite",
} as const;
export type DriverState = keyof typeof DRIVER_STATES;

export const DRIVER_FIXTURES = Object.fromEntries(
  Object.keys(DRIVER_STATES).map((code) => [
    code,
    demoShipment(
      ["K2.1", "K2.2", "K2.3"].includes(code)
        ? "Approved"
        : ["K2.9", "K2.10"].includes(code)
          ? "Reported"
          : ["K1.2", "K2.8", "K2.11", "K3.1"].includes(code)
            ? "Paid"
            : "PickedUp",
      ["K1.2", "K2.6", "K2.7", "K2.8", "K2.9", "K2.10", "K2.11"].includes(code),
    ),
  ]),
) as Record<DriverState, Shipment>;

const settled = DRIVER_FIXTURES["K2.11"];
const settledAmount = driverAmountForGoodUnits(BigInt(settled.bill), 112, settled.qty);
DRIVER_FIXTURES["K2.11"] = {
  ...settled,
  advance: settledAmount.toString(),
  bill: billForDriverAmount(settledAmount).toString(),
  good_qty: 112,
};
