import type { Pool, Proposal } from "@waybil/shared";
import { BASE_POOL } from "@/lib/demo-pool";
export const ADMIN_STATES = {
  "M1.1": "Waiting for signatures",
  "M1.2": "Threshold met",
  "M1.3": "All clear",
  "M1.4": "Reject with a reason",
  "M1.5": "Split vote",
  "M1.6": "Rejected",
  "M1.7": "Expired",
  "M2.1": "Applications",
  "M2.2": "Approved, waiting for signatures",
  "M2.3": "Shipper detail",
  "M2.4": "Decide",
  "M2.5": "Decide, reject",
  "M2.6": "Active tab",
  "M2.7": "Active shipper",
  "M2.8": "Nothing waiting",
  "M2.9": "No active shippers",
  "M2.10": "Needs a closer look",
  "M2.11": "Change limit",
  "M2.12": "Pause new shipments",
  "M3.1": "Pool health",
  "M3.2": "Empty pool",
  "M3.3": "Bill overdue",
  "M3.4": "Almost all lent out",
} as const;
export type AdminState = keyof typeof ADMIN_STATES;
export const BASE_PROPOSAL: Proposal = {
  id: 1,
  kind: { SetLimit: { shipper: "northwind-freight.testnet", limit: "5000000000" } },
  by: "assistant.waybil.testnet",
  from_assistant: true,
  created_at: "1794478320000000000",
  approvals: ["ops.waybil.testnet"],
  rejections: [],
  status: "Open",
};
export const ADMIN_FIXTURES = Object.fromEntries(
  Object.keys(ADMIN_STATES).map((code) => [
    code,
    {
      pool: {
        ...BASE_POOL,
        ...(code === "M3.2"
          ? { total_shares: "0", cash: "0", lent: "0", reserve: "0" }
          : code === "M3.4"
            ? {
                total_shares: "6400000000",
                cash: "400000000",
                lent: "6000000000",
                reserve: "320000000",
              }
            : {}),
      },
      proposal: {
        ...BASE_PROPOSAL,
        status:
          code === "M1.6"
            ? "Rejected"
            : code === "M1.7"
              ? "Expired"
              : code === "M1.2"
                ? "Approved"
                : "Open",
        approvals:
          code === "M1.2" ? ["ops.waybil.testnet", "risk.waybil.testnet"] : ["ops.waybil.testnet"],
        rejections:
          code === "M1.6"
            ? ["risk.waybil.testnet", "finance.waybil.testnet"]
            : code === "M1.5"
              ? ["risk.waybil.testnet"]
              : [],
      },
    },
  ]),
) as Record<AdminState, { pool: Pool; proposal: Proposal }>;
