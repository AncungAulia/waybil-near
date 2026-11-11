"use client";
import { useState } from "react";
import {
  formatUsdc,
  type Proposal,
  type ProposalReason,
  type ProposalReasonInput,
  type ProposalReasonsResponse,
  type Shipper,
} from "@waybil/shared";
import { ArrowRight, Check, X } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { api } from "@/lib/api";
import { useNames } from "@/hooks/useNames";
import { getShipper, getTeam, listProposals } from "@/lib/near";
import { WAYBIL_CONTRACT } from "@/lib/env";
import { callContract } from "@/lib/wallet";
import { AdminActionFields } from "../AdminActionFields";
import { AdminBadge, Empty, Fact } from "../AdminParts";
import {
  day,
  describe,
  DoneNote,
  failure,
  Failed,
  GAS,
  Header,
  Loading,
  REASON_WORDS,
  shipperOf,
  useLoad,
  type Done,
} from "./shared";

const VOTE_REASONS: Record<string, ProposalReasonInput["reason"]> = {
  "Too big a jump": "too_big_jump",
  "Needs more history": "needs_history",
  "Payment risk": "payment_risk",
  Other: "other",
};

/* M1. Proposals that need the team, newest first. */
export function Approvals({ me }: { me: string }) {
  const { data, error, reload } = useLoad(async () => {
    const [proposals, team] = await Promise.all([listProposals(undefined, 50), getTeam()]);
    const names = [
      ...new Set(proposals.map((p) => shipperOf(p.kind)).filter((n): n is string => !!n)),
    ];
    const shippers = await Promise.all(names.map(getShipper));
    const reasons = await Promise.all(
      proposals
        .filter((p) => p.rejections.length > 0)
        .map((p) =>
          api<ProposalReasonsResponse>(`/admin/proposals/${p.id}/reasons`)
            .then((r) => r.reasons)
            .catch(() => [] as ProposalReason[]),
        ),
    );
    return {
      proposals,
      team,
      shippers: Object.fromEntries(names.map((n, i) => [n, shippers[i] ?? null])),
      reasons: reasons.flat(),
    };
  }, "approvals");
  const [done, setDone] = useState<Done>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<Proposal | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  async function vote(p: Proposal, approve: boolean) {
    setBusy(p.id);
    setDone(null);
    try {
      const tx = await callContract(WAYBIL_CONTRACT, "vote", { id: p.id, approve }, { gas: GAS });
      let text = approve ? "Your approval is recorded." : "Your rejection is recorded.";
      if (!approve) {
        const body = { reason: VOTE_REASONS[reason] ?? "other", note: note.trim() };
        /* The vote must be final before the backend sees it, so try once more after a moment. */
        await api(`/admin/proposals/${p.id}/reasons`, { body }).catch(async () => {
          await new Promise((wait) => setTimeout(wait, 2500));
          await api(`/admin/proposals/${p.id}/reasons`, { body }).catch(() => {
            text = "Your rejection is recorded. The reason could not be saved.";
          });
        });
      }
      setDone({ text, tx });
      setRejecting(null);
      reload();
    } catch (e) {
      setDone({ text: failure(e) });
    } finally {
      setBusy(null);
    }
  }

  const name = useNames(data?.proposals.map((p) => shipperOf(p.kind)) ?? []);
  if (error) return <Failed error={error} reload={reload} />;
  const open = data?.proposals.filter((p) => p.status === "Open") ?? [];
  const closed = data?.proposals.filter((p) => p.status !== "Open").slice(0, 6) ?? [];
  return (
    <>
      <Header title="Approvals" note="Changes that need the team" />
      <DoneNote done={done} />
      {!data ? (
        <Loading />
      ) : (
        <div className="grid items-start gap-24 lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col gap-24">
            {open.length === 0 ? (
              <Panel className="admin-empty-approvals">
                <Empty
                  title="Nothing waiting for the team"
                  text="Small changes go through on their own. Bigger ones will show up here."
                />
              </Panel>
            ) : (
              open.map((p) => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  shippers={data.shippers}
                  reasons={data.reasons.filter((r) => r.proposalId === p.id)}
                  me={me}
                  busy={busy === p.id}
                  onApprove={() => void vote(p, true)}
                  onReject={() => {
                    setReason("");
                    setNote("");
                    setRejecting(p);
                  }}
                />
              ))
            )}
          </div>
          <div className="flex flex-col gap-24">
            <Panel className="approval-team">
              <div className="flex flex-col gap-4">
                <h2 className="text-[17px] leading-21 font-semibold">Team approval</h2>
                <p className="text-label text-ds-muted">
                  A change goes through when 2 of the {data.team.length} team members approve it.
                </p>
              </div>
              <div>
                {data.team.map((member) => (
                  <Fact key={member} label={member === me ? "You" : "Member"} value={member} />
                ))}
              </div>
            </Panel>
            <Panel title="Recently decided" className="approval-recent">
              {closed.length === 0 && (
                <p className="text-label text-ds-muted">Nothing has been decided yet.</p>
              )}
              {closed.map((p) => (
                <div key={p.id} className="approval-recent-row py-12">
                  <p className="text-label font-medium break-all">
                    {describe(p.kind, data.shippers, name).title}
                  </p>
                  <p className="text-caption text-ds-muted">
                    {p.status} · {p.approvals.length} approved · {p.rejections.length} rejected ·{" "}
                    {day(p.created_at)}
                  </p>
                  {data.reasons
                    .filter((r) => r.proposalId === p.id)
                    .map((r) => (
                      <p key={r.id} className="mt-2 text-caption text-ds-ink-2 break-all">
                        {r.actor} said no because of {REASON_WORDS[r.reason]}.{" "}
                        {r.note && `“${r.note}”`}
                      </p>
                    ))}
                </div>
              ))}
            </Panel>
          </div>
        </div>
      )}
      {rejecting && data && (
        <ActionSheet
          className="admin-sheet admin-sheet-vote"
          title="Reject this change?"
          onClose={() => setRejecting(null)}
        >
          <AdminActionFields
            kind="vote"
            selected=""
            rejection
            onRejection={() => {}}
            reason={reason}
            onReason={setReason}
            note={note}
            onNote={setNote}
            limit=""
            onLimit={() => {}}
            invalidLimit={false}
            subtitle={describe(rejecting.kind, data.shippers, name).title}
          />
          <div className="admin-sheet-actions flex justify-end gap-10">
            <Button variant="quiet" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={<X size={17} />}
              disabled={!reason}
              loading={busy === rejecting.id}
              loadingLabel="Waiting for wallet"
              onClick={() => void vote(rejecting, false)}
            >
              Reject
            </Button>
          </div>
        </ActionSheet>
      )}
    </>
  );
}

