import type { Invite, Network, Shipment, Shipper, Trip } from "@waybil/shared";
import type { DemoShipmentRow } from "./fixtures";

/* The shipper's testnet data in the shapes the screens draw (#84). */

export interface LiveShipperData {
  account: string;
  /** Null until the team approves the company's first limit. */
  shipper: Shipper | null;
  network: Network;
  /** Newest first. */
  shipments: Shipment[];
  invites: Invite[];
  wallet: bigint;
}

/** People and places by account, from the invites the shipper sent. Accounts are the fallback. */
export function names(invites: Invite[]) {
  const people: Record<string, string> = {};
  const places: Record<string, { name: string; address: string }> = {};
  for (const invite of invites) {
    if (!invite.acceptedBy) continue;
    if (invite.type === "driver") people[invite.acceptedBy] = invite.name;
    else places[invite.acceptedBy] = { name: invite.name, address: invite.address ?? "" };
  }
  return { people, places };
}

const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
export const ms = (ns: string | null | undefined) => (ns ? Number(BigInt(ns) / 1000000n) : 0);
export const shortDay = (ns: string | null | undefined) =>
  ns ? SHORT.format(new Date(ms(ns))) : "";

/** One row for the shipment lists. */
/** "Pickup Solo to Warehouse Bantul" when the trip is known, otherwise the row as it was. */
export function withTrips(rows: DemoShipmentRow[], trips: Trip[]): DemoShipmentRow[] {
  return rows.map((row) => {
    const trip = trips.find((t) => t.shipmentId === row.shipment.id);
    return trip ? { ...row, route: `${trip.pickup.name} to ${trip.destination.name}` } : row;
  });
}

export function toRow(s: Shipment, data: LiveShipperData, now = Date.now()): DemoShipmentRow {
  const { people, places } = names(data.invites);
  const warehouse = data.network.destinations.find((d) => d.id === s.destination)?.warehouse;
  const place =
    (warehouse && places[warehouse]?.name) || warehouse || `Destination ${s.destination}`;
  const days = Math.ceil((ms(s.due_at) - now) / 86400000);
  return {
    shipment: s,
    route: `To ${place}`,
    city: place,
    driver: people[s.driver] ?? s.driver,
    cargo: `${s.qty} ${s.unit}`,
    due:
      s.status === "Repaid"
        ? `Paid ${shortDay(s.repaid_at)}`
        : s.status === "Cancelled"
          ? "Cancelled"
          : s.status === "Paid" && days >= 0 && days <= 7
            ? `Due in ${days} ${days === 1 ? "day" : "days"}`
            : `Due ${shortDay(s.due_at)}`,
  };
}

/** Credit in use: bills paid out early and not repaid, plus advances promised to approved trips. */
export const creditUsed = (shipper: Shipper) => BigInt(shipper.owed) + BigInt(shipper.committed);

/** Bills the shipper still has to pay, and the ones due within a week. */
export function billsToPay(shipments: Shipment[], now = Date.now()) {
  const open = shipments.filter((s) => s.status === "Paid");
  const week = open.filter((s) => ms(s.due_at) - now <= 7 * 86400000);
  const sum = (list: Shipment[]) => list.reduce((total, s) => total + BigInt(s.bill), 0n);
  return { count: open.length, total: sum(open), weekCount: week.length, weekTotal: sum(week) };
}

/** The repay message for `ft_transfer_call`, exactly as contract.md writes it. */
export const repayMessage = (id: number) => JSON.stringify({ repay: id });

/** Due dates are stored as nanoseconds. A chosen day counts until its last second in UTC. */
export const dueAt = (day: string) =>
  (BigInt(Date.parse(`${day}T23:59:59Z`)) * 1000000n).toString();

/** Invites that were accepted but are not in the network on chain yet. */
export function waitingToAdd(data: LiveShipperData) {
  const linked = new Set([
    ...data.network.drivers,
    ...data.network.destinations.map((d) => d.warehouse),
  ]);
  return data.invites.filter((i) => i.acceptedBy && !linked.has(i.acceptedBy));
}
