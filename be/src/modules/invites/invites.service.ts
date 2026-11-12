import { randomBytes } from "node:crypto";
import type { Invite, InviteCreate, Place, Principal, PublicInvite, Shipper } from "@waybil/shared";
import type { Store } from "../../types/db";
import type { Chain } from "../../lib/near";
import { allowed, ApiException, conflict, requireValue } from "../../lib/errors";
import { displayName } from "../../lib/names";

export interface InviteRecord extends Invite {
  reservedFor: string | null;
  reservedUntil: string | null;
  expiredAt?: string;
}
export class Invites {
  constructor(
    private store: Store,
    private chain: Chain,
    private appUrl: string,
    private now = () => Date.now(),
  ) {}
  async create(actor: Principal, input: InviteCreate) {
    allowed(actor.role === "shipper");
    requireValue(
      await this.chain.view<Shipper | null>("get_shipper", { account_id: actor.accountId }),
    );
    const details = await this.withPlace(actor, input);
    const code = randomBytes(12).toString("hex");
    const invite: InviteRecord = {
      ...details,
      code,
      shipperId: actor.accountId,
      /* The invite page reads "<company> invited you", so it uses the company name when there is one. */
      shipperName: (await displayName(this.store, actor.accountId)) || actor.accountId,
      expiresAt: new Date(this.now() + 7 * 86400000).toISOString(),
      acceptedBy: null,
      acceptedAt: null,
      reservedFor: null,
      reservedUntil: null,
    };
    await this.store.insert("invites", code, invite);
    return {
      invite: this.publicOwner(invite),
      link: new URL(`/join/${code}`, this.appUrl).toString(),
    };
  }
  /**
   * A warehouse invite may point at a destination place this shipper saved. The invite then
   * carries the place's address, so the warehouse sees the same address as the pin.
   */
  private async withPlace(actor: Principal, input: InviteCreate): Promise<InviteCreate> {
    if (input.placeId === undefined) return input;
    if (input.type !== "warehouse") throw new ApiException(400, "E_VALIDATION");
    const place = requireValue(await this.store.get<Place>("places", input.placeId)).value;
    allowed(place.shipperId === actor.accountId);
    if (place.kind !== "destination") throw new ApiException(400, "E_VALIDATION");
    return { ...input, address: place.address };
  }
  async read(code: string): Promise<PublicInvite> {
    const { value } = requireValue(await this.store.get<InviteRecord>("invites", code));
    return {
      shipperName: value.shipperName,
      type: value.type,
      state: value.acceptedBy
        ? "used"
        : this.now() >= Date.parse(value.expiresAt)
          ? "expired"
          : "open",
    };
  }
  async list(actor: Principal) {
    allowed(actor.role === "shipper");
    return {
      invites: (await this.store.list<InviteRecord>("invites", { shipperId: actor.accountId })).map(
        (row) => this.publicOwner(row.value),
      ),
    };
  }
  async reserve(code: string, subjectHash: string, accountId?: string): Promise<InviteRecord> {
    const row = requireValue(await this.store.get<InviteRecord>("invites", code));
    if (accountId && row.value.acceptedBy === accountId) return row.value;
    this.open(row.value);
    if (
      row.value.reservedFor &&
      row.value.reservedFor !== subjectHash &&
      Date.parse(row.value.reservedUntil!) > this.now()
    )
      conflict();
    return (
      await this.store.replace("invites", code, row.version, {
        ...row.value,
        reservedFor: subjectHash,
        reservedUntil: new Date(this.now() + 300000).toISOString(),
      })
    ).value;
  }
  async accept(actor: Principal, code: string, subjectHash: string) {
    allowed(actor.authMethod === "google");
    const row = requireValue(await this.store.get<InviteRecord>("invites", code));
    allowed(actor.role === row.value.type);
    if (row.value.acceptedBy === actor.accountId)
      return { invite: this.publicOwner(row.value), networkLinkRequired: true };
    this.open(row.value);
    if (row.value.reservedFor && Date.parse(row.value.reservedUntil!) > this.now())
      allowed(row.value.reservedFor === subjectHash);
    const value = {
      ...row.value,
      acceptedBy: actor.accountId,
      acceptedAt: new Date(this.now()).toISOString(),
      reservedFor: null,
      reservedUntil: null,
    };
    await this.store.replace("invites", code, row.version, value);
    return { invite: this.publicOwner(value), networkLinkRequired: true };
  }
  private open(invite: InviteRecord) {
    if (invite.acceptedBy)
      throw new ApiException(409, "E_INVITE_USED", "This invitation has already been used.");
    if (this.now() >= Date.parse(invite.expiresAt))
      throw new ApiException(409, "E_INVITE_EXPIRED", "This invitation has expired.");
  }
  private publicOwner(value: InviteRecord): Invite {
    const { reservedFor, reservedUntil, expiredAt, ...invite } = value;
    void reservedFor;
    void reservedUntil;
    void expiredAt;
    return invite;
  }
}
