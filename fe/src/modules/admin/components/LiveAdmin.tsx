"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  formatUsdc,
  parseUsdc,
  type ApplicationDetail,
  type ApplicationListItem,
  type ApplicationRejectionReason,
  type ApplicationsResponse,
  type CreditReviewResponse,
  type PauseNote,
  type PauseNotesResponse,
  type Pool,
  type Proposal,
  type ProposalKind,
  type ProposalReason,
  type ProposalReasonInput,
  type ProposalReasonsResponse,
  type QueueEntry,
  type Shipment,
  type Shipper,
} from "@waybil/shared";
import { ArrowLeft, ArrowRight, Check, FileText, Pause, Scales, X } from "@phosphor-icons/react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { ProofLink } from "@/components/elements/ProofLink";
import { api, ApiError } from "@/lib/api";
import { useNames } from "@/hooks/useNames";
import { cn } from "@/lib/cn";
import {
  getPool,
  getShipper,
  getTeam,
  getWithdrawQueue,
  listProposals,
  listShipmentsByShipper,
  readAll,
} from "@/lib/near";
import { WAYBIL_CONTRACT } from "@/lib/env";
import { callContract } from "@/lib/wallet";
import { AdminActionFields } from "./AdminActionFields";
import { AdminBadge, AdminTiles, Empty, Fact } from "./AdminScreen";
import "./admin.css";

/*
 * The team screens on testnet data (#87). Votes, proposals and pauses are the member's own
 * wallet transactions. The backend keeps the notes around them (reasons, pause notes) and the
 * shipper applications. It checks `is_member` on every request.
 */

export type AdminView = "approvals" | "shippers" | "shipper" | "pool";

const VOTE_REASONS: Record<string, ProposalReasonInput["reason"]> = {
  "Too big a jump": "too_big_jump",
  "Needs more history": "needs_history",
  "Payment risk": "payment_risk",
  Other: "other",
};
const APPLICATION_REASONS: Record<string, ApplicationRejectionReason> = {
  "Documents do not match": "unclear_documents",
  "Too new": "needs_history",
  "Payment risk": "payment_risk",
  Other: "other",
};
const PAUSE_REASONS: Record<string, "payment_risk" | "late_bills" | "other"> = {
  "Late bill": "late_bills",
  "Report to check": "other",
  Other: "other",
};
const REASON_WORDS: Record<string, string> = {
  too_big_jump: "too big a jump",
  needs_history: "needs more history",
  payment_risk: "payment risk",
  unclear_documents: "the documents do not match",
  late_bills: "late bills",
  other: "another reason",
};
/* Proposals, votes and pauses are small calls. */
const GAS = "50000000000000";

function day(value: string | null | undefined) {
  if (!value) return "";
  const ms = /^\d+$/.test(value) ? Number(BigInt(value) / 1000000n) : Date.parse(value);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(ms));
}
function failure(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return /reject|cancel|denied|closed/i.test(String(error))
    ? "You said no in your wallet. Nothing was sent."
    : "It didn’t go through. Nothing changed. Try again in a moment.";
}
function toUnits(value: string) {
  try {
    return parseUsdc(value);
  } catch {
    return 0n;
  }
}
const asInput = (units: bigint) => String(Number(units) / 1000000);

/** Loads once per key and on reload. Errors become a plain sentence. */
function useLoad<T>(load: () => Promise<T>, key: string) {
  const loader = useRef(load);
  loader.current = load;
  const [result, setResult] = useState<{ key: string; data?: T; error?: string } | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let stale = false;
    loader
      .current()
      .then((data) => !stale && setResult({ key, data }))
      .catch(
        (error: unknown) =>
          !stale &&
          setResult({
            key,
            error:
              error instanceof ApiError
                ? error.message
                : "We could not load this page. Try again in a moment.",
          }),
      );
    return () => {
      stale = true;
    };
  }, [key, version]);
  const current = result?.key === key ? result : null;
  return { data: current?.data, error: current?.error, reload: () => setVersion((v) => v + 1) };
}

