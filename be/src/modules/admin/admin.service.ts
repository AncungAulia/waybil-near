import type {
  Principal,
  Proposal,
  ProposalReason,
  PauseNote,
  ProposalReasonInput,
  PauseNoteInput,
} from "@waybil/shared";
import type { Store } from "../../types/db";
import type { Chain } from "../../lib/near";
import type { Leases } from "../../lib/leases";
import { allowed, conflict, requireValue } from "../../lib/errors";
import { sha256 } from "../../lib/storage";

export interface PauseProof {
  assert(actor: string, shipperId: string, reason: string, txHash: string): Promise<void>;
}
export class AdminNotes {
  constructor(
    private store: Store,
    private chain: Chain,
    private leases: Leases,
    private pauses: PauseProof,
  ) {}
  async saveReason(
    actor: Principal,
    proposalId: number,
    input: ProposalReasonInput,
  ): Promise<ProposalReason> {
    await this.team(actor);
    const proposal = requireValue(
      await this.chain.view<Proposal | null>("get_proposal", { id: proposalId }),
    );
    allowed(proposal.rejections.includes(actor.accountId));
    const id = sha256(`${proposalId}:${actor.accountId}`);
    return this.leases.run(`reason:${id}`, async () => {
      const existing = await this.store.get<ProposalReason>("proposal_reasons", id);
      if (existing) {
        if (existing.value.reason !== input.reason || existing.value.note !== input.note)
          conflict();
        return existing.value;
      }
      const value: ProposalReason = {
        id,
        proposalId,
        actor: actor.accountId,
        ...input,
        createdAt: new Date().toISOString(),
      };
      return (await this.store.insert("proposal_reasons", id, value)).value;
    });
  }
  async reasons(actor: Principal, proposalId: number) {
    await this.team(actor);
    return {
      reasons: (await this.store.list<ProposalReason>("proposal_reasons", { proposalId })).map(
        (r) => r.value,
      ),
    };
  }
  async savePause(actor: Principal, input: PauseNoteInput): Promise<PauseNote> {
    await this.team(actor);
    await this.pauses.assert(actor.accountId, input.shipperId, input.reason, input.txHash);
    return this.leases.run(`pause:${input.txHash}`, async () => {
      const existing = await this.store.get<PauseNote>("pause_notes", input.txHash);
      if (existing) {
        if (existing.value.note !== input.note || existing.value.reason !== input.reason)
          conflict();
        return existing.value;
      }
      const note: PauseNote = {
        ...input,
        id: input.txHash,
        actor: actor.accountId,
        proofUrl: `https://testnet.nearblocks.io/txns/${input.txHash}`,
        createdAt: new Date().toISOString(),
      };
      return (await this.store.insert("pause_notes", note.id, note)).value;
    });
  }
  async pausesFor(actor: Principal, shipperId: string) {
    await this.team(actor);
    return {
      notes: (await this.store.list<PauseNote>("pause_notes", { shipperId })).map((r) => r.value),
    };
  }
  private async team(actor: Principal) {
    allowed(await this.chain.view<boolean>("is_member", { account_id: actor.accountId }));
  }
}
