import { expect, test } from "vitest";
import type { Pool, Shipment } from "@waybil/shared";
import { financed, freeCash, latestEvents, poolStats, poolValue, queuePosition } from "./live";

const pool: Pool = {
  total_shares: "0",
  cash: "1000",
  lent: "500",
  reserve: "40",
  committed: "200",
  queued: "100",
  fees: "10",
};
const day = (n: number) => String(BigInt(n) * 86400000n * 1000000n);
const ship = (id: number, status: Shipment["status"], paid?: number, repaid?: number) =>
  ({
    id,
    status,
    bill: "100000000",
    advance: "97500000",
    paid_at: paid === undefined ? null : day(paid),
    repaid_at: repaid === undefined ? null : day(repaid),
  }) as Shipment;

test("pool value and free cash follow contract.md", () => {
  expect(poolValue(pool)).toBe(1390n);
  expect(freeCash(pool)).toBe(690n);
});

test("only shipments the pool paid for count as deliveries", () => {
  const all = [ship(1, "Approved"), ship(2, "Paid", 1), ship(3, "Repaid", 1, 11)];
  expect(financed(all).map((s) => s.id)).toEqual([2, 3]);
});

test("stats sum the pool's 1.6% on repaid bills and average the trip", () => {
  const stats = poolStats([
    ship(2, "Paid", 1),
    ship(3, "Repaid", 1, 11),
    ship(4, "Repaid", 2, 6),
    ship(5, "CoveredByReserve", 1),
  ]);
  expect(stats).toEqual({ earned: 3200000n, missed: 1, trips: 4, averageDays: 7 });
});

test("queue position and latest events", () => {
  const queue = [
    { investor: "a.testnet", amount: "1", requested_at: "1" },
    { investor: "b.testnet", amount: "1", requested_at: "2" },
  ];
  expect(queuePosition(queue, "b.testnet")).toBe(2);
  expect(queuePosition(queue, "c.testnet")).toBeNull();
  const latest = latestEvents([ship(2, "Paid", 5), ship(3, "Repaid", 1, 9)]);
  expect(latest.map((e) => `${e.kind}${e.shipment.id}`)).toEqual(["repaid3", "paid2", "paid3"]);
});
