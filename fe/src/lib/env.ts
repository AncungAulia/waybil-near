// Public values only. Never put a secret in a NEXT_PUBLIC_* variable.

/** Where the backend API lives, for example http://localhost:4000 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** NEAR network for the RPC and the explorer links. */
export const NEAR_NETWORK = process.env.NEXT_PUBLIC_NEAR_NETWORK ?? "testnet";

/** The main contract: shipments, credit, pool and team votes. */
export const WAYBIL_CONTRACT = process.env.NEXT_PUBLIC_WAYBIL_CONTRACT ?? "app.waybil.testnet";

/** The test USDC token (NEP-141). */
export const USDC_CONTRACT = process.env.NEXT_PUBLIC_USDC_CONTRACT ?? "usdc.waybil.testnet";

/** The public landing page, used by the logo link and the footer. */
export const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3000";
