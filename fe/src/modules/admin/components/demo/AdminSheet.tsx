import { Check, Pause, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { AdminActionFields } from "../AdminActionFields";
import { Fact } from "../AdminParts";
import { PEOPLE } from "../../data/fixtures";

export type AdminModal = "vote" | "decision" | "limit" | "pause" | "wallet" | "document";

/** The one sheet of the demo: vote, decision, limit, pause, team wallet or a document. */
export function AdminSheet({
  showing,
  selected,
  document,
  rejection,
  onRejection,
  reason,
  onReason,
  note,
  onNote,
  limit,
  onLimit,
  invalidLimit,
  onClose,
  onConfirm,
}: {
  showing: AdminModal;
  selected: string;
  document: string;
  rejection: boolean;
  onRejection: (value: boolean) => void;
  reason: string;
  onReason: (value: string) => void;
  note: string;
  onNote: (value: string) => void;
  limit: string;
  onLimit: (value: string) => void;
  invalidLimit: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ActionSheet
      className={`admin-sheet admin-sheet-${showing}`}
      title={
        showing === "vote"
          ? "Reject this change?"
          : showing === "decision"
            ? `Decide on ${selected}`
            : showing === "limit"
              ? "Change Northwind’s limit"
              : showing === "pause"
                ? "Pause Northwind’s new shipments?"
                : showing === "document"
                  ? document
                  : "Team wallet"
      }
      onClose={onClose}
    >
      {showing === "wallet" ? (
        <>
          <p className="text-label">
            The team accounts are shown below. Wallet connection will be added with sign-in.
          </p>
          {PEOPLE.map((p) => (
            <Fact key={p.account} label={p.name} value={p.account} />
          ))}
          <Button onClick={onClose}>Done</Button>
        </>
      ) : showing === "document" ? (
        <>
          <p className="text-label">
            This is a sample document entry. Private uploaded files will open after sign-in and
            backend integration.
          </p>
          <Button onClick={onClose}>Done</Button>
        </>
      ) : (
        <>
          <AdminActionFields
            kind={showing}
            selected={selected}
            rejection={rejection}
            onRejection={onRejection}
            reason={reason}
            onReason={onReason}
            note={note}
            onNote={onNote}
            limit={limit}
            onLimit={onLimit}
            invalidLimit={invalidLimit}
          />
          <div className="admin-sheet-actions flex justify-end gap-10">
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant={
                showing === "pause" || showing === "vote" || rejection ? "danger" : "primary"
              }
              icon={
                showing === "pause" ? (
                  <Pause size={17} />
                ) : showing === "vote" || rejection ? (
                  <X size={17} />
                ) : showing === "limit" ? (
                  <PaperPlaneTilt size={17} />
                ) : (
                  <Check size={17} weight="bold" />
                )
              }
              disabled={
                showing === "pause" || showing === "vote" || (showing === "decision" && rejection)
                  ? !reason
                  : invalidLimit || (showing === "limit" && !note.trim())
              }
              onClick={onConfirm}
            >
              {showing === "pause"
                ? "Pause"
                : showing === "vote" || rejection
                  ? "Reject"
                  : showing === "limit"
                    ? "Send to the team"
                    : "Approve"}
            </Button>
          </div>
        </>
      )}
    </ActionSheet>
  );
}
