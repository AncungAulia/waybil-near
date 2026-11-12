"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useInvalidate } from "@/hooks/useInvalidate";
import { qk } from "@/lib/queryKeys";
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
import { Tag } from "@/components/ui/Tag";
import { Money } from "@/components/elements/Money";
import { api } from "@/lib/api";
import { useNames } from "@/hooks/useNames";
import { getProposal, getShipper, getTeam, listProposals } from "@/lib/near";
import { WAYBIL_CONTRACT } from "@/lib/env";
import { callContract } from "@/lib/wallet";
import { notify } from "@/lib/notify";
import { ResultDialog } from "@/components/elements/ResultDialog";
import { AdminActionFields } from "../AdminActionFields";
import { AdminBadge, Empty, Fact } from "../AdminParts";
import {
  day,
  describe,
  failure,
  Failed,
  GAS,
  Header,
  Loading,
  REASON_WORDS,
  shipperOf,
  useLoad,
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
  const [rejecting, setRejecting] = useState<Proposal | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  /* A vote that makes a change go through opens a dialog. Other votes end with a toast. */
  const [passed, setPassed] = useState<{
    title: string;
    amount?: string;
    text: string;
    tx: string;
  } | null>(null);
  const invalidate = useInvalidate();
  const name = useNames(data?.proposals.map((p) => shipperOf(p.kind)) ?? []);

  /* Records the vote, then saves the reason for a rejection with the backend. */
  async function record({ p, approve }: { p: Proposal; approve: boolean }) {
    const tx = await callContract(WAYBIL_CONTRACT, "vote", { id: p.id, approve }, { gas: GAS });
    /* Two approvals carry it out. Read it back to know, since a late vote can expire it. */
    const after = approve ? await getProposal(p.id).catch(() => null) : null;
    const approved = approve && (after ? after.status === "Approved" : p.approvals.length >= 1);
    let text = !approve
      ? "The reason is saved with it."
      : after?.status === "Expired"
        ? "It had expired, so nothing changed."
        : "It goes through when one more member approves it.";
    if (!approve) {
      const body = { reason: VOTE_REASONS[reason] ?? "other", note: note.trim() };
      /* The vote must be final before the backend sees it, so try once more after a moment. */
      await api(`/admin/proposals/${p.id}/reasons`, { body }).catch(async () => {
        await new Promise((wait) => setTimeout(wait, 2500));
        await api(`/admin/proposals/${p.id}/reasons`, { body }).catch(() => {
          text = "The reason could not be saved.";
        });
      });
    }
    return { text, tx, approved };
  }
  const voting = useMutation({
    mutationFn: record,
    onSuccess: ({ text, tx, approved }, { p, approve }) => {
      if (approved) setPassed({ ...outcome(p, name), tx });
      else
        notify.success(approve ? "Your approval is recorded" : "Your rejection is recorded", {
          meta: text,
          tx,
        });
      setRejecting(null);
      /* A vote can start a shipper or change a limit, which other team pages show too. */
      void invalidate(qk.allAdmin());
    },
    /* A rejection keeps its error in the open sheet. An approval shows a toast. */
    onError: (e, { approve }) =>
      approve
        ? notify.error("Your approval was not sent", { meta: failure(e) })
        : setRejectError(failure(e)),
  });
  /* The proposal being voted on, while its wallet request is open. */
  const busy = voting.isPending ? voting.variables.p.id : null;
  function vote(p: Proposal, approve: boolean) {
    setRejectError(null);
    voting.mutate({ p, approve });
  }

  if (error) return <Failed error={error} reload={reload} />;
  const open = data?.proposals.filter((p) => p.status === "Open") ?? [];
  const closed = data?.proposals.filter((p) => p.status !== "Open").slice(0, 6) ?? [];
  return (
    <>
      <Header title="Approvals" note="Changes that need the team" />
      {!data ? (
        <Loading label="Loading the approvals." />
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
                  onApprove={() => vote(p, true)}
                  onReject={() => {
                    setReason("");
                    setNote("");
                    setRejectError(null);
                    setRejecting(p);
                  }}
                />
              ))
            )}
          </div>
          {/*
           * The whole column stays in view while the proposals scroll. The decided list shows the
           * latest five, so the column fits the window without a scroll of its own.
           */}
          <div className="flex flex-col gap-24 lg:sticky lg:top-104">
            <Panel className="approval-team shrink-0">
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
              {closed.slice(0, 5).map((p) => (
                <div key={p.id} className="approval-recent-row py-12">
                  <p className="flex flex-wrap items-center gap-x-8 gap-y-2 text-label font-medium break-all">
                    {describe(p.kind, data.shippers, name).title}
                    <Tag>{p.status}</Tag>
                  </p>
                  <p className="text-caption text-ds-muted">
                    Proposed {day(p.created_at)}. {p.approvals.length} approved and{" "}
                    {p.rejections.length} rejected.
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
          {rejectError && (
            <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
              {rejectError}
            </p>
          )}
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
              onClick={() => vote(rejecting, false)}
            >
              Reject
            </Button>
          </div>
        </ActionSheet>
      )}
      {passed && (
        <ResultDialog
          title={passed.title}
          amount={passed.amount}
          tx={passed.tx}
          onClose={() => setPassed(null)}
        >
          {passed.text}
        </ResultDialog>
      )}
    </>
  );
}

/** What a change that just went through did, in a short title and a sentence. */
function outcome(
  p: Proposal,
  name: (accountId: string) => string,
): { title: string; amount?: string; text: string } {
  const k = p.kind;
  if ("StartShipper" in k) {
    const company = name(k.StartShipper.shipper);
    return {
      title: `${company} is live`,
      amount: k.StartShipper.limit,
      text: `The team approved it. ${company} can send shipments up to this limit now.`,
    };
  }
  if ("SetLimit" in k)
    return {
      title: "Limit changed",
      amount: k.SetLimit.limit,
      text: `The team approved it. This is ${name(k.SetLimit.shipper)}’s new limit.`,
    };
  if ("Unpause" in k)
    return {
      title: `${name(k.Unpause.shipper)} is back on`,
      text: "The team approved it. The company can send new shipments again.",
    };
  if ("CoverFromReserve" in k)
    return {
      title: "Bill covered",
      text: `The team approved it. The reserve paid bill #${k.CoverFromReserve.shipment_id}.`,
    };
  if ("Upgrade" in k)
    return { title: "New version approved", text: "The team approved the new version of Waybil." };
  return { title: "Setting changed", text: "The team approved it. The new setting is in use now." };
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
            {p.from_assistant ? "Suggested by the credit assistant" : `Proposed by ${p.by}`} on{" "}
            {day(p.created_at)}. This is proposal #{p.id}.
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
          {p.rejections.length > 0 && ` and ${p.rejections.length} rejected`}
        </p>
        {voted ? (
          <p className="text-[13px] leading-16 text-ds-ink-2">Your vote is recorded.</p>
        ) : (
          <div className="grid w-full grid-cols-2 gap-10 md:flex md:w-auto md:gap-12">
            <Button
              variant="quiet"
              className="w-full min-w-0 justify-center md:w-auto"
              disabled={busy}
              onClick={onReject}
            >
              Reject
            </Button>
            <Button
              icon={<Check size={17} weight="bold" />}
              className="w-full min-w-0 md:w-auto"
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
