import type {
  Network,
  Principal,
  Profile,
  ProfilesResponse,
  WarehouseDestinationsResponse,
} from "@waybil/shared";
import type { Store } from "../../types/db";
import type { Chain } from "../../lib/near";
import { allowed } from "../../lib/errors";
import { displayName } from "../../lib/names";
import type { InviteRecord } from "../invites/invites.service";

export class Profiles {
  constructor(
    private store: Store,
    private chain: Chain,
  ) {}

  /**
   * Names for the accounts a screen shows, such as the driver on a shipment or the company
   * on a trip. Only the account, its role and its public name leave the server. Accounts
   * with no profile are left out.
   */
  async names(ids: string[]): Promise<ProfilesResponse> {
    const profiles = [];
    for (const accountId of ids) {
      const row = await this.store.get<Profile>("profiles", accountId);
      if (!row) continue;
      profiles.push({
        accountId,
        role: row.value.role,
        name: await displayName(this.store, accountId),
      });
    }
    return { profiles };
  }

  /**
   * The destinations this warehouse receives for. The contract keeps destinations per
   * shipper, so the shippers come from the warehouse invites this account accepted, and each
   * shipper's network on chain says which of its destinations point here.
   */
  async destinations(actor: Principal): Promise<WarehouseDestinationsResponse> {
    allowed(actor.role === "warehouse");
    const invites = await this.store.list<InviteRecord>("invites", {
      acceptedBy: actor.accountId,
      type: "warehouse",
    });
    const shippers = [...new Set(invites.map((row) => row.value.shipperId))].sort();
    const destinations = [];
    for (const shipperId of shippers) {
      const network = await this.chain.view<Network | null>("get_network", {
        account_id: shipperId,
      });
      const mine = (network?.destinations ?? []).filter((d) => d.warehouse === actor.accountId);
      if (!mine.length) continue;
      const shipperName = (await displayName(this.store, shipperId)) || shipperId;
      for (const destination of mine)
        destinations.push({ id: destination.id, shipperId, shipperName });
    }
    return { destinations };
  }
}
