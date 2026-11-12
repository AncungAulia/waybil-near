"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useInvalidate } from "@/hooks/useInvalidate";
import { qk } from "@/lib/queryKeys";
import {
  formatUsdc,
  type ApplicationDetail,
  type ApplicationsResponse,
  type CreditReviewResponse,
  type PauseNote,
  type PauseNotesResponse,
  type ProposalKind,
  type Shipment,
} from "@waybil/shared";
import {
  CheckCircle,
  FileText,
  Package,
  Pause,
  Scales,
  Truck,
  Warning,
} from "@phosphor-icons/react";
import { accountLabel } from "@/lib/accountLabel";
import { FanMeter } from "@/components/elements/FanMeter";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Money } from "@/components/elements/Money";
import { ProofLink } from "@/components/elements/ProofLink";
import { BackLink } from "@/components/elements/BackLink";
import { Skeleton, SkeletonGroup } from "@/components/elements/Skeleton";
import { api } from "@/lib/api";
import { getShipper, listShipmentsByShipper, readAll } from "@/lib/near";
import { WAYBIL_CONTRACT } from "@/lib/env";
import { callContract } from "@/lib/wallet";
import { notify } from "@/lib/notify";
import { AdminActionFields } from "../AdminActionFields";
import { AdminBadge, AdminTiles, Empty, Fact } from "../AdminParts";
import { DecideSheet } from "./DecideSheet";
import {
  asInput,
  day,
  failure,
  Failed,
  GAS,
  Loading,
  REASON_WORDS,
  toUnits,
  useLoad,
} from "./shared";

/** The toast a sent action ends with. */
type Note = { title: string; meta: string; tx: string };

const PAUSE_REASONS: Record<string, "payment_risk" | "late_bills" | "other"> = {
  "Late bill": "late_bills",
  "Report to check": "other",
  Other: "other",
};

