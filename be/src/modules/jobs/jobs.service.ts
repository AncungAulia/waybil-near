import { readProposals, readShipperShipments } from "../../lib/contract-reads";
import { logError } from "../../lib/logger";
import {
  formatUsdc,
  type Application,
  type Profile,
  type RelayResponse,
  type Shipment,
} from "@waybil/shared";
import type { Store } from "../../types/db";
import type { Chain } from "../../lib/near";
import type { Leases } from "../../lib/leases";
import type { Emails, EmailRecord } from "../../lib/email";
import type { FileStore } from "../../lib/storage";
import { ApiException } from "../../lib/errors";
import type { Applications, ApplicationDocument } from "../applications/applications.service";
import type { InviteRecord } from "../invites/invites.service";

export type JobKind = "late" | "reminders" | "expiry";
export interface JobRun {
  id: string;
  kind: JobKind;
  window: string;
  state: "running" | "complete" | "failed";
  attempts: number;
  startedAt: string;
  completedAt: string | null;
  counts: Record<string, number>;
  error: string | null;
}
export interface LateMarker {
  markLate(id: number): Promise<RelayResponse | null>;
}
const DAY = 86400000;
const activeEmail = (r: EmailRecord) =>
  r.state !== "sent" &&
  r.state !== "uncertain" &&
  !["E_EMAIL_CANCELLED", "E_EMAIL_PERMANENT", "E_EMAIL_RETRIES"].includes(r.error ?? "");

