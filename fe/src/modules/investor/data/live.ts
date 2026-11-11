import { splitBill, type Pool, type QueueEntry, type Shipment, type Shipper } from "@waybil/shared";
import type { DemoPoolBalance } from "./demo";

/* Pool numbers from the contract views, using the formulas in docs/specs/contract.md. */

/** What all shares are worth: cash + lent − queued − fees. */
export const poolValue = (p: Pool) =>
  BigInt(p.cash) + BigInt(p.lent) - BigInt(p.queued) - BigInt(p.fees);

/** Free for new advances and new withdrawals: cash − committed − queued − fees. */
export const freeCash = (p: Pool) =>
  BigInt(p.cash) - BigInt(p.committed) - BigInt(p.queued) - BigInt(p.fees);

/** What `process_queue` can pay from: cash − committed − fees. */
export const queueCash = (p: Pool) => BigInt(p.cash) - BigInt(p.committed) - BigInt(p.fees);

/** Shipments whose driver the pool paid early. */
export const financed = (shipments: Shipment[]) =>
  shipments.filter((s) => ["Paid", "Repaid", "CoveredByReserve"].includes(s.status));

export interface LivePool {
  pool: Pool;
  value: bigint;
  shares: bigint;
  queued: bigint;
  wallet: bigint;
  queue: QueueEntry[];
  /** Financed shipments, newest first. */
  deliveries: Shipment[];
  shippers: Record<string, Shipper | null>;
}

/** The live numbers in the shape the demo screen already draws. */
export function toBalance(live: LivePool): DemoPoolBalance {
  return {
    value: String(live.value),
    wallet: String(live.wallet),
    cash: String(freeCash(live.pool)),
    total: String(poolValue(live.pool)),
    queued: String(live.queued),
  };
}

const ms = (ns: string | null) => (ns ? Number(BigInt(ns) / 1000000n) : 0);

/** The stat row on the pool page. */
export function poolStats(deliveries: Shipment[]) {
  const repaid = deliveries.filter((s) => s.status === "Repaid");
  const days = repaid.map((s) => (ms(s.repaid_at) - ms(s.paid_at)) / 86400000);
  return {
    earned: repaid.reduce((sum, s) => sum + splitBill(BigInt(s.bill)).pool, 0n),
    missed: deliveries.filter((s) => s.status === "CoveredByReserve").length,
    trips: deliveries.length,
    averageDays: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null,
  };
}

/** 1 for the first in line. Null when the account has nothing queued. */
export function queuePosition(queue: QueueEntry[], accountId: string) {
  const index = queue.findIndex((entry) => entry.investor === accountId);
  return index < 0 ? null : index + 1;
}

/** The newest money moments, for the "Latest" panel. */
export function latestEvents(deliveries: Shipment[], limit = 3) {
  return deliveries
    .flatMap((s) => [
      ...(s.paid_at ? [{ kind: "paid" as const, at: ms(s.paid_at), shipment: s }] : []),
      ...(s.repaid_at ? [{ kind: "repaid" as const, at: ms(s.repaid_at), shipment: s }] : []),
    ])
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}
