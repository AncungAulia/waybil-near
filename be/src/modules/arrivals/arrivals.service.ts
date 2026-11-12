import { randomInt, timingSafeEqual } from "node:crypto";
import type {
  ArrivalCodeResponse,
  ArrivalLookupResponse,
  Destination,
  Principal,
  Shipment,
} from "@waybil/shared";
import type { Store } from "../../types/db";
import type { Chain } from "../../lib/near";
import { allowed, ApiException, requireValue, unavailable } from "../../lib/errors";
import { ARRIVAL_CODE_ALPHABET, ARRIVAL_CODE_LENGTH } from "./arrivals.schema";

/** The stored code of one shipment. The code is never logged. */
export interface ArrivalCodeRecord {
  shipmentId: number;
  code: string;
  createdAt: string;
}

const ATTEMPTS = 5;

/** True when `code` is the stored arrival code of the shipment. */
export async function arrivalCodeMatches(
  store: Store,
  shipmentId: number,
  code: string | undefined,
): Promise<boolean> {
  if (!code) return false;
  const row = await store.get<ArrivalCodeRecord>("arrival_codes", String(shipmentId));
  if (!row) return false;
  const stored = Buffer.from(row.value.code);
  const given = Buffer.from(code);
  return stored.length === given.length && timingSafeEqual(stored, given);
}

export class Arrivals {
  constructor(
    private store: Store,
    private chain: Chain,
    private random: (max: number) => number = randomInt,
    private now = () => Date.now(),
  ) {}

  /**
   * The code the driver shows at the destination, made on the first call and the same after
   * that. Only while the truck is on the road.
   */
  async code(actor: Principal, shipmentId: number): Promise<ArrivalCodeResponse> {
    const shipment = requireValue(
      await this.chain.view<Shipment | null>("get_shipment", { id: shipmentId }),
    );
    allowed(actor.accountId === shipment.driver);
    if (shipment.status !== "PickedUp") throw new ApiException(409, "E_NOT_ON_ROAD");
    const id = String(shipmentId);
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const existing = await this.store.get<ArrivalCodeRecord>("arrival_codes", id);
      if (existing) return { code: existing.value.code };
      const code = this.generate();
      /* Another shipment holds this code. Draw again. */
      if ((await this.store.list("arrival_codes", { code })).length > 0) continue;
      const record: ArrivalCodeRecord = {
        shipmentId,
        code,
        createdAt: new Date(this.now()).toISOString(),
      };
      try {
        await this.store.insert("arrival_codes", id, record);
        return { code };
      } catch {
        /* Two requests raced, or another shipment took the code first. The next turn reads back. */
      }
    }
    const raced = await this.store.get<ArrivalCodeRecord>("arrival_codes", id);
    if (raced) return { code: raced.value.code };
    unavailable();
  }

  /**
   * The shipment a code belongs to, only when its destination is the caller's. Any other code
   * gets the same 404, whether it is unknown or belongs to another warehouse.
   */
  async lookup(actor: Principal, code: string): Promise<ArrivalLookupResponse> {
    const row = requireValue(
      (await this.store.list<ArrivalCodeRecord>("arrival_codes", { code }))[0],
    );
    const { shipmentId } = row.value;
    const shipment = await this.chain.view<Shipment | null>("get_shipment", { id: shipmentId });
    const destination =
      shipment &&
      (await this.chain.view<Destination | null>("get_destination", {
        id: shipment.destination,
      }));
    if (!destination || destination.warehouse !== actor.accountId)
      throw new ApiException(404, "E_NOT_FOUND");
    return { shipmentId };
  }

  private generate(): string {
    let code = "";
    for (let i = 0; i < ARRIVAL_CODE_LENGTH; i++)
      code += ARRIVAL_CODE_ALPHABET[this.random(ARRIVAL_CODE_ALPHABET.length)];
    return code;
  }
}