function ProposalCard({
  proposal: p,
  shippers,
  reasons,
  me,
  busy,
  onApprove,
  onReject,
}: {
  proposal: Proposal;
  shippers: Record<string, Shipper | null>;
  reasons: ProposalReason[];
  me: string;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const name = useNames([shipperOf(p.kind)]);
  const change = describe(p.kind, shippers, name);
  const voted = p.approvals.includes(me) || p.rejections.includes(me);
  return (
    <Panel className="approval-proposal">
      <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-[17px] leading-21 font-semibold break-all">{change.title}</h2>
          <p className="text-[13px] leading-16 text-ds-muted break-all">
            {p.from_assistant ? "Suggested by the credit assistant" : `Proposed by ${p.by}`} ·{" "}
            {day(p.created_at)} · #{p.id}
          </p>
        </div>
        <AdminBadge tone="brand">Waiting for the team</AdminBadge>
      </div>
      {change.to !== undefined && (
        <div className="approval-change flex flex-wrap items-center gap-12">
          <span className="text-[22px] leading-27 font-semibold text-ds-muted md:text-[28px] md:leading-34">
            {change.from === undefined ? "Now" : formatUsdc(change.from)}
          </span>
          <ArrowRight size={20} className="shrink-0" />
          <Money
            amount={String(change.to)}
            className="text-[22px] leading-27 font-semibold md:text-[28px] md:leading-34 [&>span]:font-semibold"
          />
        </div>
      )}
      {reasons.map((r) => (
        <p
          key={r.id}
          className="rounded-[14px] bg-ds-danger-stamp p-14 text-[13px] leading-16 text-ds-report-ink break-all"
        >
          {r.actor} said no because of {REASON_WORDS[r.reason]}. {r.note && `“${r.note}”`}
        </p>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-16 pt-16">
        <p className="text-[14px] leading-17">
          {p.approvals.length} of 2 approved
          {p.rejections.length > 0 && ` · ${p.rejections.length} rejected`}
        </p>
        {voted ? (
          <p className="text-[13px] leading-16 text-ds-ink-2">Your vote is recorded.</p>
        ) : (
          <div className="flex w-full flex-col-reverse gap-10 md:w-auto md:flex-row md:gap-12">
            <Button variant="quiet" className="justify-center" disabled={busy} onClick={onReject}>
              Reject
            </Button>
            <Button
              icon={<Check size={17} weight="bold" />}
              loading={busy}
              loadingLabel="Waiting for wallet"
              onClick={onApprove}
            >
              Approve
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
