import { it, expect, vi } from "vitest";
import type { Application, CompanyInput, Shipper, Shipment, Proposal } from "@waybil/shared";
import { testDeps, profile, MemoryFiles, MemoryLeases, samplePng } from "../../test/support";
import { Emails } from "../../lib/email";
import { Applications, type ApplicationDocument } from "../applications/applications.service";
import { sha256 } from "../../lib/storage";
import type { PaperReader, ProofEvidence } from "../../lib/near-ai";
import { UnreadablePapers } from "../../lib/near-ai";
import { Credit } from "./credit.service";
import type { CreditWriter } from "./credit.writer";
import { creditPolicy, targetLimit, type ExtractedPapers } from "./credit.schema";

const now = Date.parse("2026-11-09T12:00:00Z");
const company: CompanyInput = {
  name: "SAMPLE Freight",
  registration: "1234567890123",
  country: "United States",
  province: "Maine",
  city: "Eastport",
  address: "1 Sample Road",
  postal: "00000",
  contact: "Sample Person",
  job: "Finance",
  phone: "+12075550142",
  email: "sample@example.com",
  trips: 40,
  shippingSpend: "12000000000",
  routes: "Eastport to Harbor City",
};
const papers: ExtractedPapers = {
  readable: true,
  registrationCompany: company.name,
  registrationNumber: company.registration,
  bankCompany: company.name,
  currency: "USD",
  monthlyOutgoing: ["2026-08", "2026-09", "2026-10"].map((month) => ({
    month,
    amount: "12000.00",
  })),
  reasons: [],
};
const proof: ProofEvidence = {
  model: "sample-confidential-model",
  chatId: "sample-chat",
  requestHash: "a".repeat(64),
  responseHash: "b".repeat(64),
  signature: "sample-test-signature",
  signer: "c".repeat(64),
  verification: "pinned_model_signer",
  attestationReference: "https://cloud-api.near.ai/v1/attestation/report",
  attestation: {},
  nonce: "d".repeat(64),
};
const policy = {
  version: "test-policy-v1",
  currency: "USD",
  outgoingFractionBps: 2500,
  usdcNumerator: "1",
  usdcDenominator: "1",
  maxLimit: "10000000000",
};
async function setup(enabled = true) {
  const deps = testDeps();
  deps.env.CREDIT_AUTO_LIMITS = enabled;
  deps.env.CREDIT_POLICY_JSON = JSON.stringify(policy);
  const files = new MemoryFiles();
  const leases = new MemoryLeases();
  const shipper = {
    limit: "2500000000",
    owed: "0",
    committed: "0",
    paused: null,
    late_bills: 0,
    blocked_until: "0",
    raise_window_start: (BigInt(now) * 1000000n).toString(),
    raise_window_base: "2500000000",
  } satisfies Shipper;
  const shipments: Shipment[] = [];
  const proposals: Proposal[] = [];
  deps.chain.view = vi
    .fn()
    .mockImplementation(
      async (method: string, args: { id?: number; from?: number; account_id?: string }) => {
        if (method === "get_shipper") return shipper;
        if (method === "get_config")
          return { max_limit: "10000000000", assistant_raise_bps: 2000, proposal_ttl_days: 7 };
        if (method === "list_proposals") return proposals.slice(-1);
        if (method === "get_proposal") return proposals.find((p) => p.id === args.id) ?? null;
        if (method === "list_shipments_by_shipper")
          return shipments.slice(args.from ?? 0, (args.from ?? 0) + 50);
        if (method === "is_member") return args.account_id === "admin.testnet";
        return null;
      },
    );
  const app: Application = {
    id: "00000000-0000-4000-8000-000000000001",
    shipperId: "shipper.testnet",
    company,
    state: "approved",
    documents: { registration: "registration", bank_statement: "bank" },
    proposalId: null,
    reviewId: null,
    submissionNumber: 1,
    rejection: null,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  await deps.store.insert("applications", app.id, app);
  for (const [id, kind] of [
    ["registration", "registration"],
    ["bank", "bank_statement"],
  ] as const) {
    const doc: ApplicationDocument = {
      id,
      kind,
      applicationId: app.id,
      path: `${id}.png`,
      mime: "image/png",
      size: samplePng.length,
      sha256: sha256(samplePng),
      state: "ready",
      createdAt: new Date(now).toISOString(),
    };
    await deps.store.insert("application_documents", id, doc);
    await files.put("documents", doc.path, samplePng);
  }
  const reader: PaperReader = {
    check: vi.fn().mockResolvedValue({ papers: structuredClone(papers), proof }),
  };
  const writer: CreditWriter = {
    time: async () => BigInt(now) * 1000000n,
    prepare: vi.fn().mockImplementation(async (_shipper, limit, method) => ({
      txHash: "sample-limit-tx",
      bytes: "sample-signed-transaction",
      limit,
      method,
    })),
    check: vi.fn().mockResolvedValue({ status: "confirmed", proposalId: null }),
  };
  return {
    ...deps,
    files,
    leases,
    shipper,
    shipments,
    proposals,
    app,
    reader,
    writer,
    credit: new Credit(deps.store, deps.chain, files, reader, writer, leases, deps.env, () => now),
  };
}
it("uses only an explicitly configured formula and exact base-unit arithmetic", async () => {
  expect(targetLimit(creditPolicy.parse(policy), papers)).toBe("3000000000");
  const deps = await setup();
  deps.env.CREDIT_POLICY_JSON = "";
  const review = await deps.credit.request(profile());
  expect((await deps.credit.work(review.id)).result).toBe("no_change");
  expect(deps.writer.prepare).not.toHaveBeenCalled();
});
it("raises exactly at the weekly cap and proposes above it", async () => {
  const deps = await setup();
  const review = await deps.credit.request(profile());
  expect((await deps.credit.work(review.id)).result).toBe("raised");
  expect(deps.writer.prepare).toHaveBeenCalledWith(
    "shipper.testnet",
    "3000000000",
    "assistant_set_limit",
  );
  const larger = await setup();
  larger.shipper.limit = "2000000000";
  larger.shipper.raise_window_base = "2000000000";
  vi.mocked(larger.writer.check).mockResolvedValue({ status: "confirmed", proposalId: 9 });
  const next = await larger.credit.request(profile());
  expect((await larger.credit.work(next.id)).result).toBe("proposed");
  expect(larger.writer.prepare).toHaveBeenCalledWith(
    "shipper.testnet",
    "3000000000",
    "assistant_propose",
  );
});
it("keeps ambiguous writes durable and never prepares a replacement transaction", async () => {
  const deps = await setup();
  vi.mocked(deps.writer.check).mockRejectedValueOnce(new Error("RPC timeout"));
  const review = await deps.credit.request(profile());
  expect((await deps.credit.work(review.id)).state).toBe("writing");
  expect((await deps.credit.work(review.id)).result).toBe("raised");
  expect(deps.writer.prepare).toHaveBeenCalledTimes(1);
});
it("does not write on unclear papers, disabled automation or provider failure", async () => {
  const unclear = await setup();
  vi.mocked(unclear.reader.check).mockResolvedValue({
    papers: { ...papers, registrationCompany: "Other Company" },
    proof,
  });
  let review = await unclear.credit.request(profile());
  expect((await unclear.credit.work(review.id)).needsCloserLook).toBe(true);
  expect(unclear.writer.prepare).not.toHaveBeenCalled();
  const disabled = await setup(false);
  review = await disabled.credit.request(profile());
  expect((await disabled.credit.work(review.id)).result).toBe("no_change");
  expect(disabled.writer.prepare).not.toHaveBeenCalled();
  const failed = await setup();
  vi.mocked(failed.reader.check).mockRejectedValue(new Error("unverified model output"));
  review = await failed.credit.request(profile());
  expect((await failed.credit.work(review.id)).result).toBe("failed");
  expect(failed.writer.prepare).not.toHaveBeenCalled();
});
it("checks old pending proposals beyond the newest 50 and respects TTL/cooldown", async () => {
  const deps = await setup();
  for (let id = 1; id <= 60; id++)
    deps.proposals.push({
      id,
      kind: {
        SetLimit: { shipper: id === 1 ? "shipper.testnet" : "other.testnet", limit: "4000000000" },
      },
      status: "Open",
      created_at: (BigInt(now) * 1000000n).toString(),
    } as Proposal);
  await expect(deps.credit.request(profile())).rejects.toMatchObject({ code: "E_CREDIT_PENDING" });
  deps.proposals[0]!.created_at = (BigInt(now - 8 * 86400000) * 1000000n).toString();
  const request = await deps.credit.request(profile());
  expect(request.state).toBe("queued");
  const blocked = await setup();
  blocked.shipper.blocked_until = (BigInt(now + 1000) * 1000000n).toString();
  await expect(blocked.credit.request(profile())).rejects.toMatchObject({
    code: "E_CREDIT_COOLDOWN",
  });
});
it("requires three bills paid after a genuine no-change decision", async () => {
  const deps = await setup();
  deps.shipper.limit = "4000000000";
  const review = await deps.credit.request(profile());
  expect((await deps.credit.work(review.id)).result).toBe("no_change");
  await expect(deps.credit.request(profile())).rejects.toMatchObject({ code: "E_CREDIT_HISTORY" });
  for (let id = 1; id <= 3; id++) deps.shipments.push({ id, status: "Repaid" } as Shipment);
  expect((await deps.credit.request(profile())).state).toBe("queued");
});
it("connects application submission to the durable evaluator without activating a starting limit", async () => {
  const deps = await setup();
  const appRow = (await deps.store.get<Application>("applications", deps.app.id))!;
  await deps.store.replace("applications", deps.app.id, appRow.version, {
    ...appRow.value,
    state: "draft",
  });
  const emails = new Emails(
    deps.store,
    { enabled: () => false, send: async () => "unused" },
    deps.leases,
  );
  const applications = new Applications(
    deps.store,
    deps.chain,
    deps.files,
    emails,
    deps.leases,
    (app) => deps.credit.beginInitial(app),
  );
  const submitted = await applications.submit(profile(), deps.app.id);
  const result = await deps.credit.work(submitted.reviewId!);
  expect(result.suggestedLimit).toBe("3000000000");
  expect(deps.writer.prepare).not.toHaveBeenCalled();
  expect((await deps.store.get<Application>("applications", deps.app.id))!.value.state).toBe(
    "in_review",
  );
  await expect(deps.credit.proof(profile("investor"), result.id)).rejects.toMatchObject({
    code: "E_ACCESS",
  });
});
it("returns unreadable initial papers for a closer look and resumes worker state", async () => {
  const deps = await setup();
  const appRow = (await deps.store.get<Application>("applications", deps.app.id))!;
  const app = { ...appRow.value, state: "in_review" as const };
  await deps.store.replace("applications", deps.app.id, appRow.version, app);
  const id = await deps.credit.beginInitial(app);
  vi.mocked(deps.reader.check).mockRejectedValue(new UnreadablePapers());
  expect((await deps.credit.tick()).processed).toBe(1);
  expect((await deps.credit.latest(profile())).id).toBe(id);
  expect((await deps.store.get<Application>("applications", deps.app.id))!.value.state).toBe(
    "needs_more",
  );
  expect((await deps.credit.tick()).processed).toBe(0);
});
