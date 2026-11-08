import { advanceFor, parseUsdc, type Shipment } from "@waybil/shared";

/** Fictional shipment from demo-data.md. No transaction is submitted by this transport. */
export const DEMO_CODE = "7K2Q9F4M";
export const DEMO_SHIPMENT: Shipment = {
  id: 1041,
  shipper: "northwind-freight.testnet",
  driver: "sam.users.waybil.testnet",
  destination: 1,
  qty: 120,
  unit: "crates",
  bill: parseUsdc("300").toString(),
  advance: advanceFor(parseUsdc("300")).toString(),
  due_at: "1797033600000000000",
  status: "PickedUp",
  approved_at: "1794470520000000000",
  picked_up_at: "1794474840000000000",
  arrived_at: null,
  good_qty: null,
  report_hash: null,
  paid_at: null,
  repaid_at: null,
  marked_late: false,
};

export function demoShipment(status: Shipment["status"], arrived = false): Shipment {
  return {
    ...DEMO_SHIPMENT,
    status,
    picked_up_at: status === "Approved" ? null : DEMO_SHIPMENT.picked_up_at,
    arrived_at: arrived ? "1794497760000000000" : null,
    paid_at: status === "Paid" ? "1794497761000000000" : null,
    good_qty: status === "Reported" ? 112 : arrived ? 120 : null,
  };
}

export type DemoDelivery = "road" | "paid" | "reported";
export const DELIVERY_KEY = "waybil-demo-delivery-v1";
export const REPORT_KEY = "waybil-demo-report-v1";
export interface DemoReport {
  goodQty: number;
  reasons: string[];
  note: string;
  photos: { name: string; src: string }[];
}
export const DEFAULT_REPORT: DemoReport = {
  goodQty: 112,
  reasons: ["Damaged"],
  note: "8 crates arrived wet, 4 of them torn open.",
  photos: [],
};
export const DEFAULT_REPORT_JSON = JSON.stringify(DEFAULT_REPORT);

export function readDemoReportJson() {
  try {
    return localStorage.getItem(REPORT_KEY) ?? DEFAULT_REPORT_JSON;
  } catch {
    return DEFAULT_REPORT_JSON;
  }
}

export function parseDemoReport(json: string): DemoReport {
  try {
    const data = JSON.parse(json) as DemoReport;
    if (
      !Number.isInteger(data.goodQty) ||
      data.goodQty < 0 ||
      data.goodQty > 120 ||
      typeof data.note !== "string" ||
      !Array.isArray(data.reasons) ||
      !data.reasons.every((r) => typeof r === "string") ||
      !Array.isArray(data.photos)
    )
      return DEFAULT_REPORT;
    return {
      ...data,
      photos: data.photos.filter(
        (p) => typeof p.name === "string" && /^data:image\/(jpeg|png);base64,/.test(p.src),
      ),
    };
  } catch {
    return DEFAULT_REPORT;
  }
}

export function readDemoDelivery(): DemoDelivery {
  let saved: string | null;
  try {
    saved = localStorage.getItem(DELIVERY_KEY);
  } catch {
    return "road";
  }
  return saved === "paid" || saved === "reported" ? saved : "road";
}

/** Shared between tabs so the warehouse confirmation updates the driver's screen. */
export function confirmDemoDelivery(result: Exclude<DemoDelivery, "road">, report?: DemoReport) {
  if (readDemoDelivery() !== "road") return false;
  if (result === "reported" && report) localStorage.setItem(REPORT_KEY, JSON.stringify(report));
  localStorage.setItem(DELIVERY_KEY, result);
  window.dispatchEvent(new Event("waybil-demo-delivery"));
  return true;
}