/** What a proposal changes, in plain words. */
function describe(
  kind: ProposalKind,
  shippers: Record<string, Shipper | null>,
  name: (accountId: string) => string = (accountId) => accountId,
) {
  if ("StartShipper" in kind)
    return {
      title: `Start ${name(kind.StartShipper.shipper)}`,
      from: 0n,
      to: BigInt(kind.StartShipper.limit),
    };
  if ("SetLimit" in kind) {
    const now = shippers[kind.SetLimit.shipper]?.limit;
    return {
      title: `Change ${name(kind.SetLimit.shipper)}’s limit`,
      from: now === undefined ? undefined : BigInt(now),
      to: BigInt(kind.SetLimit.limit),
    };
  }
  if ("Unpause" in kind) return { title: `Turn ${name(kind.Unpause.shipper)} back on` };
  if ("CoverFromReserve" in kind)
    return { title: `Cover bill #${kind.CoverFromReserve.shipment_id} from the reserve` };
  if ("Upgrade" in kind) return { title: "Install a new version of Waybil" };
  return { title: "Change a team setting" };
}
const shipperOf = (kind: ProposalKind) =>
  "StartShipper" in kind
    ? kind.StartShipper.shipper
    : "SetLimit" in kind
      ? kind.SetLimit.shipper
      : "Unpause" in kind
        ? kind.Unpause.shipper
        : null;

/** A sentence and its record after something was sent. */
type Done = { text: string; tx?: string } | null;
function DoneNote({ done }: { done: Done }) {
  if (!done) return null;
  return (
    <Panel className="gap-8">
      <p className="text-label">{done.text}</p>
      {done.tx && <ProofLink tx={done.tx} />}
    </Panel>
  );
}
function Failed({ error, reload }: { error: string; reload: () => void }) {
  return (
    <Panel>
      <Empty title="Something went wrong" text={error} />
      <Button variant="secondary" className="mx-auto" onClick={reload}>
        Try again
      </Button>
    </Panel>
  );
}
function Loading() {
  return (
    <Panel className="grid min-h-240 place-content-center">
      <p className="text-label text-ds-muted">Loading.</p>
    </Panel>
  );
}

export function LiveAdmin({
  view,
  account,
  me,
}: {
  view: AdminView;
  account?: string;
  me: string;
}) {
  const current =
    view === "approvals" ? "/admin" : view === "pool" ? "/admin/pool" : "/admin/shippers";
  return (
    <div
      className={cn(
        "admin-ui",
        view === "approvals" && "admin-approvals",
        view === "shipper" && "admin-detail",
        view === "pool" && "admin-pool",
      )}
    >
      <RoleShell role="admin" current={current}>
        <div className="flex flex-col gap-24">
          {view === "approvals" ? (
            <Approvals me={me} />
          ) : view === "pool" ? (
            <PoolView />
          ) : view === "shipper" && account ? (
            <ShipperDetail account={account} />
          ) : (
            <Shippers />
          )}
        </div>
      </RoleShell>
    </div>
  );
}

function Header({ title, note }: { title: string; note: string }) {
  return (
    <header>
      <h1 className="text-title break-all">{title}</h1>
      <p className="mt-6 text-label text-ds-muted">{note}</p>
    </header>
  );
}

