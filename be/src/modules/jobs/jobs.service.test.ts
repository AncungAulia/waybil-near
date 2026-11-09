import { expect, it, vi } from "vitest";
import type { Application, Shipment, Proposal } from "@waybil/shared";
import { Emails, EmailFailure, type EmailRecord } from "../../lib/email";
import { ApiException } from "../../lib/errors";
import { testDeps, profile, MemoryLeases, MemoryFiles } from "../../test/support";
import { Jobs } from "./jobs.service";
import type { InviteRecord } from "../invites/invites.service";
import type { ApplicationDocument } from "../applications/applications.service";

function shipment(id = 1, due = "2026-11-08T23:00:00Z"): Shipment {
  return {
    id,
    shipper: "shipper.testnet",
    driver: "driver.testnet",
    destination: 1,
    qty: 10,
    unit: "boxes",
    bill: "300000000",
    advance: "292500000",
    due_at: (BigInt(Date.parse(due)) * 1000000n).toString(),
    status: "Paid",
    approved_at: "1",
    picked_up_at: "2",
    arrived_at: "3",
    good_qty: 10,
    report_hash: null,
    paid_at: "4",
    repaid_at: null,
    marked_late: false,
  };
}
async function setup(items: Shipment[] = [shipment()]) {
  const deps = testDeps();
  let now = Date.parse("2026-11-09T12:00:00Z");
  let enabled = true;
  const shipments = new Map(items.map((s) => [s.id, s]));
  const proposals: Proposal[] = [];
  await deps.store.insert("profiles", "shipper.testnet", profile());
  const view = vi.fn().mockImplementation(async (method: string, args: Record<string, unknown>) => {
    if (method === "list_proposals") return proposals.slice(-1);
    if (method === "get_proposal") return proposals.find((p) => p.id === args.id) ?? null;
    if (method === "list_shipments_by_shipper")
      return [...shipments.values()]
        .filter((s) => s.shipper === args.account_id)
        .slice(Number(args.from), Number(args.from) + Number(args.limit))
        .map((s) => structuredClone(s));
    if (method === "get_shipment") return structuredClone(shipments.get(Number(args.id)) ?? null);
    throw new Error(`Unexpected view ${method}`);
  });
  deps.chain.view = view;
  const send = vi.fn().mockResolvedValue("sample-email-id");
  const leases = new MemoryLeases();
  const emails = new Emails(deps.store, { enabled: () => enabled, send }, leases, () => now);
  const applications = {
    rejectionEmail: vi.fn().mockImplementation(async (a: Application) =>
      emails.queue(`application-rejected:${a.id}`, {
        to: a.company.email,
        subject: "Sample rejection",
        text: "Sample private message.",
      }),
    ),
  };
  const files = new MemoryFiles();
  const marker = {
    markLate: vi.fn().mockImplementation(async (id: number) => {
      const s = shipments.get(id)!;
      if (s.status !== "Paid") return null;
      s.marked_late = true;
      return {
        status: "confirmed",
        txHash: "sample-late-hash",
        proofUrl: "https://example.com/sample",
      };
    }),
  };
  const makeJobs = () =>
    new Jobs(
      deps.store,
      deps.chain,
      leases,
      emails,
      applications,
      files,
      marker,
      async () => BigInt(now) * 1000000n,
      () => now,
    );
  return {
    ...deps,
    jobs: makeJobs(),
    makeJobs,
    send,
    emails,
    files,
    proposals,
    shipments,
    marker,
    applications,
    view,
    setNow: (value: number) => {
      now = value;
    },
    setEnabled: (value: boolean) => {
      enabled = value;
    },
  };
}
it("marks and emails a late bill once across repeated windows and process restarts", async () => {
  const deps = await setup();
  const first = await deps.jobs.runAll();
  expect(first.jobs.every((j) => j.state === "complete")).toBe(true);
  expect(deps.marker.markLate).toHaveBeenCalledTimes(1);
  expect(deps.send).toHaveBeenCalledTimes(1);
  expect(deps.send.mock.calls[0]![0].text).toContain("300.00 USDC");
  await deps.makeJobs().runAll();
  deps.setNow(Date.parse("2026-11-09T13:00:00Z"));
  await deps.makeJobs().runAll();
  expect(deps.marker.markLate).toHaveBeenCalledTimes(1);
  expect(deps.send).toHaveBeenCalledTimes(1);
  const rows = await deps.store.list<EmailRecord>("email_log");
  expect(rows).toHaveLength(1);
  expect(rows[0]!.value).toMatchObject({
    state: "sent",
    attempts: 1,
    providerId: "sample-email-id",
  });
});
it("retries an incomplete job window, then flushes a failed email using the same event", async () => {
  const deps = await setup();
  deps.marker.markLate.mockResolvedValueOnce({
    status: "pending",
    txHash: "sample-pending",
    proofUrl: "sample",
  });
  await expect(deps.jobs.run("late")).rejects.toMatchObject({ code: "E_LATE_PENDING" });
  expect(deps.send).not.toHaveBeenCalled();
  const run = await deps.makeJobs().run("late");
  expect(run).toMatchObject({ state: "complete", attempts: 2 });
  deps.send.mockRejectedValueOnce(new EmailFailure(false));
  expect(await deps.jobs.flushEmails()).toEqual({ failed: 1 });
  expect(await deps.makeJobs().flushEmails()).toEqual({ sent: 1 });
  expect(deps.send.mock.calls[0]![1]).toBe(deps.send.mock.calls[1]![1]);
});
it("paginates past 50 shipments and discovers seeded shippers from older approved proposals", async () => {
  const items = Array.from({ length: 51 }, (_, i) => ({
    ...shipment(i + 1),
    shipper: "seeded.testnet",
    status: i === 50 ? ("Paid" as const) : ("Repaid" as const),
  }));
  const deps = await setup(items);
  for (let i = 1; i <= 60; i++)
    deps.proposals.push({
      id: i,
      kind: {
        StartShipper: { shipper: i === 1 ? "seeded.testnet" : "shipper.testnet", limit: "1" },
      },
      status: "Approved",
    } as Proposal);
  const run = await deps.jobs.run("late");
  expect(deps.view).toHaveBeenCalledWith("get_proposal", { id: 1 });
  expect(deps.view).toHaveBeenCalledWith("list_shipments_by_shipper", {
    account_id: "seeded.testnet",
    from: 50,
    limit: 50,
  });
  expect(deps.marker.markLate).toHaveBeenCalledWith(51);
  expect(run.counts).toMatchObject({ scanned: 51, missingRecipient: 1 });
  expect(await deps.store.list("email_log")).toHaveLength(0);
});
it("catches up a reminder two UTC dates before due and suppresses it after repayment", async () => {
  const deps = await setup([shipment(1, "2026-11-11T00:01:00Z")]);
  deps.setEnabled(false);
  expect((await deps.jobs.run("reminders")).counts.queued).toBe(1);
  expect(await deps.jobs.flushEmails()).toEqual({ queued: 1 });
  deps.shipments.get(1)!.status = "Repaid";
  expect(await deps.makeJobs().flushEmails()).toEqual({ cancelled: 1 });
  deps.setEnabled(true);
  await deps.jobs.flushEmails();
  expect(deps.send).not.toHaveBeenCalled();
});
it("uses stable reminder keys across UTC days and never reminds on or after the due date", async () => {
  const deps = await setup([shipment(1, "2026-11-12T00:01:00Z")]);
  await deps.jobs.runAll();
  expect(deps.send).toHaveBeenCalledTimes(1);
  deps.setNow(Date.parse("2026-11-10T23:59:00Z"));
  await deps.jobs.runAll();
  expect(deps.send).toHaveBeenCalledTimes(1);
  const sameDay = await setup([shipment(1, "2026-11-09T23:59:00Z")]);
  expect((await sameDay.jobs.run("reminders")).counts.queued).toBeUndefined();
});
it("does not notify a bill repaid between scanning and the marker or email checks", async () => {
  const deps = await setup();
  deps.marker.markLate.mockImplementationOnce(async () => {
    deps.shipments.get(1)!.status = "Repaid";
    return null;
  });
  await deps.jobs.runAll();
  expect(deps.send).not.toHaveBeenCalled();
  expect(await deps.store.list("email_log")).toHaveLength(0);
});
it("expires invites without overwriting a concurrent acceptance and retains ready evidence", async () => {
  const deps = await setup([]);
  const expired: InviteRecord = {
    code: "a".repeat(24),
    shipperId: "shipper.testnet",
    shipperName: "Sample Company",
    type: "driver",
    name: "Sample Driver",
    phone: "+12075550142",
    expiresAt: "2026-11-08T00:00:00Z",
    acceptedBy: null,
    acceptedAt: null,
    reservedFor: null,
    reservedUntil: null,
  };
  await deps.store.insert("invites", expired.code, expired);
  await deps.store.insert("invites", "b".repeat(24), { ...expired, code: "b".repeat(24) });
  await deps.store.insert("auth_challenges", "expired", {
    id: "expired",
    expiresAt: "2026-11-08T00:00:00Z",
  });
  const doc = {
    id: "cleanup",
    applicationId: "sample-app",
    state: "cleanup",
    path: "sample.pdf",
    createdAt: "2026-11-08T00:00:00Z",
  } as ApplicationDocument;
  await deps.store.insert("application_documents", doc.id, doc);
  await deps.files.put("documents", doc.path, Buffer.from("SAMPLE"));
  await deps.store.insert("application_documents", "ready", {
    ...doc,
    id: "ready",
    path: "ready.pdf",
    state: "ready",
  });
  const replace = deps.store.replace.bind(deps.store);
  vi.spyOn(deps.store, "replace").mockImplementation(async (table, id, version, value) => {
    if (table === "invites" && id === expired.code) {
      await replace(table, id, version, {
        ...expired,
        acceptedBy: "driver.testnet",
        acceptedAt: "2026-11-08T00:00:00Z",
      });
      throw new ApiException(409, "E_CONFLICT");
    }
    return replace(table, id, version, value);
  });
  const run = await deps.jobs.run("expiry");
  expect(run.counts).toEqual({ invites: 1, challenges: 1, documents: 1 });
  expect((await deps.store.get<InviteRecord>("invites", expired.code))?.value.acceptedBy).toBe(
    "driver.testnet",
  );
  expect(await deps.store.get("application_documents", "ready")).not.toBeNull();
  expect(deps.files.objects.size).toBe(0);
});
it("recovers rejection mail after a crash before queue insertion", async () => {
  const deps = await setup([]);
  await deps.store.insert("applications", "sample-app", {
    id: "sample-app",
    state: "rejected",
    shipperId: "shipper.testnet",
    company: { email: "sample@example.com" },
    rejection: { reason: "other" },
  });
  await deps.jobs.flushEmails();
  await deps.makeJobs().flushEmails();
  expect(deps.send).toHaveBeenCalledTimes(1);
  expect((await deps.store.list<EmailRecord>("email_log"))[0]!.value.state).toBe("sent");
});
it("prevents overlapping job instances while a late transaction is in flight", async () => {
  const deps = await setup();
  let ready!: () => void;
  let finish!: () => void;
  const started = new Promise<void>((resolve) => {
    ready = resolve;
  });
  deps.marker.markLate.mockImplementationOnce(async () => {
    ready();
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    deps.shipments.get(1)!.marked_late = true;
    return { status: "confirmed", txHash: "sample-hash", proofUrl: "sample" };
  });
  const first = deps.jobs.run("late");
  await started;
  await expect(deps.makeJobs().run("late")).rejects.toMatchObject({ code: "E_CONFLICT" });
  finish();
  expect((await first).state).toBe("complete");
  expect(deps.marker.markLate).toHaveBeenCalledTimes(1);
});
it("marks only Paid bills strictly after their due timestamp", async () => {
  const deps = await setup([
    shipment(1, "2026-11-09T12:00:00Z"),
    { ...shipment(2), status: "CoveredByReserve" },
    { ...shipment(3), status: "Repaid" },
  ]);
  await deps.jobs.run("late");
  expect(deps.marker.markLate).not.toHaveBeenCalled();
  deps.setNow(Date.parse("2026-11-09T13:00:00Z"));
  expect((await deps.jobs.run("late")).counts.marked).toBe(1);
  expect(deps.marker.markLate).toHaveBeenCalledWith(1);
});
