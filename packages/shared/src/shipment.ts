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
  /** Counted in the shipper's late bills. */
  marked_late: boolean;
}

export interface Shipper {
  limit: string;
  /** Bills already paid out to drivers and not repaid yet. */
  owed: string;
  /** Bills approved but not paid out yet. */
  committed: string;
  /** Reason, when the team paused new shipments. */
  paused: string | null;
  late_bills: number;
  /** The credit assistant can't change the limit before this time. */
  blocked_until: string;
  raise_window_start: string;
  raise_window_base: string;
}

export interface Destination {
  id: number;
  shipper: string;
  warehouse: string;
}

export interface Network {
  drivers: string[];
  destinations: Destination[];
}

export interface Pool {
  total_shares: string;
  cash: string;
  lent: string;
  reserve: string;
  /** Promised to approved shipments, not paid out yet. */
  committed: string;
  /** Owed to queued withdrawals. */
  queued: string;
  /** Waybil's 0.5%, waiting for the treasury to claim it. */
  fees: string;
}

export interface Investor {
  shares: string;
  /** What the shares are worth now. */
  value: string;
  /** Withdrawals still waiting in the queue. */
  queued: string;
}

export interface QueueEntry {
  investor: string;
  amount: string;
  requested_at: string;
}

export type ProposalKind =
  | { StartShipper: { shipper: string; limit: string } }
  | { SetLimit: { shipper: string; limit: string } }
  | { Unpause: { shipper: string } }
  | { CoverFromReserve: { shipment_id: number } };

export type ProposalStatus = "Open" | "Approved" | "Rejected" | "Expired";

export interface Proposal {
  id: number;
  kind: ProposalKind;
  by: string;
  from_assistant: boolean;
  created_at: string;
  approvals: string[];
  rejections: string[];
  status: ProposalStatus;
}

export type Role = "shipper" | "driver" | "warehouse" | "investor" | "admin";