/* M1. Proposals that need the team, newest first. */
function Approvals({ me }: { me: string }) {
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

/* M2. Applications waiting for review, and the companies already shipping. */
function Shippers() {
  const { data, error, reload } = useLoad(async () => {
    const [{ applications }, proposals] = await Promise.all([
      api<ApplicationsResponse>("/admin/applications"),
      listProposals("Approved", 50),
    ]);
    const names = [
      ...new Set([
        ...applications.filter((a) => a.state === "approved").map((a) => a.shipperId),
        ...proposals.flatMap((p) =>
          "StartShipper" in p.kind ? [p.kind.StartShipper.shipper] : [],
        ),
      ]),
    ];
    const shippers = await Promise.all(names.map(getShipper));
    return {
      waiting: applications.filter((a) => ["in_review", "needs_more"].includes(a.state)),
      active: names
        .map((n, i) => ({ account: n, shipper: shippers[i] }))
        .filter((r): r is { account: string; shipper: Shipper } => !!r.shipper),
    };
  }, "shippers");
  const [deciding, setDeciding] = useState<ApplicationListItem | null>(null);
  const [done, setDone] = useState<Done>(null);
  if (error) return <Failed error={error} reload={reload} />;
  return (
    <>
      <Header title="Shippers" note="New applications and the companies already shipping" />
      <DoneNote done={done} />
      {!data ? (
        <Loading />
      ) : (
        <div className="grid items-start gap-24 lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col gap-20">
            <h2 className="text-[15px] leading-18 font-medium">
              Waiting for review · {data.waiting.length}
            </h2>
            {data.waiting.length === 0 ? (
              <Panel className="admin-empty-applications">
                <Empty
                  title="No new applications"
                  text="New companies show up here when they apply."
                  icon="applications"
                />
              </Panel>
            ) : (
              data.waiting.map((a) => (
                <ApplicationCard key={a.id} application={a} onDecide={() => setDeciding(a)} />
              ))
            )}
          </div>
          <Panel title="Active shippers" className="admin-active-list">
            {data.active.length === 0 ? (
              <Empty
                title="No active shippers yet"
                text="A company shows up here after the team approves its starting limit."
                icon="company"
              />
            ) : (
              <div className="flex flex-col gap-4">
                {data.active.map(({ account, shipper }) => (
                  <Link
                    key={account}
                    href={`/admin/shippers/${account}`}
                    className="admin-company-row focus-ring flex items-center justify-between gap-12 rounded-small py-10"
                  >
                    <p className="min-w-0 text-[15px] leading-18 font-medium break-all">
                      {account}
                    </p>
                    <div className="shrink-0 text-right">
                      <Money amount={shipper.limit} className="text-[15px] leading-18" />
                      <p
                        className={cn(
                          "mt-2 text-[13px] leading-16",
                          shipper.paused || shipper.late_bills
                            ? "text-ds-warning"
                            : "text-ds-success",
                        )}
                      >
                        {shipper.paused
                          ? "Paused"
                          : shipper.late_bills
                            ? `${shipper.late_bills} late`
                            : "On time"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
      {deciding && (
        <DecideSheet
          application={deciding}
          onClose={() => setDeciding(null)}
          onDone={(next) => {
            setDone(next);
            setDeciding(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function ApplicationCard({
  application: a,
  onDecide,
}: {
  application: ApplicationListItem;
  onDecide: () => void;
}) {
  const closer = a.review?.needsCloserLook;
  return (
    <Panel className="admin-application-card">
      <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-[17px] leading-21 font-semibold">{a.company.name}</h2>
          <p className="text-[13px] leading-16 text-ds-muted">
            Applied {day(a.createdAt)} · {a.company.city} · {a.company.trips} trips a month
          </p>
        </div>
        <AdminBadge tone={a.proposalId !== null ? "brand" : closer ? "warning" : "success"}>
          {a.proposalId !== null
            ? "Waiting for the team"
            : closer
              ? "Needs a closer look"
              : a.state === "needs_more"
                ? "Waiting for papers"
                : "Private check"}
        </AdminBadge>
      </div>
      <p className="flex gap-10 rounded-[14px] bg-ds-brand-soft p-14 text-[14px] leading-17 text-ds-brand-deep">
        {a.proposalId !== null
          ? `Proposal #${a.proposalId} is with the team.`
          : a.review?.suggestedLimit
            ? `The assistant suggests a starting limit of ${formatUsdc(BigInt(a.review.suggestedLimit))} USDC.`
            : a.review?.state === "complete"
              ? "The assistant gives no limit. Check the papers."
              : "The private check is still running."}
      </p>
      <div className="admin-card-actions flex items-center justify-between gap-10">
        <ButtonLink variant="secondary" href={`/admin/shippers/${a.shipperId}`}>
          View details
        </ButtonLink>
        {a.proposalId === null && (
          <Button icon={<Scales size={17} />} onClick={onDecide}>
            Decide
          </Button>
        )}
      </div>
    </Panel>
  );
}

/** M2.4 and M2.5. Approve proposes StartShipper from the wallet. Reject tells the company. */
function DecideSheet({
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

/* M2.3, M2.7 and M2.10. One company, live on chain or still applying. */
function ShipperDetail({ account }: { account: string }) {
  const { data, error, reload } = useLoad(async () => {
    const [shipper, { applications }] = await Promise.all([
      getShipper(account),
      api<ApplicationsResponse>("/admin/applications"),
    ]);
    const application =
      applications
        .filter((a) => a.shipperId === account)
        .sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0] ?? null;
    const [detail, review, pauses, shipments] = await Promise.all([
      application
        ? api<ApplicationDetail>(`/admin/applications/${application.id}`)
        : Promise.resolve(null),
      api<CreditReviewResponse>(`/admin/credit/reviews/${account}`)
        .then((r) => r.review)
        .catch(() => null),
      shipper
        ? api<PauseNotesResponse>(`/admin/pauses/${account}`)
            .then((r) => r.notes)
            .catch(() => [] as PauseNote[])
        : Promise.resolve([] as PauseNote[]),
      shipper
        ? readAll((from, limit) => listShipmentsByShipper(account, { from, limit }))
        : Promise.resolve([] as Shipment[]),
    ]);
    return { shipper, application, detail, review, pauses, shipments };
  }, account);
  const [sheet, setSheet] = useState<"limit" | "pause" | "decide" | "proof" | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [proof, setProof] = useState<string | null>(null);

  const back = (
    <Link
      href="/admin/shippers"
      className="focus-ring flex w-fit items-center gap-6 text-[13px] leading-16 text-ds-muted"
    >
      <ArrowLeft size={16} /> Shippers
    </Link>
  );
  if (error)
    return (
      <>
        {back}
        <Failed error={error} reload={reload} />
      </>
    );
  if (!data)
    return (
      <>
        {back}
        <Loading />
      </>
    );
  const { shipper, application, detail, review, pauses, shipments } = data;
  if (!shipper && !application)
    return (
      <>
        {back}
        <Panel>
          <Empty
            title="This company could not be found"
            text="It has not applied and has no limit yet."
            icon="company"
          />
        </Panel>
      </>
    );

  async function send(run: () => Promise<Done>) {
    setBusy(true);
    setSheetError(null);
    try {
      setDone(await run());
      setSheet(null);
      reload();
    } catch (e) {
      setSheetError(failure(e));
    } finally {
      setBusy(false);
    }
  }
  const pause = () =>
    send(async () => {
      const code = PAUSE_REASONS[reason] ?? "other";
      const tx = await callContract(
        WAYBIL_CONTRACT,
        "pause_shipper",
        { shipper: account, reason: code },
        { gas: GAS },
      );
      await api("/admin/pauses", {
        body: { shipperId: account, reason: code, note: note.trim(), txHash: tx },
      }).catch(() => undefined);
      return { text: `${account} is paused. It cannot approve new trips.`, tx };
    });
  const propose = (kind: ProposalKind, text: string) =>
    send(async () => ({
      text,
      tx: await callContract(WAYBIL_CONTRACT, "propose", { kind }, { gas: GAS }),
    }));
  const units = toUnits(limit);
  const invalidLimit = units <= 0n || units > 10000000000n;

  const reviewPanel = review && (
    <Panel
      title="Assistant’s view"
      className="admin-assessment"
      action={
        <AdminBadge tone={review.needsCloserLook ? "warning" : "success"}>
          {review.needsCloserLook ? "Needs a closer look" : "Private check"}
        </AdminBadge>
      }
    >
      <Fact
        label="Suggested limit"
        value={
          review.suggestedLimit ? <Money amount={review.suggestedLimit} /> : "No limit suggested"
        }
      />
      <Fact label="Checked" value={day(review.completedAt ?? review.createdAt)} />
      {review.reasons.map((r) => (
        <p key={r} className="text-label text-ds-ink-2">
          {r}
        </p>
      ))}
      {review.proof && (
        <button
          type="button"
          className="link focus-ring w-fit text-caption"
          onClick={async () => {
            setSheet("proof");
            setProof(null);
            setProof(
              JSON.stringify(
                await api(`/credit/reviews/${review.id}/proof`).catch((e: unknown) => failure(e)),
                null,
                2,
              ),
            );
          }}
        >
          Open the private check proof
        </button>
      )}
    </Panel>
  );

  return (
    <>
      {back}
      <header className="flex flex-wrap items-center justify-between gap-12 md:items-end">
        <div className="min-w-0">
          <h1 className="text-title break-all">{application?.company.name ?? account}</h1>
          <p className="mt-6 text-label text-ds-muted break-all">
            {shipper ? `Active shipper · ${account}` : `Applied ${day(application?.createdAt)}`}
          </p>
        </div>
        {!shipper && application && application.proposalId === null && (
          <Button icon={<Scales size={17} />} onClick={() => setSheet("decide")}>
            Decide
          </Button>
        )}
      </header>
      <DoneNote done={done} />
      <div className="admin-detail-grid grid items-start gap-24 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex min-w-0 flex-col gap-24">
          {shipper ? (
            <Panel title="Credit">
              <AdminTiles
                items={[
                  { label: "Limit", value: <Money amount={shipper.limit} /> },
                  {
                    label: "In use",
                    value: (
                      <Money amount={String(BigInt(shipper.owed) + BigInt(shipper.committed))} />
                    ),
                  },
                  {
                    label: "Shipments",
                    value: `${shipments.length} · ${shipments.filter((s) => s.status === "Repaid").length} repaid`,
                  },
                ]}
              />
              <Fact
                label="New trips"
                value={
                  shipper.paused
                    ? `Paused for ${REASON_WORDS[shipper.paused] ?? shipper.paused}`
                    : "Allowed"
                }
              />
              <Fact label="Late bills" value={String(shipper.late_bills)} />
              <div className="flex flex-wrap gap-10 pt-8">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setLimit(asInput(BigInt(shipper.limit)));
                    setNote("");
                    setSheetError(null);
                    setSheet("limit");
                  }}
                >
                  Change limit
                </Button>
                {shipper.paused ? (
                  <Button
                    variant="secondary"
                    loading={busy}
                    onClick={() =>
                      void propose(
                        { Unpause: { shipper: account } },
                        `You asked the team to turn ${account} back on.`,
                      )
                    }
                  >
                    Turn back on
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    icon={<Pause size={17} />}
                    onClick={() => {
                      setReason("");
                      setNote("");
                      setSheetError(null);
                      setSheet("pause");
                    }}
                  >
                    Pause new shipments
                  </Button>
                )}
              </div>
            </Panel>
          ) : (
            detail && (
              <>
                <Panel title="Company" className="admin-company-details">
                  <div>
                    {[
                      { label: "Registration ID", value: detail.application.company.registration },
                      { label: "Country", value: detail.application.company.country },
                      {
                        label: "Address",
                        value: `${detail.application.company.address}, ${detail.application.company.city}`,
                      },
                      {
                        label: "Contact",
                        value: `${detail.application.company.contact} · ${detail.application.company.job}`,
                      },
                      { label: "Phone", value: detail.application.company.phone },
                      { label: "Email", value: detail.application.company.email },
                    ].map((c) => (
                      <Fact key={c.label} {...c} />
                    ))}
                  </div>
                </Panel>
                <Panel title="Documents" className="admin-documents">
                  {detail.documents.length === 0 && (
                    <p className="text-label text-ds-muted">No papers were uploaded.</p>
                  )}
                  {detail.documents.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-12 rounded-small bg-ds-canvas px-12 py-10"
                    >
                      <span className="grid size-32 shrink-0 place-items-center rounded-small bg-ds-bg">
                        <FileText size={18} />
                      </span>
                      <p className="min-w-0 flex-1 text-[14px] leading-17 font-medium">
                        {d.kind === "registration"
                          ? "Business registration"
                          : d.kind === "tax_id"
                            ? "Tax ID"
                            : "Bank statement"}
                      </p>
                      <a
                        className="link focus-ring shrink-0 text-[13px] leading-16"
                        href={d.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open ↗
                      </a>
                    </div>
                  ))}
                  <p className="text-caption text-ds-muted">
                    Links work for 5 minutes. Reload the page for new ones.
                  </p>
                </Panel>
                <Panel title="Shipping profile">
                  <AdminTiles
                    items={[
                      { label: "Trips per month", value: String(detail.application.company.trips) },
                      {
                        label: "Spend per month",
                        value: <Money amount={detail.application.company.shippingSpend} />,
                      },
                    ]}
                  />
                  <Fact label="Main routes" value={detail.application.company.routes} />
                </Panel>
              </>
            )
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-24">
          {reviewPanel}
          {shipper && (
            <Panel title="Pauses">
              {pauses.length === 0 && (
                <p className="text-label text-ds-muted">The team has not paused this company.</p>
              )}
              {pauses.map((p) => (
                <div key={p.id} className="py-8">
                  <p className="text-label break-all">
                    {p.actor} paused it for {REASON_WORDS[p.reason]} on {day(p.createdAt)}.
                  </p>
                  {p.note && <p className="text-caption text-ds-ink-2">{p.note}</p>}
                  <ProofLink tx={p.txHash} className="text-caption" />
                </div>
              ))}
            </Panel>
          )}
        </div>
      </div>
      {sheet === "decide" && application && (
        <DecideSheet
          application={{ ...application, review }}
          onClose={() => setSheet(null)}
          onDone={(next) => {
            setDone(next);
            setSheet(null);
            reload();
          }}
        />
      )}
      {(sheet === "limit" || sheet === "pause") && shipper && (
        <ActionSheet
          className={`admin-sheet admin-sheet-${sheet}`}
          title={
            sheet === "limit" ? `Change ${account}’s limit` : `Pause ${account}’s new shipments?`
          }
          onClose={() => setSheet(null)}
        >
          <AdminActionFields
            kind={sheet}
            selected={account}
            rejection={false}
            onRejection={() => {}}
            reason={reason}
            onReason={setReason}
            note={note}
            onNote={setNote}
            limit={limit}
            onLimit={setLimit}
            invalidLimit={sheet === "limit" && invalidLimit}
            subtitle={
              sheet === "limit"
                ? `Now ${formatUsdc(BigInt(shipper.limit))} USDC · ${formatUsdc(BigInt(shipper.owed) + BigInt(shipper.committed))} in use`
                : undefined
            }
            hint="It cannot go above 10,000.00 USDC."
          />
          {sheetError && (
            <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
              {sheetError}
            </p>
          )}
          <div className="admin-sheet-actions flex justify-end gap-10">
            <Button variant="quiet" onClick={() => setSheet(null)}>
              Cancel
            </Button>
            {sheet === "limit" ? (
              <Button
                disabled={invalidLimit || !note.trim()}
                loading={busy}
                loadingLabel="Waiting for wallet"
                onClick={() =>
                  void propose(
                    { SetLimit: { shipper: account, limit: String(units) } },
                    `You asked the team to change the limit to ${formatUsdc(units)} USDC.`,
                  )
                }
              >
                Send to the team
              </Button>
            ) : (
              <Button
                variant="danger"
                icon={<Pause size={17} />}
                disabled={!reason}
                loading={busy}
                loadingLabel="Waiting for wallet"
                onClick={() => void pause()}
              >
                Pause
              </Button>
            )}
          </div>
        </ActionSheet>
      )}
      {sheet === "proof" && (
        <ActionSheet title="Private check proof" onClose={() => setSheet(null)}>
          <pre className="max-h-[50dvh] overflow-auto rounded-small bg-ds-canvas p-12 text-[12px] leading-16 break-all whitespace-pre-wrap">
            {proof ?? "Loading."}
          </pre>
          <Button onClick={() => setSheet(null)}>Done</Button>
        </ActionSheet>
      )}
    </>
  );
}

/* M3. Where the investors' money is right now. */
function PoolView() {
  const { data, error, reload } = useLoad(
    () =>
      Promise.all([getPool(), readAll((from, limit) => getWithdrawQueue({ from, limit }))]).then(
        ([pool, queue]): { pool: Pool; queue: QueueEntry[] } => ({ pool, queue }),
      ),
    "pool",
  );
  if (error) return <Failed error={error} reload={reload} />;
  const p = data?.pool;
  const value = p ? BigInt(p.cash) + BigInt(p.lent) - BigInt(p.queued) - BigInt(p.fees) : 0n;
  const free = p ? BigInt(p.cash) - BigInt(p.committed) - BigInt(p.queued) - BigInt(p.fees) : 0n;
  return (
    <>
      <Header title="Pool" note="Where the investors’ money is right now" />
      {!p || !data ? (
        <Loading />
      ) : (
        <>
          {value > 0n && free * 10n < value && (
            <div className="admin-pool-alert flex items-start gap-12 rounded-[20px] bg-ds-warning-soft p-16 text-ds-warning-ink">
              <p className="text-[13px] leading-16">
                Only {formatUsdc(free)} USDC is free. New advances wait until repayments come in.
              </p>
            </div>
          )}
          <Panel title="The pool">
            <AdminTiles
              items={[
                { label: "Pool value", value: <Money amount={String(value)} /> },
                { label: "Free now", value: <Money amount={String(free)} /> },
                { label: "Paid out early", value: <Money amount={p.lent} /> },
              ]}
            />
            <AdminTiles
              items={[
                { label: "Promised to approved trips", value: <Money amount={p.committed} /> },
                { label: "Safety reserve", value: <Money amount={p.reserve} /> },
                { label: "Waybil fees to claim", value: <Money amount={p.fees} /> },
              ]}
            />
          </Panel>
          <Panel title="Withdrawals waiting">
            {data.queue.length === 0 ? (
              <p className="text-label text-ds-muted">No investor is waiting for a withdrawal.</p>
            ) : (
              data.queue.map((q, i) => (
                <Fact
                  key={`${q.investor}-${q.requested_at}`}
                  label={`${i + 1}. ${q.investor} · ${day(q.requested_at)}`}
                  value={<Money amount={q.amount} />}
                />
              ))
            )}
          </Panel>
        </>
      )}
    </>
  );
}
