"use client";
import { useState } from "react";
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
import { FileText, Pause, Scales } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { ProofLink } from "@/components/elements/ProofLink";
import { BackLink } from "@/components/elements/BackLink";
import { api } from "@/lib/api";
import { getShipper, listShipmentsByShipper, readAll } from "@/lib/near";
import { WAYBIL_CONTRACT } from "@/lib/env";
import { callContract } from "@/lib/wallet";
import { AdminActionFields } from "../AdminActionFields";
import { AdminBadge, AdminTiles, Empty, Fact } from "../AdminParts";
import { DecideSheet } from "./DecideSheet";
import {
  asInput,
  day,
  DoneNote,
  failure,
  Failed,
  GAS,
  Loading,
  REASON_WORDS,
  toUnits,
  useLoad,
  type Done,
} from "./shared";

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
  }, account);
  const [sheet, setSheet] = useState<"limit" | "pause" | "decide" | "proof" | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [proof, setProof] = useState<string | null>(null);

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