/* M2.3, M2.7 and M2.10. One company, live on chain or still applying. */
export function ShipperDetail({ account }: { account: string }) {
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
  }, `shipper:${account}`);
  const [sheet, setSheet] = useState<"limit" | "pause" | "decide" | "proof" | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [limit, setLimit] = useState("");
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [proof, setProof] = useState<string | null>(null);
  const invalidate = useInvalidate();
  const action = useMutation({
    mutationFn: (run: () => Promise<Note>) => run(),
    onSuccess: ({ title, meta, tx }) => {
      notify.success(title, { meta, tx });
      setSheet(null);
      /* A pause or a proposal shows on this page, in the list and in approvals. */
      void invalidate(qk.allAdmin());
    },
    /* An error from an open sheet stays next to its button. Otherwise it is a toast. */
    onError: (e) =>
      sheet ? setSheetError(failure(e)) : notify.error("It was not sent", { meta: failure(e) }),
  });
  const busy = action.isPending;

  const back = <BackLink href="/admin/shippers">Shippers</BackLink>;
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
        <Loading label="Loading this company." />
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

  function send(run: () => Promise<Note>) {
    setSheetError(null);
    action.mutate(run);
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
      return { title: `${title} is paused`, meta: "It cannot approve new trips now.", tx };
    });
  /* A proposal counts as the sender's approval, so it needs one more member. */
  const propose = (kind: ProposalKind, meta: string) =>
    send(async () => ({
      title: "Sent to the team",
      meta,
      tx: await callContract(WAYBIL_CONTRACT, "propose", { kind }, { gas: GAS }),
    }));
  const title = application?.company.name ?? accountLabel(account);
  const used = shipper ? BigInt(shipper.owed) + BigInt(shipper.committed) : 0n;
  const cap = shipper ? BigInt(shipper.limit) : 0n;
  const free = cap > used ? cap - used : 0n;
  const usedShare = cap > 0n ? Number((used * 1000n) / cap) / 1000 : 0;
  const repaid = shipments.filter((sh) => sh.status === "Repaid").length;
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
        <div className="flex min-w-0 items-center gap-16">
          <div className="min-w-0">
            <h1 className="text-title truncate" title={account}>
              {title}
            </h1>
            <p className="mt-6 flex flex-wrap items-center gap-8 text-label text-ds-muted">
              {shipper ? (
                <>
                  <Tag>Active shipper</Tag>
                  {shipper.paused && <Tag>Paused</Tag>}
                </>
              ) : (
                `Applied ${day(application?.createdAt)}`
              )}
            </p>
          </div>
        </div>
        {!shipper && application && application.proposalId === null && (
          <Button
            icon={<Scales size={17} />}
            className="w-full md:w-auto"
            onClick={() => setSheet("decide")}
          >
            Decide
          </Button>
        )}
      </header>
      {/* Both columns fill the window and end level. */}
      <div className="admin-detail-grid grid gap-24 lg:min-h-[calc(100dvh-300px)] lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex min-w-0 flex-col gap-24">
          {shipper ? (
            <>
              <section className="flex flex-col gap-20 rounded-card bg-ds-bg p-24">
                {/*
                 * The badge sits top right, level with the label, on every screen. The label
                 * gives way with an ellipsis, so the two never overlap, and the amount has the
                 * full width below.
                 */}
                <div>
                  <div className="flex min-w-0 items-center justify-between gap-12">
                    <p className="min-w-0 truncate text-label text-ds-muted">Credit limit</p>
                    <AdminBadge tone={shipper.paused ? "warning" : "success"}>
                      {shipper.paused
                        ? `Paused for ${REASON_WORDS[shipper.paused] ?? shipper.paused}`
                        : "New trips allowed"}
                    </AdminBadge>
                  </div>
                  <Money amount={shipper.limit} className="mt-4 block text-amount" />
                </div>
                <div className="flex flex-col gap-8">
                  <FanMeter
                    value={usedShare}
                    label="Credit used"
                    describe={(at, inUse) => {
                      const mark = (cap * BigInt(Math.round(at * 1000))) / 1000n;
                      return `The ${formatUsdc(mark)} USDC mark of the limit is ${inUse ? "in use" : "free"}.`;
                    }}
                    className="w-full"
                  />
                  <p className="text-caption text-ds-muted">
                    {formatUsdc(used)} USDC in use. {formatUsdc(free)} USDC free.
                  </p>
                </div>
                {/* On a phone the two actions stack at full width, so neither label is cut. */}
                <div className="grid gap-10 md:flex md:flex-wrap">
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
                          "It turns back on when one more member approves it.",
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
              </section>
              <Panel title="Shipments" className="flex-1">
                <div className="grid grid-cols-3 gap-8">
                  {[
                    { label: "In total", value: shipments.length, icon: <Package size={18} /> },
                    { label: "Repaid", value: repaid, icon: <CheckCircle size={18} /> },
                    { label: "Late bills", value: shipper.late_bills, icon: <Warning size={18} /> },
                  ].map((t) => (
                    <div
                      key={t.label}
                      className="flex flex-col gap-8 rounded-row bg-ds-canvas p-14"
                    >
                      <span className="grid size-32 place-items-center rounded-full bg-ds-bg">
                        {t.icon}
                      </span>
                      <p className="text-[22px] leading-26 font-semibold">{t.value}</p>
                      <p className="text-caption text-ds-muted">{t.label}</p>
                    </div>
                  ))}
                </div>
                {shipments.length === 0 ? (
                  <p className="text-label text-ds-muted">No shipments yet.</p>
                ) : (
                  <div className="-mx-12 flex flex-col">
                    {[...shipments]
                      .sort((x, y) => y.id - x.id)
                      .slice(0, 5)
                      .map((sh) => (
                        <div
                          key={sh.id}
                          className="flex items-center gap-12 rounded-row px-12 py-10"
                        >
                          <span className="grid size-36 shrink-0 place-items-center rounded-full bg-ds-canvas">
                            <Truck size={17} />
                          </span>
                          <p className="min-w-0 flex-1 truncate text-label font-medium">
                            Shipment #{sh.id}
                          </p>
                          <Tag className="shrink-0">{sh.status}</Tag>
                          <Money
                            amount={sh.bill}
                            className="w-120 shrink-0 text-right text-label"
                          />
                        </div>
                      ))}
                  </div>
                )}
              </Panel>
            </>
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
                        value: (
                          <span className="inline-flex flex-wrap items-center gap-8">
                            {detail.application.company.contact}
                            <Tag>{detail.application.company.job}</Tag>
                          </span>
                        ),
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
                        Open the paper ↗
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
            <Panel title="Pauses" className="flex-1">
              {pauses.length === 0 && (
                <div className="grid flex-1 place-content-center justify-items-center gap-10 py-24 text-center">
                  <span className="grid size-56 place-items-center rounded-full bg-ds-canvas text-ds-muted">
                    <CheckCircle size={26} />
                  </span>
                  <p className="text-[16px] leading-20 font-medium">No pauses</p>
                  <p className="max-w-280 text-label text-ds-muted">
                    The team has not paused this company.
                  </p>
                </div>
              )}
              {pauses.map((p) => (
                <div key={p.id} className="py-8">
                  <p className="text-label break-all">
                    {accountLabel(p.actor)} paused it for {REASON_WORDS[p.reason]} on{" "}
                    {day(p.createdAt)}.
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
          onDone={() => setSheet(null)}
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
                ? `The limit is ${formatUsdc(BigInt(shipper.limit))} USDC now, and ${formatUsdc(BigInt(shipper.owed) + BigInt(shipper.committed))} is in use.`
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
                    `The new limit of ${formatUsdc(units)} USDC needs one more approval.`,
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
          {proof === null ? (
            <SkeletonGroup label="Loading the proof." className="flex flex-col gap-10 py-12">
              <Skeleton className="w-4/5" />
              <Skeleton className="w-full" />
              <Skeleton className="w-3/5" />
              <Skeleton className="w-11/12" />
              <Skeleton className="w-2/3" />
            </SkeletonGroup>
          ) : (
            <pre className="max-h-[50dvh] overflow-auto rounded-small bg-ds-canvas p-12 text-[12px] leading-16 break-all whitespace-pre-wrap">
              {proof}
            </pre>
          )}
          <Button onClick={() => setSheet(null)}>Done</Button>
        </ActionSheet>
      )}
    </>
  );
}