export class Jobs {
  constructor(
    private store: Store,
    private chain: Chain,
    private leases: Leases,
    private emails: Emails,
    private applications: Pick<Applications, "rejectionEmail">,
    private files: FileStore,
    private marker: LateMarker,
    private chainTime: () => Promise<bigint>,
    private now = () => Date.now(),
  ) {}
  async runAll() {
    const jobs: Array<JobRun | { kind: JobKind; state: "failed"; error: string }> = [];
    for (const kind of ["late", "reminders", "expiry"] as const) {
      try {
        jobs.push(await this.run(kind));
      } catch (error) {
        logError(`job_${kind}`, error);
        jobs.push({ kind, state: "failed", error: this.errorCode(error) });
      }
    }
    try {
      return { jobs, email: await this.flushEmails() };
    } catch (error) {
      logError("email_flush", error);
      return { jobs, email: { error: this.errorCode(error) } };
    }
  }
  async run(kind: JobKind): Promise<JobRun> {
    const window = new Date(this.now()).toISOString().slice(0, kind === "reminders" ? 10 : 13);
    const id = `${kind}:${window}`;
    return this.leases.run(`job:${kind}`, async () => {
      let row = await this.store.get<JobRun>("job_runs", id);
      if (row?.value.state === "complete") return row.value;
      const value: JobRun = {
        id,
        kind,
        window,
        state: "running",
        attempts: (row?.value.attempts ?? 0) + 1,
        startedAt: new Date(this.now()).toISOString(),
        completedAt: null,
        counts: {},
        error: null,
      };
      row = row
        ? await this.store.replace("job_runs", id, row.version, value)
        : await this.store.insert("job_runs", id, value);
      try {
        if (kind === "expiry") await this.expire(value.counts);
        else await this.bills(kind, value.counts);
        return (
          await this.store.replace<JobRun>("job_runs", id, row.version, {
            ...value,
            state: "complete",
            completedAt: new Date(this.now()).toISOString(),
          })
        ).value;
      } catch (error) {
        await this.store.replace<JobRun>("job_runs", id, row.version, {
          ...value,
          state: "failed",
          completedAt: new Date(this.now()).toISOString(),
          error: this.errorCode(error),
        });
        throw error;
      }
    });
  }
  async flushEmails() {
    const counts: Record<string, number> = {};
    for (const row of await this.store.list<Application>("applications", { state: "rejected" })) {
      if (row.value.rejection) await this.applications.rejectionEmail(row.value);
    }
    for (const row of await this.store.list<EmailRecord>("email_log")) {
      if (!activeEmail(row.value)) continue;
      const result = await this.emails.deliver(row.value.id, () => this.emailEligible(row.value));
      this.count(counts, result.error === "E_EMAIL_CANCELLED" ? "cancelled" : result.state);
    }
    return counts;
  }
  private async bills(kind: "late" | "reminders", counts: Record<string, number>) {
    const now = await this.chainTime();
    const deadline = Date.now() + 90000;
    for (const shipper of await this.shippers(deadline)) {
      for (const shipment of await this.shipments(shipper, deadline)) {
        this.count(counts, "scanned");
        if (shipment.status !== "Paid") continue;
        let requested = false;
        if (kind === "late") {
          if (now <= BigInt(shipment.due_at)) continue;
          if (!shipment.marked_late) {
            const result = await this.marker.markLate(shipment.id);
            if (result && result.status !== "confirmed")
              throw new ApiException(503, "E_LATE_PENDING", "A late bill is still being recorded.");
            requested = Boolean(result);
          }
        } else if (!this.reminderDue(shipment, now)) continue;
        const fresh = await this.chain.view<Shipment | null>("get_shipment", { id: shipment.id });
        if (
          kind === "late" &&
          fresh?.status === "Paid" &&
          now > BigInt(fresh.due_at) &&
          !fresh.marked_late
        )
          throw new ApiException(503, "E_LATE_PENDING", "A late bill is still being recorded.");
        if (!fresh || !this.billEligible(kind, fresh, now)) continue;
        if (requested) this.count(counts, "marked");
        const recipient = await this.recipient(fresh.shipper);
        if (!recipient) {
          this.count(counts, "missingRecipient");
          continue;
        }
        const due = new Date(Number(BigInt(fresh.due_at) / 1000000n)).toISOString().slice(0, 10);
        const amount = formatUsdc(BigInt(fresh.bill));
        const key = `${kind}:${fresh.id}:${fresh.due_at}:${recipient}`;
        const existing = (await this.store.list<EmailRecord>("email_log", { key }))[0];
        if (!existing) {
          await this.emails.queue(key, {
            to: recipient,
            subject:
              kind === "late"
                ? `Waybil bill #${fresh.id} is past due`
                : `Waybil bill #${fresh.id} is due soon`,
            text: `Your bill #${fresh.id} for ${amount} USDC ${kind === "late" ? "was" : "is"} due on ${due} UTC.\nOpen Waybil to review and pay this bill.`,
          });
          this.count(counts, "queued");
        }
      }
    }
  }
  private async shippers(deadline: number) {
    const ids = new Set<string>();
    for (const r of await this.store.list<Profile>("profiles", { role: "shipper" }))
      ids.add(r.value.accountId);
    for (const r of await this.store.list<Application>("applications")) ids.add(r.value.shipperId);
    for (const p of await readProposals(this.chain, deadline))
      if (p.status === "Approved" && "StartShipper" in p.kind) ids.add(p.kind.StartShipper.shipper);
    return ids;
  }
  private async shipments(shipper: string, deadline: number) {
    const results = new Map<number, Shipment>();
    for (const shipment of await readShipperShipments(this.chain, shipper, deadline))
      if (shipment.shipper === shipper) results.set(shipment.id, shipment);
    return [...results.values()];
  }
  private billEligible(kind: "late" | "reminders", s: Shipment, now: bigint) {
    return (
      s.status === "Paid" &&
      (kind === "late" ? s.marked_late && now > BigInt(s.due_at) : this.reminderDue(s, now))
    );
  }
  private reminderDue(s: Shipment, now: bigint) {
    const dueDay = BigInt(s.due_at) / 86400000000000n;
    const currentDay = now / 86400000000000n;
    return dueDay - currentDay >= 1n && dueDay - currentDay <= 3n;
  }
  private async emailEligible(email: EmailRecord) {
    const [kind, rawId, due] = email.key.split(":");
    if (kind !== "late" && kind !== "reminders") return true;
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || !due) return false;
    const shipment = await this.chain.view<Shipment | null>("get_shipment", { id });
    if (
      !shipment ||
      shipment.due_at !== due ||
      !this.billEligible(kind, shipment, await this.chainTime())
    )
      return false;
    return (await this.recipient(shipment.shipper)) === email.message.to;
  }
  private async recipient(shipper: string): Promise<string | null> {
    const apps = (await this.store.list<Application>("applications", { shipperId: shipper })).sort(
      (a, b) => b.value.createdAt.localeCompare(a.value.createdAt),
    );
    return (
      apps[0]?.value.company.email ||
      (await this.store.get<Profile>("profiles", shipper))?.value.email ||
      null
    );
  }
  private async expire(counts: Record<string, number>) {
    const now = this.now();
    for (const row of await this.store.list<InviteRecord>("invites")) {
      if (row.value.acceptedBy || row.value.expiredAt || Date.parse(row.value.expiresAt) > now)
        continue;
      try {
        await this.store.replace("invites", row.value.code, row.version, {
          ...row.value,
          expiredAt: new Date(now).toISOString(),
          reservedFor: null,
          reservedUntil: null,
        });
        this.count(counts, "invites");
      } catch (error) {
        if (!(error instanceof ApiException && error.code === "E_CONFLICT")) throw error;
      }
    }
    counts.challenges = await this.store.removeExpiredChallenges(new Date(now).toISOString());
    for (const row of await this.store.list<ApplicationDocument>("application_documents")) {
      if (
        row.value.state !== "cleanup" &&
        !(row.value.state === "uploading" && now - Date.parse(row.value.createdAt) >= DAY / 24)
      )
        continue;
      await this.leases.run(`application:${row.value.applicationId}`, async () => {
        const fresh = await this.store.get<ApplicationDocument>(
          "application_documents",
          row.value.id,
        );
        if (!fresh || fresh.value.state === "ready") return;
        const app = await this.store.get<Application>("applications", fresh.value.applicationId);
        if (app && Object.values(app.value.documents).includes(fresh.value.id)) return;
        await this.files.remove("documents", fresh.value.path);
        await this.store.remove("application_documents", fresh.value.id, fresh.version);
        this.count(counts, "documents");
      });
    }
  }
  private count(counts: Record<string, number>, key: string) {
    counts[key] = (counts[key] ?? 0) + 1;
  }
  private errorCode(error: unknown) {
    return error instanceof ApiException ? error.code : "E_JOB";
  }
}
