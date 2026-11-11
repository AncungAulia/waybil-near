// Public values only. Never put a secret in a NEXT_PUBLIC_* variable.

/*
 * The browser calls the backend through `/api/*`, which next.config.ts proxies to the
 * server-only `API_URL`. Production CORS only allows the deployed app, so this is also what
 * makes localhost work.
 */

/**
 * "on" turns on the live path: role guards and the real clock. Off, every screen keeps the
 * demo story, so the app stays usable until sign-in lands.
 */
export const LIVE = process.env.NEXT_PUBLIC_LIVE === "on";

/** NEAR network for the RPC and the explorer links. */
export const NEAR_NETWORK = process.env.NEXT_PUBLIC_NEAR_NETWORK ?? "testnet";

/** JSON-RPC endpoint for contract views. */
export const NEAR_RPC_URL = process.env.NEXT_PUBLIC_NEAR_RPC_URL || "https://test.rpc.fastnear.com";

/** The main contract: shipments, credit, pool and team votes. */
export const WAYBIL_CONTRACT = process.env.NEXT_PUBLIC_WAYBIL_CONTRACT ?? "app.waybil.testnet";

/** The test USDC token (NEP-141). */
export const USDC_CONTRACT = process.env.NEXT_PUBLIC_USDC_CONTRACT ?? "usdc.waybil.testnet";

/** The public landing page, used by the logo link and the footer. */
export const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3000";

/** The NearBlocks explorer for NEAR_NETWORK, without a trailing slash. */
export const NEARBLOCKS_URL =
  NEAR_NETWORK === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io";

/** A NearBlocks page, for example `nearblocksUrl("/txns/<hash>")`. */
export function nearblocksUrl(path = "") {
  return `${NEARBLOCKS_URL}${path}`;
}

/**
 * The main contract's account page. Sample data has no transaction hash, so demo receipts
 * link here and say they are a sample.
 */
export const CONTRACT_RECORD_URL = nearblocksUrl(`/address/${WAYBIL_CONTRACT}`);
