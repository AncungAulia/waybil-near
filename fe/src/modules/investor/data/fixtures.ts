import type { Investor, Pool, Shipment } from "@waybil/shared";
import { demoShipment } from "@/lib/demo-delivery";
import { BASE_POOL } from "@/lib/demo-pool";

export const INVESTOR_STATES = {
  "I1.1": "Pool",
  "I1.2": "First visit",
  "I1.3": "Pool busy",
  "I2.1": "Deposit",
  "I2.2": "Approving in wallet",
  "I2.3": "Not enough USDC",
  "I2.4": "Deposited",
  "I2.5": "Withdraw",
  "I2.6": "Withdraw, pool busy",
  "I2.7": "Withdrawn",
  "I3.1": "Deliveries",
  "I3.2": "One delivery",
  "I3.3": "History",
  "I3.4": "No deliveries yet",
  "I3.5": "Covered by reserve",
} as const;
export type InvestorState = keyof typeof INVESTOR_STATES;
export const BASE_INVESTOR: Investor = { shares: "5000000000", value: "5009720000", queued: "0" };
export const INVESTOR_FIXTURES = Object.fromEntries(
  Object.keys(INVESTOR_STATES).map((code) => [
    code,
    {
      pool: {
        ...BASE_POOL,
        ...(code === "I1.3" || code === "I2.6" ? { cash: "2000000000", lent: "23000000000" } : {}),
      },
      investor: { ...BASE_INVESTOR, ...(code === "I1.2" ? { shares: "0", value: "0" } : {}) },
      shipment: demoShipment(code === "I3.5" ? "CoveredByReserve" : "Paid"),
    },
  ]),
) as Record<InvestorState, { pool: Pool; investor: Investor; shipment: Shipment }>;
