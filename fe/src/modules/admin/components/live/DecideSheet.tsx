"use client";
import { useState } from "react";
import {
  formatUsdc,
  type ApplicationListItem,
  type ApplicationRejectionReason,
} from "@waybil/shared";
import { Check, X } from "@phosphor-icons/react";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { listProposals } from "@/lib/near";
import { WAYBIL_CONTRACT } from "@/lib/env";
import { callContract } from "@/lib/wallet";
import { AdminActionFields } from "../AdminActionFields";
import { asInput, day, failure, GAS, toUnits, type Done } from "./shared";

const APPLICATION_REASONS: Record<string, ApplicationRejectionReason> = {
  "Documents do not match": "unclear_documents",
  "Too new": "needs_history",
  "Payment risk": "payment_risk",
  Other: "other",
};

/** M2.4 and M2.5. Approve proposes StartShipper from the wallet. Reject tells the company. */
export function DecideSheet({
  application: a,
  onClose,
  onDone,
}: {
  application: ApplicationListItem;
  onClose: () => void;
  onDone: (done: Done) => void;
}) {
  const suggested = a.review?.suggestedLimit ? BigInt(a.review.suggestedLimit) : null;
  const [rejection, setRejection] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [limit, setLimit] = useState(suggested ? asInput(suggested) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const units = toUnits(limit);
  const invalidLimit = units <= 0n || units > 10000000000n;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (rejection) {
        await api(`/admin/applications/${a.id}/reject`, {
          body: { reason: APPLICATION_REASONS[reason] ?? "other", note: note.trim() },
        });
        onDone({ text: `${a.company.name} was told why it was not approved.` });
        return;
      }
      const tx = await callContract(
        WAYBIL_CONTRACT,
        "propose",
        { kind: { StartShipper: { shipper: a.shipperId, limit: String(units) } } },
        { gas: GAS },
      );
      /* `propose` returns the id, but the wallet only gives the hash, so find it by its shape. */
      const proposal = (await listProposals(undefined, 20)).find(
        (p) => "StartShipper" in p.kind && p.kind.StartShipper.shipper === a.shipperId,
      );
      if (proposal)
        await api(`/admin/applications/${a.id}/proposal`, { body: { proposalId: proposal.id } });
      onDone({
        text: `You approved a ${formatUsdc(units)} USDC starting limit for ${a.company.name}. It goes live when one more team member approves it.`,
        tx,
      });
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionSheet
      className="admin-sheet admin-sheet-decision"
      title={`Decide on ${a.company.name}`}
      onClose={onClose}
    >
      <AdminActionFields
        kind="decision"
        selected={a.company.name}
        rejection={rejection}
        onRejection={setRejection}
        reason={reason}
        onReason={setReason}
        note={note}
        onNote={setNote}
        limit={limit}
        onLimit={setLimit}
        invalidLimit={invalidLimit}
        subtitle={`Applied ${day(a.createdAt)} · ${a.company.trips} trips a month`}
        hint={
          suggested
            ? `The assistant suggests ${formatUsdc(suggested)} USDC. You can change it.`
            : "Check the papers and choose a starting limit."
        }
      />
      {error && (
        <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
          {error}
        </p>
      )}
      <div className="admin-sheet-actions flex justify-end gap-10">
        <Button variant="quiet" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={rejection ? "danger" : "primary"}
          icon={rejection ? <X size={17} /> : <Check size={17} weight="bold" />}
          disabled={rejection ? !reason : invalidLimit}
          loading={busy}
          loadingLabel={rejection ? "Sending" : "Waiting for wallet"}
          onClick={() => void submit()}
        >
          {rejection ? "Reject" : "Approve"}
        </Button>
      </div>
    </ActionSheet>
  );
}
