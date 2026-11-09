import { it, expect, vi } from "vitest";
import request from "supertest";
import type { CompanyInput, Application, Proposal } from "@waybil/shared";
import {
  testDeps,
  profile,
  MemoryLeases,
  MemoryFiles,
  samplePdf,
  samplePng,
} from "../../test/support";
import { Emails } from "../../lib/email";
import { Applications } from "./applications.service";
import { applicationRoutes } from "./applications.routes";
import { createApp } from "../../app";

export const sampleCompany: CompanyInput = {
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
function setup() {
  const deps = testDeps();
  const view = vi
    .fn()
    .mockImplementation(async (method: string, args: { account_id?: string }) =>
      method === "is_member" ? args.account_id === "admin.testnet" : null,
    );
  deps.chain.view = view;
  const files = new MemoryFiles();
  const leases = new MemoryLeases();
  const transport = { enabled: () => true, send: vi.fn().mockResolvedValue("sample-email-id") };
  const emails = new Emails(deps.store, transport, leases);
  const begin = vi.fn().mockResolvedValue("sample-review-id");
  return {
    ...deps,
    files,
    transport,
    service: new Applications(deps.store, deps.chain, files, emails, leases, begin),
    begin,
    view,
  };
}
it("stores private document evidence and signs links only for authorized readers", async () => {
  const { service, files } = setup();
  const actor = profile();
  const app = await service.create(actor, sampleCompany);
  const first = await service.upload(actor, app.id, "registration", samplePdf);
  const repeated = await service.upload(actor, app.id, "registration", samplePdf);
  expect(repeated.id).toBe(first.id);
  expect(files.objects.size).toBe(1);
  expect((await service.mine(actor)).documents[0]!.signedUrl).toContain("storage.example/signed");
  const before = files.signed.length;
  await expect(service.adminDetail(profile("driver"), app.id)).rejects.toMatchObject({
    code: "E_ACCESS",
  });
  expect(files.signed.length).toBe(before);
  await expect(
    service.edit({ ...actor, accountId: "other.testnet" }, app.id, sampleCompany),
  ).rejects.toMatchObject({ code: "E_ACCESS" });
  expect((await service.adminDetail(profile("admin"), app.id)).application.id).toBe(app.id);
});
it("requires both documents, freezes submissions and resumes the same review", async () => {
  const { service, begin } = setup();
  const actor = profile();
  const app = await service.create(actor, sampleCompany);
  await expect(service.submit(actor, app.id)).rejects.toMatchObject({ code: "E_NOT_FOUND" });
  await service.upload(actor, app.id, "registration", samplePdf);
  await service.upload(actor, app.id, "bank_statement", samplePng);
  const submitted = await service.submit(actor, app.id);
  expect(submitted.state).toBe("in_review");
  expect(submitted.submissionNumber).toBe(1);
  expect((await service.submit(actor, app.id)).reviewId).toBe("sample-review-id");
  expect(begin).toHaveBeenCalledTimes(1);
  await expect(service.upload(actor, app.id, "registration", samplePdf)).rejects.toMatchObject({
    code: "E_CONFLICT",
  });
});
it("keeps approval pending until a matching proposal executes", async () => {
  const { service, store, view } = setup();
  const app = await service.create(profile(), sampleCompany);
  await store.replace("applications", app.id, 0, {
    ...app,
    state: "in_review",
  } satisfies Application);
  let status: Proposal["status"] = "Open";
  view.mockImplementation(async (method: string) =>
    method === "is_member"
      ? true
      : method === "get_proposal"
        ? { id: 1, kind: { StartShipper: { shipper: app.shipperId, limit: "2000000000" } }, status }
        : status === "Approved"
          ? { limit: "2000000000" }
          : null,
  );
  expect((await service.linkProposal(profile("admin"), app.id, 1)).state).toBe("in_review");
  status = "Approved";
  expect((await service.mine(profile())).application.state).toBe("approved");
});
it("persists a rejection and deduplicates its email", async () => {
  const { service, transport } = setup();
  const app = await service.create(profile(), sampleCompany);
  const input = { reason: "unclear_documents", note: "Please provide a clearer statement." };
  expect((await service.reject(profile("admin"), app.id, input)).emailStatus).toBe("sent");
  expect((await service.reject(profile("admin"), app.id, input)).application.state).toBe(
    "rejected",
  );
  expect(transport.send).toHaveBeenCalledTimes(1);
});
it("rejects oversized uploads over HTTP and non-file bytes", async () => {
  const deps = setup();
  const actor = profile();
  await deps.store.insert("profiles", actor.accountId, actor);
  const { token } = await deps.sessions.issue(actor);
  const app = await deps.service.create(actor, sampleCompany);
  await expect(
    deps.service.upload(actor, app.id, "registration", Buffer.from("not a document")),
  ).rejects.toMatchObject({ code: "E_FILE_TYPE" });
  const http = createApp(deps, applicationRoutes(deps, deps.service));
  const response = await request(http)
    .post(`/v1/applications/${app.id}/documents`)
    .auth(token, { type: "bearer" })
    .field("kind", "registration")
    .attach("file", Buffer.alloc(2097153), "sample.pdf");
  expect(response.status).toBe(413);
  expect(response.body.error.code).toBe("E_TOO_LARGE");
});
