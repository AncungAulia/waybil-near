import { advanceFor, billForDriverAmount, parseUsdc, type Shipment } from "@waybil/shared";

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
  due_at: "1796947200000000000",
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
  const hasArrived = arrived || ["Reported", "Paid", "Repaid", "CoveredByReserve"].includes(status);
  return {
    ...DEMO_SHIPMENT,
    status,
    picked_up_at:
      status === "Approved" || status === "Cancelled" ? null : DEMO_SHIPMENT.picked_up_at,
    arrived_at: hasArrived ? "1794497760000000000" : null,
    paid_at: ["Paid", "Repaid", "CoveredByReserve"].includes(status) ? "1794497761000000000" : null,
    repaid_at: status === "Repaid" ? "1796860800000000000" : null,
    good_qty: status === "Reported" ? 112 : hasArrived ? 120 : null,
  };
}

export type DemoDelivery = "road" | "paid" | "reported" | "settled" | "repaid";
export function demoCreditUsed(delivery: DemoDelivery, settlementBill: string, committed = 0n) {
  const adjustment =
    delivery === "repaid"
      ? -300000000n
      : delivery === "settled"
        ? BigInt(settlementBill) - 300000000n
        : 0n;
  return 2400000000n + adjustment + committed;
}
export const DELIVERY_KEY = "waybil-demo-delivery-v1";
export const SETTLEMENT_KEY = "waybil-demo-settlement-v1";
export interface DemoSettlement {
  active: boolean;
  amount: string;
  bill: string;
  reason: string;
}
export const DEFAULT_SETTLEMENT: DemoSettlement = {
  active: false,
  amount: "273000000",
  bill: "280000000",
  reason: "Paid for the 112 good crates.",
};
export const DEFAULT_SETTLEMENT_JSON = JSON.stringify(DEFAULT_SETTLEMENT);
export function readDemoSettlementJson() {
  try {
    return localStorage.getItem(SETTLEMENT_KEY) ?? DEFAULT_SETTLEMENT_JSON;
  } catch {
    return DEFAULT_SETTLEMENT_JSON;
  }
}
export function parseDemoSettlement(json: string): DemoSettlement {
  try {
    const value = JSON.parse(json) as DemoSettlement;
    if (
      typeof value.amount !== "string" ||
      !/^\d+$/.test(value.amount) ||
      typeof value.reason !== "string"
    )
      return DEFAULT_SETTLEMENT;
    const amount = BigInt(value.amount);
    if (amount > BigInt(DEMO_SHIPMENT.advance)) return DEFAULT_SETTLEMENT;
    return {
      active: value.active === true,
      amount: value.amount,
      bill: billForDriverAmount(amount).toString(),
      reason: value.reason,
    };
  } catch {
    return DEFAULT_SETTLEMENT;
  }
}
export function settleDemoReport(amount: string, reason: string) {
  if (readDemoDelivery() !== "reported") return false;
  const units = BigInt(amount);
  if (units < 0n || units > BigInt(DEMO_SHIPMENT.advance) || !reason.trim())
    throw new Error("Invalid settlement");
  localStorage.setItem(
    SETTLEMENT_KEY,
    JSON.stringify({ active: true, amount, bill: billForDriverAmount(units).toString(), reason }),
  );
  localStorage.setItem(DELIVERY_KEY, "settled");
  window.dispatchEvent(new Event("waybil-demo-delivery"));
  return true;
}
export function repayDemoBill() {
  if (!["paid", "settled"].includes(readDemoDelivery())) return false;
  localStorage.setItem(DELIVERY_KEY, "repaid");
  window.dispatchEvent(new Event("waybil-demo-delivery"));
  return true;
}
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
  return saved === "paid" || saved === "reported" || saved === "settled" || saved === "repaid"
    ? saved
    : "road";
}

/** Shared between tabs so the warehouse confirmation updates the driver's screen. */
export function confirmDemoDelivery(result: "paid" | "reported", report?: DemoReport) {
  if (readDemoDelivery() !== "road") return false;
  localStorage.removeItem(SETTLEMENT_KEY);
  if (result === "reported" && report) localStorage.setItem(REPORT_KEY, JSON.stringify(report));
  localStorage.setItem(DELIVERY_KEY, result);
  window.dispatchEvent(new Event("waybil-demo-delivery"));
  return true;
}
