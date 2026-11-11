import type { Proposal, Shipment } from "@waybil/shared";
import type { Chain } from "./near";
import { unavailable } from "./errors";
const MAX_PROPOSAL_ID = 1000;
const PROPOSAL_BATCH = 25;
const MAX_SHIPMENTS = 5000;
const SHIPMENT_PAGE = 50;
export async function readProposals(chain: Chain, deadline: number): Promise<Proposal[]> {
  const head = await chain.view<Proposal[]>("list_proposals", { limit: 1 });
  const newest = head[0]?.id ?? 0;
  if (!Number.isSafeInteger(newest) || newest < 0 || newest > MAX_PROPOSAL_ID) unavailable();
  const results: Proposal[] = [];
  for (let from = 1; from <= newest; from += PROPOSAL_BATCH) {
    if (Date.now() > deadline) unavailable();
    const page = await Promise.all(
      Array.from({ length: Math.min(PROPOSAL_BATCH, newest - from + 1) }, (_, i) =>
        chain.view<Proposal | null>("get_proposal", { id: from + i }),
      ),
    );
    for (const proposal of page) if (proposal) results.push(proposal);
  }
  return results;
}
export async function readShipperShipments(
  chain: Chain,
  shipper: string,
  deadline: number,
): Promise<Shipment[]> {
  const results: Shipment[] = [];
  for (let from = 0; from < MAX_SHIPMENTS; from += SHIPMENT_PAGE) {
    if (Date.now() > deadline) unavailable();
    const page = await chain.view<Shipment[]>("list_shipments_by_shipper", {
      account_id: shipper,
      from,
      limit: SHIPMENT_PAGE,
    });
    results.push(...page);
    if (page.length < SHIPMENT_PAGE) return results;
  }
  return unavailable();
}
