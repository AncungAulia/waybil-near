import type {
  Destination,
  Investor,
  Network,
  Pool,
  Proposal,
  ProposalStatus,
  QueueEntry,
  Shipment,
  Shipper,
} from "@waybil/shared";
import { NEAR_RPC_URL, USDC_CONTRACT, WAYBIL_CONTRACT } from "./env";

/* Read-only contract views over JSON-RPC. Writes go through the wallet or the relayer. */

export class ViewError extends Error {}

/** Calls a view method and returns its JSON result. */
export async function view<T>(
  method: string,
  args: object = {},
  contract = WAYBIL_CONTRACT,
): Promise<T> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: method,
    method: "query",
    params: {
      request_type: "call_function",
      finality: "final",
      account_id: contract,
      method_name: method,
      args_base64: btoa(JSON.stringify(args)),
    },
  });
  /*
   * The public RPC drops bursts: a 429, or a network error because the 429 has no CORS
   * headers. Two retries with a short wait cover a page that reads many views at once.
   */
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((wait) => setTimeout(wait, 400 * attempt));
    res = await fetch(NEAR_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }).catch(() => null);
    if (res && res.status !== 429) break;
  }
  if (!res?.ok) throw new ViewError(`RPC answered ${res?.status ?? "no response"}`);
  const data = (await res.json()) as {
    error?: { message?: string; cause?: { name?: string } };
    result?: { result?: number[]; error?: string };
  };
  const failure = data.error?.cause?.name ?? data.error?.message ?? data.result?.error;
  if (failure || !data.result?.result) throw new ViewError(failure ?? "Empty RPC result");
  return JSON.parse(new TextDecoder().decode(new Uint8Array(data.result.result))) as T;
}

/** Contract lists return at most 50 items, so this reads page after page with `from`. */
export async function readAll<T>(page: (from: number, limit: number) => Promise<T[]>) {
  const all: T[] = [];
  for (;;) {
    const items = await page(all.length, PAGE);
    all.push(...items);
    if (items.length < PAGE) return all;
  }
}
const PAGE = 50;

export const getPool = () => view<Pool>("get_pool");
export const getShipper = (account_id: string) =>
  view<Shipper | null>("get_shipper", { account_id });
export const getNetwork = (account_id: string) => view<Network>("get_network", { account_id });
export const getDestination = (id: number) => view<Destination | null>("get_destination", { id });
export const getShipment = (id: number) => view<Shipment | null>("get_shipment", { id });
export const getInvestor = (account_id: string) => view<Investor>("get_investor", { account_id });
export const getProposal = (id: number) => view<Proposal | null>("get_proposal", { id });
export const isMember = (account_id: string) => view<boolean>("is_member", { account_id });
export const getTeam = () => view<string[]>("get_team");

/** Newest first. */
export const listProposals = (status?: ProposalStatus, limit?: number) =>
  view<Proposal[]>("list_proposals", { status, limit });

type Page = { from?: number; limit?: number };
export const listShipmentsByShipper = (account_id: string, page: Page = {}) =>
  view<Shipment[]>("list_shipments_by_shipper", { account_id, ...page });
export const listShipmentsByDriver = (account_id: string, page: Page = {}) =>
  view<Shipment[]>("list_shipments_by_driver", { account_id, ...page });
export const listShipmentsByDestination = (destination: number, page: Page = {}) =>
  view<Shipment[]>("list_shipments_by_destination", { destination, ...page });
export const getWithdrawQueue = (page: Page = {}) => view<QueueEntry[]>("get_withdraw_queue", page);

/** USDC base units as a string. Zero for an account the token never saw. */
export const usdcBalance = (account_id: string) =>
  view<string>("ft_balance_of", { account_id }, USDC_CONTRACT);
