import type { Shipment, ShipmentStatus } from "@waybil/shared";

/*
 * The design draws one chip per state a person can see (design/waybil.pen → Section Status).
 * They are not the contract's statuses one for one:
 *
 * - "Delivered" has no stored status. `confirm_delivery` writes `arrived_at` and leaves the
 *   status at `PickedUp`; only the payout callback moves it to `Paid`. So a shipment that has
 *   arrived but is not paid yet is Delivered. It is usually a moment, but it stays there if
 *   the payout promise fails, and that is money, so the chip has to exist.
 * - `Cancelled` and `CoveredByReserve` are not drawn yet. They follow the same pattern
 *   (neutral pill, coloured dot, plain words) and are waiting on the design file.
 */
export type StatusChip =
  | "approved"
  | "inTransit"
  | "delivered"
  | "paidEarly"
  | "repaid"
  | "disputed"
  | "cancelled"
  | "coveredByReserve";

const BY_STATUS: Record<ShipmentStatus, StatusChip> = {
  Approved: "approved",
  PickedUp: "inTransit",
  Reported: "disputed",
  Paid: "paidEarly",
  Repaid: "repaid",
  Cancelled: "cancelled",
  CoveredByReserve: "coveredByReserve",
};

/** Which chip a shipment shows. Reads `arrived_at` to tell In transit from Delivered. */
export function statusChip(shipment: Pick<Shipment, "status" | "arrived_at">): StatusChip {
  if (shipment.status === "PickedUp" && shipment.arrived_at !== null) return "delivered";
  return BY_STATUS[shipment.status];
}
