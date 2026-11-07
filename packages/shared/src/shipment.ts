// Shapes returned by the waybil contract views (docs/specs/contract.md).
// Amounts are U128 strings in USDC base units. Times are nanoseconds as strings.

export type ShipmentStatus =
  "Approved" | "PickedUp" | "Reported" | "Paid" | "Repaid" | "Cancelled" | "CoveredByReserve";

export interface Shipment {
  id: number;
  shipper: string;
  driver: string;
  destination: number;
  qty: number;
  unit: string;
  bill: string;
  advance: string;
  due_at: string;
  status: ShipmentStatus;
  approved_at: string;
  picked_up_at: string | null;
  arrived_at: string | null;
  good_qty: number | null;
  report_hash: string | null;
  paid_at: string | null;
  repaid_at: string | null;
}

export interface Shipper {
  limit: string;
  owed: string;
  committed: string;
  paused: string | null;
  late_bills: number;
}

export type Role = "shipper" | "driver" | "warehouse" | "investor" | "admin";
