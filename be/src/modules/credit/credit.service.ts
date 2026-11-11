import { readProposals, readShipperShipments } from "../../lib/contract-reads";
import { DefinitiveTransactionError } from "../../lib/near-sdk";
import { logError } from "../../lib/logger";
import { randomUUID } from "node:crypto";
import type {
  Application,
  CompanyInput,
  CreditReviewInfo,
  Principal,
  Shipper,
  Shipment,
} from "@waybil/shared";
import { z } from "zod";
import type { Store, Snapshot } from "../../types/db";
import type { Chain } from "../../lib/near";
import type { Leases } from "../../lib/leases";
import type { Env } from "../../config/env";
import { allowed, ApiException, requireValue } from "../../lib/errors";
import { sha256, type FileStore } from "../../lib/storage";
import { UnreadablePapers, type PaperReader, type ProofEvidence } from "../../lib/near-ai";
import type { ApplicationDocument } from "../applications/applications.service";
import type { CreditWriter, PreparedCredit } from "./credit.writer";
import {
  policyFrom,
  targetLimit,
  amount,
  type CreditPolicy,
  type ExtractedPapers,
} from "./credit.schema";

export interface CreditRow extends CreditReviewInfo {
  applicationId: string;
  submissionNumber: number;
  company: CompanyInput;
  documents: ApplicationDocument[];
  policy: CreditPolicy | null;
  baselineRepaid: number[];
  evidence: ProofEvidence | null;
  papers: ExtractedPapers | null;
  intent: PreparedCredit | null;
  applicationApplied: boolean;
  decision: boolean;
  attempts: number;
  nextAttemptAt?: string;
}
const configSchema = z.object({
  max_limit: amount,
  assistant_raise_bps: z.number().int().min(0).max(10000),
  proposal_ttl_days: z.number().int().positive().max(365),
});
const normalized = (v: string) =>
  v
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
export class Credit {
  constructor(
    private store: Store,
    private chain: Chain,
    private files: FileStore,
    private reader: PaperReader,
    private writer: CreditWriter,
    private leases: Leases,
    private env: Env,
    private now = () => Date.now(),
  ) {}
  async beginInitial(app: Application): Promise<string> {
    const id = sha256(`initial:${app.id}:${app.submissionNumber}`);
    return this.leases.run(`review-request:${app.shipperId}`, async () => {
      const existing = await this.store.get<CreditRow>("credit_reviews", id);
      if (existing) return id;
      // No cooldown here. Each submission has its own id, and a resubmission is only
      // possible after a review asked for clearer papers.
      const documents = await this.documents(app);
      await this.store.insert(
        "credit_reviews",
        id,
        this.newRow(id, app, documents, "initial", [], policyFrom(this.env.CREDIT_POLICY_JSON)),
      );
      return id;
    });
  }
  async request(actor: Principal): Promise<CreditReviewInfo> {
    allowed(actor.role === "shipper");
    return this.leases.run(`review-request:${actor.accountId}`, async () => {
      const rows = await this.store.list<CreditRow>("credit_reviews", {
        shipperId: actor.accountId,
      });
      const active = rows.find((r) => r.value.state !== "complete");
      if (active) return this.info(active.value);
      const history = await this.eligible(actor.accountId);
      await this.cooldown(actor.accountId);
      const app = requireValue(
        (await this.store.list<Application>("applications", { shipperId: actor.accountId }))
          .filter((r) => r.value.state !== "rejected")
          .sort((a, b) => b.value.createdAt.localeCompare(a.value.createdAt))[0],
      ).value;
      const id = randomUUID();
      const row = this.newRow(
        id,
        app,
        await this.documents(app),
        "review",
        history.filter((s) => s.status === "Repaid").map((s) => s.id),
        policyFrom(this.env.CREDIT_POLICY_JSON),
      );
      await this.store.insert("credit_reviews", id, row);
      return this.info(row);
    });
  }
  async latest(actor: Principal, shipper = actor.accountId): Promise<CreditReviewInfo> {
    allowed(
      shipper === actor.accountId ||
        (await this.chain.view<boolean>("is_member", { account_id: actor.accountId })),
    );
    const rows = await this.store.list<CreditRow>("credit_reviews", { shipperId: shipper });
    return this.info(
      requireValue(rows.sort((a, b) => b.value.createdAt.localeCompare(a.value.createdAt))[0])
        .value,
    );
  }
  async proof(actor: Principal, id: string) {
    const row = requireValue(await this.store.get<CreditRow>("credit_reviews", id));
    allowed(
      row.value.shipperId === actor.accountId ||
        (await this.chain.view<boolean>("is_member", { account_id: actor.accountId })),
    );
    return requireValue(row.value.evidence);
  }
  async tick(limit = 5) {
    let deferred = 0;
    for (const pending of (
      await this.store.list<Application>("applications", { state: "in_review", reviewId: null })
    ).slice(0, limit)) {
      try {
        const id = await this.beginInitial(pending.value);
        await this.leases.run(`application:${pending.value.id}`, async () => {
          const app = requireValue(
            await this.store.get<Application>("applications", pending.value.id),
          );
          if (
            app.value.state === "in_review" &&
            !app.value.reviewId &&
            app.value.submissionNumber === pending.value.submissionNumber
          )
            await this.store.replace<Application>("applications", app.value.id, app.version, {
              ...app.value,
              reviewId: id,
            });
        });
      } catch (error) {
        logError("credit_tick", error);
        deferred++;
      }
    }
    const rows = (await this.store.list<CreditRow>("credit_reviews"))
      .filter(
        (r) =>
          (r.value.state !== "complete" || !r.value.applicationApplied) &&
          (!r.value.nextAttemptAt || Date.parse(r.value.nextAttemptAt) <= this.now()),
      )
      .sort((a, b) => a.value.createdAt.localeCompare(b.value.createdAt))
      .slice(0, limit);
    let processed = 0;
    for (const row of rows) {
      try {
        await this.work(row.value.id);
        processed++;
      } catch (error) {
        logError("credit_tick", error);
        deferred++;
      }
    }
    return { processed, deferred };
  }
  async work(id: string): Promise<CreditReviewInfo> {
    return this.leases.run(`credit:${id}`, async () => {
      let row = requireValue(await this.store.get<CreditRow>("credit_reviews", id));
      if (row.value.nextAttemptAt && Date.parse(row.value.nextAttemptAt) > this.now())
        return this.info(row.value);
      if (row.value.state === "complete") {
        await this.applyInitial(row);
        return this.info(row.value);
      }
      if (row.value.intent) {
        row = await this.leases.run("signer:assistant", () => this.reconcile(row));
        await this.applyInitial(row);
        return this.info(row.value);
      }
      row = await this.store.replace<CreditRow>("credit_reviews", id, row.version, {
        ...row.value,
        state: "running",
        attempts: row.value.attempts + 1,
      });
      try {
        if (row.value.attempts > 3) throw new Error("Review retry budget exhausted");
        const documents = await Promise.all(
          row.value.documents.map(async (doc) => ({
            ...doc,
            bytes: await this.files.read("documents", doc.path),
          })),
        );
        const checked =
          row.value.papers && row.value.evidence
            ? { papers: row.value.papers, proof: row.value.evidence }
            : await this.reader.check(documents);
        const evidence = checked.proof;
        const { attestation, nonce, ...proof } = evidence;
        void attestation;
        void nonce;
        row = await this.store.replace<CreditRow>("credit_reviews", id, row.version, {
          ...row.value,
          evidence,
          proof,
          papers: checked.papers,
        });
        if (
          !this.clear(row.value.company, checked.papers) ||
          (row.value.policy && row.value.policy.currency !== checked.papers.currency)
        ) {
          row = await this.finish(row, "no_change", {
            needsCloserLook: true,
            reasons: [
              "Your papers need a closer look. Please check the company details and provide clear recent statements.",
            ],
          });
        } else {
          const target = row.value.policy ? targetLimit(row.value.policy, checked.papers) : null;
          row = await this.store.replace<CreditRow>("credit_reviews", id, row.version, {
            ...row.value,
            suggestedLimit: target,
          });
          if (row.value.kind === "initial")
            row = await this.finish(row, "no_change", {
              reasons: [
                target
                  ? "Your papers were checked. Two team members must approve the starting limit."
                  : "Your papers were checked. The team must choose a starting limit because no credit policy is configured.",
              ],
            });
          else if (!row.value.policy || !this.env.CREDIT_AUTO_LIMITS)
            row = await this.finish(row, "no_change", {
              reasons: ["Your papers were checked. Automatic limit changes are not enabled."],
            });
          else
            row = await this.leases.run("signer:assistant", async () => {
              for (const other of await this.store.list<CreditRow>("credit_reviews", {
                state: "writing",
              })) {
                if (other.value.id === id) continue;
                if ((await this.reconcile(other)).value.state === "writing")
                  throw new ApiException(
                    503,
                    "E_CREDIT_PENDING",
                    "A limit change is still being recorded.",
                  );
              }
              const history = await this.eligible(row.value.shipperId);
              row = await this.store.replace<CreditRow>("credit_reviews", id, row.version, {
                ...row.value,
                baselineRepaid: history.filter((s) => s.status === "Repaid").map((s) => s.id),
              });
              const shipper = requireValue(
                await this.chain.view<Shipper | null>("get_shipper", {
                  account_id: row.value.shipperId,
                }),
              );
              const config = configSchema.parse(await this.chain.view("get_config"));
              const now = await this.writer.time();
              if (BigInt(requireValue(target)) <= BigInt(shipper.limit))
                return this.finish(row, "no_change", {
                  decision: true,
                  reasons: [
                    "Your current limit already covers the amount supported by these papers.",
                  ],
                });
              const base =
                now >= BigInt(shipper.raise_window_start) + 7n * 86400000000000n
                  ? BigInt(shipper.limit)
                  : BigInt(shipper.raise_window_base);
              const cap = (base * (10000n + BigInt(config.assistant_raise_bps))) / 10000n;
              const within =
                BigInt(requireValue(target)) <= BigInt(config.max_limit) &&
                BigInt(requireValue(target)) <= cap;
              const intent = await this.writer.prepare(
                row.value.shipperId,
                requireValue(target),
                within ? "assistant_set_limit" : "assistant_propose",
              );
              row = await this.store.replace<CreditRow>("credit_reviews", id, row.version, {
                ...row.value,
                intent,
                txHash: intent.txHash,
                state: "writing",
                decision: true,
              });
              return this.reconcile(row);
            });
        }
      } catch (error) {
        logError("credit_review", error, { txHash: row.value.txHash ?? undefined });
        if (row.value.intent) return this.info(row.value);
        if (
          !(error instanceof UnreadablePapers) &&
          row.value.attempts < 3 &&
          (!(error instanceof ApiException) || error.status >= 500)
        ) {
          row = await this.store.replace<CreditRow>("credit_reviews", id, row.version, {
            ...row.value,
            state: "queued",
            nextAttemptAt: new Date(this.now() + 60000).toISOString(),
          });
          return this.info(row.value);
        }
        row =
          error instanceof UnreadablePapers
            ? await this.finish(row, "no_change", {
                needsCloserLook: true,
                reasons: [error.message],
              })
            : await this.finish(row, "failed", {
                reasons: [
                  "The private check could not finish. Your limit has not changed. Please try again later.",
                ],
              });
      }
      await this.applyInitial(row);
      return this.info(row.value);
    });
  }
  private async reconcile(row: Snapshot<CreditRow>): Promise<Snapshot<CreditRow>> {
    if (!row.value.intent || row.value.state === "complete") return row;
    let result;
    try {
      result = await this.writer.check(row.value.intent);
    } catch (error) {
      logError("credit_reconcile", error, { txHash: row.value.txHash ?? undefined });
      if (!(error instanceof DefinitiveTransactionError)) return row;
      result = { status: "failed" as const, proposalId: null };
    }
    if (result.status === "pending") return row;
    if (result.status === "failed")
      return this.finish(row, "failed", {
        reasons: ["The limit change was not recorded. Please try again later."],
      });
    const proposed = row.value.intent.method === "assistant_propose";
    if (proposed && result.proposalId == null)
      return this.finish(row, "failed", {
        reasons: ["The limit proposal could not be verified. The team must check the record."],
      });
    return this.finish(row, proposed ? "proposed" : "raised", {
      proposalId: result.proposalId,
      reasons: [
        proposed
          ? "The team must approve the suggested limit."
          : "Your limit was raised within the current rules.",
      ],
    });
  }
  private async finish(
    row: Snapshot<CreditRow>,
    result: CreditRow["result"],
    patch: Partial<CreditRow> = {},
  ) {
    return this.store.replace<CreditRow>("credit_reviews", row.value.id, row.version, {
      ...row.value,
      ...patch,
      state: "complete",
      result,
      completedAt: new Date(this.now()).toISOString(),
    });
  }
  private async applyInitial(review: Snapshot<CreditRow>) {
    if (
      review.value.kind !== "initial" ||
      review.value.state !== "complete" ||
      review.value.applicationApplied
    )
      return;
    await this.leases.run(`application:${review.value.applicationId}`, async () => {
      const app = requireValue(
        await this.store.get<Application>("applications", review.value.applicationId),
      );
      if (
        app.value.state === "in_review" &&
        app.value.submissionNumber === review.value.submissionNumber
      ) {
        await this.store.replace<Application>("applications", app.value.id, app.version, {
          ...app.value,
          state: review.value.needsCloserLook ? "needs_more" : "in_review",
          reviewId: review.value.id,
          updatedAt: new Date(this.now()).toISOString(),
        });
      }
      await this.store.replace<CreditRow>("credit_reviews", review.value.id, review.version, {
        ...review.value,
        applicationApplied: true,
      });
    });
  }
  private async eligible(shipperId: string): Promise<Shipment[]> {
    const shipper = requireValue(
      await this.chain.view<Shipper | null>("get_shipper", { account_id: shipperId }),
    );
    const now = await this.writer.time();
    if (shipper.paused !== null)
      throw new ApiException(
        409,
        "E_CREDIT_PAUSED",
        "The team must resume your company before another review.",
      );
    if (shipper.late_bills > 0)
      throw new ApiException(
        409,
        "E_CREDIT_OVERDUE",
        "Pay your overdue bills before asking for another review.",
      );
    if (now < BigInt(shipper.blocked_until))
      throw new ApiException(
        409,
        "E_CREDIT_COOLDOWN",
        "The team asked for more time before another review.",
      );
    const config = configSchema.parse(await this.chain.view("get_config"));
    const deadline = Date.now() + 90000;
    const proposals = await readProposals(this.chain, deadline);
    if (
      proposals.some(
        (p) =>
          p.status === "Open" &&
          "SetLimit" in p.kind &&
          p.kind.SetLimit.shipper === shipperId &&
          BigInt(p.created_at) + BigInt(config.proposal_ttl_days) * 86400000000000n >= now,
      )
    )
      throw new ApiException(
        409,
        "E_CREDIT_PENDING",
        "The team is still reviewing a limit change.",
      );
    const shipments = await readShipperShipments(this.chain, shipperId, deadline);
    if (shipments.some((shipment) => shipment.status === "Paid" && now > BigInt(shipment.due_at)))
      throw new ApiException(
        409,
        "E_CREDIT_OVERDUE",
        "Pay your overdue bills before asking for another review.",
      );
    const previous = (
      await this.store.list<CreditRow>("credit_reviews", {
        shipperId,
        kind: "review",
        state: "complete",
      })
    )
      .filter((r) => r.value.result === "no_change" && r.value.decision)
      .sort((a, b) => b.value.createdAt.localeCompare(a.value.createdAt))[0];
    if (
      previous &&
      shipments.filter(
        (s) => s.status === "Repaid" && !previous.value.baselineRepaid.includes(s.id),
      ).length < 3
    )
      throw new ApiException(
        409,
        "E_CREDIT_HISTORY",
        "Pay three more bills before asking for another review.",
      );
    return shipments;
  }
  private async cooldown(shipperId: string) {
    const rows = await this.store.list<CreditRow>("credit_reviews", { shipperId });
    if (rows.some((r) => this.now() - Date.parse(r.value.createdAt) < 86400000))
      throw new ApiException(
        429,
        "E_CREDIT_RATE",
        "Please wait one day before asking for another private check.",
      );
  }
  private async documents(app: Application) {
    const docs: ApplicationDocument[] = [];
    for (const kind of ["registration", "bank_statement"] as const) {
      const doc = requireValue(
        await this.store.get<ApplicationDocument>(
          "application_documents",
          requireValue(app.documents[kind]),
        ),
      ).value;
      allowed(doc.state === "ready" && doc.applicationId === app.id);
      docs.push(doc);
    }
    return docs;
  }
  private clear(company: CompanyInput, papers: ExtractedPapers) {
    const months = papers.monthlyOutgoing
      .map((m) => {
        const [year, month] = m.month.split("-").map(Number);
        return year! * 12 + month! - 1;
      })
      .sort((a, b) => a - b);
    const current = new Date(this.now());
    const currentMonth = current.getUTCFullYear() * 12 + current.getUTCMonth();
    return (
      papers.readable &&
      normalized(papers.registrationCompany) === normalized(company.name) &&
      normalized(papers.bankCompany) === normalized(company.name) &&
      papers.registrationNumber.replace(/\D/g, "") === company.registration &&
      months.length === 3 &&
      months[1] === months[0]! + 1 &&
      months[2] === months[1]! + 1 &&
      months[2]! >= currentMonth - 1 &&
      months[2]! <= currentMonth
    );
  }
  private newRow(
    id: string,
    app: Application,
    documents: ApplicationDocument[],
    kind: CreditRow["kind"],
    baselineRepaid: number[],
    policy: CreditPolicy | null,
  ): CreditRow {
    return {
      id,
      shipperId: app.shipperId,
      applicationId: app.id,
      submissionNumber: app.submissionNumber,
      company: app.company,
      documents,
      kind,
      state: "queued",
      result: null,
      suggestedLimit: null,
      needsCloserLook: false,
      reasons: [],
      proposalId: null,
      txHash: null,
      proof: null,
      evidence: null,
      papers: null,
      intent: null,
      policy,
      baselineRepaid,
      applicationApplied: kind !== "initial",
      decision: false,
      attempts: 0,
      createdAt: new Date(this.now()).toISOString(),
      completedAt: null,
    };
  }
  private info(row: CreditRow): CreditReviewInfo {
    return {
      id: row.id,
      shipperId: row.shipperId,
      kind: row.kind,
      state: row.state,
      result: row.result,
      suggestedLimit: row.suggestedLimit,
      needsCloserLook: row.needsCloserLook,
      reasons: row.reasons,
      proposalId: row.proposalId,
      txHash: row.txHash,
      proof: row.proof,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    };
  }
}
