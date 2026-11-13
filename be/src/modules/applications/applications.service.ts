import { publicReview } from "../../lib/public-review";
import { randomUUID } from "node:crypto";
import type {
  Application,
  ApplicationListItem,
  ApplicationDetail,
  CompanyInput,
  DocumentKind,
  Principal,
  Proposal,
  Shipper,
} from "@waybil/shared";
import type { Store } from "../../types/db";
import type { Chain } from "../../lib/near";
import type { Leases } from "../../lib/leases";
import type { Emails } from "../../lib/email";
import { inspectFile, sha256, type FileStore, type StoredFile } from "../../lib/storage";
import { allowed, ApiException, conflict, requireValue, unavailable } from "../../lib/errors";
import type { CreditRow } from "../credit/credit.service";

export interface ApplicationDocument extends StoredFile {
  id: string;
  applicationId: string;
  kind: DocumentKind;
  state: "uploading" | "ready" | "cleanup";
  createdAt: string;
}
export type BeginApplicationReview = (application: Application) => Promise<string>;
export class Applications {
  constructor(
    private store: Store,
    private chain: Chain,
    private files: FileStore,
    private emails: Emails,
    private leases: Leases,
    private beginReview?: BeginApplicationReview,
    private now = () => Date.now(),
  ) {}
  async create(actor: Principal, company: CompanyInput) {
    allowed(actor.role === "shipper");
    return this.leases.run(`applicant:${actor.accountId}`, async () => {
      const active = await this.chain.view<Shipper | null>("get_shipper", {
        account_id: actor.accountId,
      });
      const existing = (
        await this.store.list<Application>("applications", { shipperId: actor.accountId })
      ).find((r) => r.value.state !== "rejected");
      if (existing) {
        if (JSON.stringify(existing.value.company) !== JSON.stringify(company)) conflict();
        return existing.value;
      }
      const at = new Date(this.now()).toISOString();
      const app: Application = {
        id: randomUUID(),
        shipperId: actor.accountId,
        company,
        state: active ? "approved" : "draft",
        documents: {},
        proposalId: null,
        reviewId: null,
        submissionNumber: 0,
        rejection: null,
        createdAt: at,
        updatedAt: at,
      };
      await this.store.insert("applications", app.id, app);
      return app;
    });
  }
  async edit(actor: Principal, id: string, company: CompanyInput) {
    return this.leases.run(`application:${id}`, async () => {
      const row = await this.owned(actor, id);
      this.editable(row.value);
      return (
        await this.store.replace("applications", id, row.version, {
          ...row.value,
          company,
          updatedAt: new Date(this.now()).toISOString(),
        })
      ).value;
    });
  }
  async mine(actor: Principal): Promise<ApplicationDetail> {
    allowed(actor.role === "shipper");
    const rows = await this.store.list<Application>("applications", { shipperId: actor.accountId });
    const latest = rows.sort((a, b) => b.value.createdAt.localeCompare(a.value.createdAt))[0];
    return this.detail(requireValue(latest).value);
  }
  async adminList(actor: Principal) {
    await this.team(actor);
    return {
      applications: await Promise.all(
        (await this.store.list<Application>("applications")).map(
          async (r): Promise<ApplicationListItem> => {
            const application = await this.refresh(r.value.id);
            const row = (
              await this.store.list<CreditRow>("credit_reviews", {
                applicationId: application.id,
              })
            ).sort((a, b) => b.value.createdAt.localeCompare(a.value.createdAt))[0];
            const review = row ? publicReview(row.value, this.now()) : null;
            return { ...application, review };
          },
        ),
      ),
    };
  }
  async adminDetail(actor: Principal, id: string) {
    await this.team(actor);
    return this.detail(requireValue(await this.store.get<Application>("applications", id)).value);
  }
  async upload(actor: Principal, id: string, kind: DocumentKind, bytes: Uint8Array) {
    const inspected = await inspectFile(bytes);
    return this.leases.run(`application:${id}`, async () => {
      const app = await this.owned(actor, id);
      if (app.value.state !== "approved") this.editable(app.value);
      const documentId = sha256(`${id}:${kind}:${inspected.sha256}`);
      let row = await this.store.get<ApplicationDocument>("application_documents", documentId);
      if (!row)
        row = await this.store.insert("application_documents", documentId, {
          ...inspected,
          path: `${actor.accountId}/${documentId}.${inspected.path.split(".").at(-1)}`,
          id: documentId,
          applicationId: id,
          kind,
          state: "uploading",
          createdAt: new Date(this.now()).toISOString(),
        } satisfies ApplicationDocument);
      if (row.value.state !== "ready") {
        try {
          await this.files.put("documents", row.value.path, bytes, row.value.mime);
          row = await this.store.replace("application_documents", documentId, row.version, {
            ...row.value,
            state: "ready",
          });
        } catch (error) {
          await this.store.replace("application_documents", documentId, row.version, {
            ...row.value,
            state: "cleanup",
          });
          throw error;
        }
      }
      if (app.value.documents[kind] !== documentId)
        await this.store.replace("applications", id, app.version, {
          ...app.value,
          documents: { ...app.value.documents, [kind]: documentId },
          updatedAt: new Date(this.now()).toISOString(),
        });
      return {
        id: documentId,
        kind,
        mime: row.value.mime,
        size: row.value.size,
        sha256: row.value.sha256,
      };
    });
  }
  async submit(actor: Principal, id: string) {
    return this.leases.run(`application:${id}`, async () => {
      let row = await this.owned(actor, id);
      if (row.value.state === "in_review" && row.value.reviewId) return row.value;
      if (!this.beginReview) unavailable();
      if (row.value.state !== "in_review") {
        this.editable(row.value);
        for (const kind of ["registration", "bank_statement"] as const) {
          const document = requireValue(
            await this.store.get<ApplicationDocument>(
              "application_documents",
              requireValue(row.value.documents[kind]),
            ),
          );
          allowed(document.value.state === "ready" && document.value.applicationId === id);
        }
        row = await this.store.replace("applications", id, row.version, {
          ...row.value,
          state: "in_review",
          reviewId: null,
          submissionNumber: row.value.submissionNumber + 1,
          updatedAt: new Date(this.now()).toISOString(),
        });
      }
      const reviewId = await this.beginReview(row.value);
      return (await this.store.replace("applications", id, row.version, { ...row.value, reviewId }))
        .value;
    });
  }
  async linkProposal(actor: Principal, id: string, proposalId: number) {
    await this.team(actor);
    return this.leases.run(`application:${id}`, async () => {
      const row = requireValue(await this.store.get<Application>("applications", id));
      allowed(
        row.value.state === "in_review" ||
          (row.value.state !== "rejected" &&
            (await this.chain.view<Shipper | null>("get_shipper", {
              account_id: row.value.shipperId,
            }))),
      );
      const proposal = requireValue(
        await this.chain.view<Proposal | null>("get_proposal", { id: proposalId }),
      );
      allowed(
        "StartShipper" in proposal.kind &&
          proposal.kind.StartShipper.shipper === row.value.shipperId,
      );
      if (row.value.proposalId != null && row.value.proposalId !== proposalId) conflict();
      const active =
        proposal.status === "Approved" &&
        (await this.chain.view<Shipper | null>("get_shipper", { account_id: row.value.shipperId }));
      return (
        await this.store.replace("applications", id, row.version, {
          ...row.value,
          proposalId,
          state: active ? "approved" : "in_review",
          updatedAt: new Date(this.now()).toISOString(),
        })
      ).value;
    });
  }
  async reject(actor: Principal, id: string, input: { reason: string; note: string }) {
    await this.team(actor);
    const app = await this.leases.run(`application:${id}`, async () => {
      const row = requireValue(await this.store.get<Application>("applications", id));
      if (row.value.state === "rejected") {
        if (row.value.rejection?.reason !== input.reason || row.value.rejection.note !== input.note)
          conflict();
        return row.value;
      }
      allowed(
        row.value.state !== "approved" &&
          !(await this.chain.view<Shipper | null>("get_shipper", {
            account_id: row.value.shipperId,
          })),
      );
      if (row.value.proposalId) {
        const proposal = requireValue(
          await this.chain.view<Proposal | null>("get_proposal", { id: row.value.proposalId }),
        );
        allowed(["Rejected", "Expired"].includes(proposal.status));
      }
      const at = new Date(this.now()).toISOString();
      return (
        await this.store.replace("applications", id, row.version, {
          ...row.value,
          state: "rejected" as const,
          rejection: { ...input, actor: actor.accountId, at },
          updatedAt: at,
        })
      ).value;
    });
    const email = await this.rejectionEmail(app);
    return { application: app, emailStatus: (await this.emails.deliver(email.id)).state };
  }
  async rejectionEmail(app: Application) {
    const rejection = requireValue(app.rejection);
    return this.emails.queue(`application-rejected:${app.id}`, {
      to: app.company.email,
      subject: "Your Waybil application was reviewed",
      text: `Your application for ${app.company.name} was not approved.\nThe reason was ${rejection.reason.replaceAll("_", " ")}.\n${rejection.note}`,
    });
  }
  private async owned(actor: Principal, id: string) {
    allowed(actor.role === "shipper");
    const row = requireValue(await this.store.get<Application>("applications", id));
    allowed(row.value.shipperId === actor.accountId);
    return row;
  }
  private editable(app: Application) {
    if (!["draft", "needs_more"].includes(app.state)) conflict();
  }
  private async team(actor: Principal) {
    allowed(await this.chain.view<boolean>("is_member", { account_id: actor.accountId }));
  }
  private async detail(application: Application): Promise<ApplicationDetail> {
    application = await this.refresh(application.id);
    const documents = [];
    for (const id of Object.values(application.documents)) {
      const doc = requireValue(
        await this.store.get<ApplicationDocument>("application_documents", id),
      );
      if (doc.value.state === "ready")
        documents.push({
          id,
          kind: doc.value.kind,
          mime: doc.value.mime,
          size: doc.value.size,
          sha256: doc.value.sha256,
          signedUrl: await this.files.sign("documents", doc.value.path),
        });
    }
    return { application, documents };
  }
  private async refresh(id: string): Promise<Application> {
    const row = requireValue(await this.store.get<Application>("applications", id));
    if (row.value.state === "approved" || row.value.state === "rejected") return row.value;
    const active = await this.chain.view<Shipper | null>("get_shipper", {
      account_id: row.value.shipperId,
    });
    if (!active) return row.value;
    if (row.value.proposalId) {
      const proposal = requireValue(
        await this.chain.view<Proposal | null>("get_proposal", { id: row.value.proposalId }),
      );
      allowed(
        "StartShipper" in proposal.kind &&
          proposal.kind.StartShipper.shipper === row.value.shipperId,
      );
      if (proposal.status !== "Approved") return row.value;
    }
    try {
      return (
        await this.store.replace("applications", id, row.version, {
          ...row.value,
          state: "approved" as const,
          updatedAt: new Date(this.now()).toISOString(),
        })
      ).value;
    } catch (error) {
      if (!(error instanceof ApiException && error.code === "E_CONFLICT")) throw error;
      return requireValue(await this.store.get<Application>("applications", id)).value;
    }
  }
}
