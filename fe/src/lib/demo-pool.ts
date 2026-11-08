import type { Pool } from "@waybil/shared";

/** The shared fictional pool from demo-data.md. No transaction is submitted. */
export const BASE_POOL: Pool = {
  total_shares: "25000000000",
  cash: "21706000000",
  lent: "3294000000",
  reserve: "1250000000",
  committed: "0",
  queued: "0",
  fees: "0",
};
