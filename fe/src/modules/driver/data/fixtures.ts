import {
  advanceFor,
  billForDriverAmount,
  driverAmountForGoodUnits,
  FEE_BPS,
  parseUsdc,
  type Shipment,
} from "@waybil/shared";
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
  "K2.14": "Trip cancelled",
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
        : code === "K2.14"
          ? "Cancelled"
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

/** The two trips Sam has in the demo. Screens read places, cargo and fee from here. */
export interface DriverTrip {
  /** Short name of the shipping company, for example "Northwind". */
  company: string;
  companyName: string;
  from: string;
  to: string;
  pickupPlace: string;
  pickupAddress: string;
  dropOff: string;
  cargo: string;
  /** The shipping fee in USDC base units. */
  fee: string;
}
export const DRIVER_TRIPS: Record<number, DriverTrip> = {
  1041: {
    company: "Northwind",
    companyName: "Northwind Freight Co.",
    from: "Eastport",
    to: "Harbor City",
    pickupPlace: "Main warehouse",
    pickupAddress: "21 Dock Road",
    dropOff: "Harbor Hub, 9 Pier Street",
    cargo: "120 crates of coffee",
    fee: "300000000",
  },
  1044: {
    company: "Northwind",
    companyName: "Northwind Freight Co.",
    from: "Eastport",
    to: "Westfield",
    pickupPlace: "Main warehouse",
    pickupAddress: "21 Dock Road",
    dropOff: "Westfield",
    cargo: "60 boxes of oil",
    fee: "210000000",
  },
};
/** When the shipper cancelled the trip on the K2.14 board: Nov 12, 09:40 UTC. */
export const DRIVER_CANCELLED_AT = Date.UTC(2026, 10, 12, 9, 40);

/** Sam's on-the-road trip, and the second trip that waits for pickup. */
export const MAIN_TRIP_ID = 1041;
export const WESTFIELD_TRIP_ID = 1044;
/* The Westfield trip's bill. What Sam gets comes from the shared fee split. */
export const WESTFIELD_BILL = parseUsdc("210");
export const WESTFIELD_ADVANCE = advanceFor(WESTFIELD_BILL).toString();
/** The code under the Westfield QR, and how it is shown to the warehouse. */
export const WESTFIELD_CODE = "WSTF1044";
export const WESTFIELD_CODE_LABEL = "WSTF 1044";
/** How the main trip's code is shown under its QR. */
export const DEMO_CODE_LABEL = "7K2Q 9F4M";
/* The driver's part of each bill, for example "97.5%". */
export const DRIVER_PERCENT = `${Number(FEE_BPS.driver) / 100}%`;
export const HARBOR_HUB_MAPS =
  "https://www.google.com/maps/search/?api=1&query=Harbor+Hub+9+Pier+Street";
/** What Sam got for #1041 when nothing was reported, in USDC base units. */
export const MAIN_TRIP_PAYOUT = "292500000";
/** Paid to Sam this month before #1041, and what was in the wallet then. */
export const MONTH_PAID_BEFORE = 604500000n;
export const WALLET_BEFORE = 992100000n;
/** Sample payouts as id, city, date, amount in USDC base units and company. */
export const PAYOUTS = [
  ["1041", "Harbor City", "Nov 12", MAIN_TRIP_PAYOUT, "Northwind"],
  ["1039", "Millbrook", "Nov 11", "117000000", "Northwind"],
  ["1032", "Riverton", "Nov 8", "292500000", "Northwind"],
  ["1027", "Oakdale", "Nov 1", "195000000", "Blue Ridge"],
] as const;
/** The companies Sam works with before Atlas Cargo's invite. */
export const CONNECTED_COMPANIES = ["Northwind Freight Co.", "Blue Ridge"];
/** The problem Sam reports from the road by default. */
export const DEFAULT_PROBLEM = "Running late";
export const DEFAULT_PROBLEM_NOTE = "Traffic jam near Pine Ridge. About 1 hour late.";
