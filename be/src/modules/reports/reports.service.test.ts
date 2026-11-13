import request from "supertest";
import { createApp } from "../../app";
import { reportRoutes } from "./reports.routes";
import { it, expect, vi } from "vitest";
import { KeyPair, KeyPairSigner, DelegateAction, actions, encodeSignedDelegate } from "near-api-js";
import type { Shipment, ReportInput } from "@waybil/shared";
import {
  testDeps,
  profile,
  MemoryFiles,
  MemoryLeases,
  samplePdf,
  samplePng,
} from "../../test/support";
import { Reports, canonicalReport, type ReportRecord } from "./reports.service";
import { sha256 } from "../../lib/storage";
import { RelayService } from "../relay/relay.service";
import type { RelayProvider } from "../relay/relay.provider";

const input: ReportInput = {
  shipmentId: 1,
  goodQty: 112,
  reasons: ["damaged"],
  note: "SAMPLE 8 crates arrived damaged.",
};
function setup() {
  const deps = testDeps();
  const shipment = {
    id: 1,
    driver: "driver.testnet",
    shipper: "shipper.testnet",
    destination: 1,
    qty: 120,
    status: "PickedUp",
    report_hash: null,
  } as Shipment;
  deps.chain.view = vi
    .fn()
    .mockImplementation(async (method: string, args: { account_id?: string }) =>
      method === "get_shipment"
        ? shipment
        : method === "get_destination"
          ? { warehouse: "warehouse.testnet" }
          : args.account_id === "admin.testnet",
    );
  const files = new MemoryFiles();
  const leases = new MemoryLeases();
  return {
    ...deps,
    shipment,
    files,
    leases,
    reports: new Reports(deps.store, deps.chain, files, leases),
  };
}
it("hashes normalized content plus ordered photo hashes and keeps retries immutable", async () => {
  const { reports } = setup();
  const first = await reports.create(profile("warehouse"), input, [samplePng]);
  const repeated = await reports.create(
    profile("warehouse"),
    { ...input, note: `  ${input.note}  ` },
    [samplePng],
  );
  expect(repeated.reportHash).toBe(first.reportHash);
  await expect(
    reports.create(profile("warehouse"), { ...input, note: "Changed note" }, [samplePng]),
  ).rejects.toMatchObject({ code: "E_CONFLICT" });
  const p1 = { sha256: sha256(samplePng), mime: "image/png", size: samplePng.length };
  const p2 = { ...p1, sha256: "a".repeat(64) };
  expect(sha256(canonicalReport(input, "warehouse.testnet", [p1, p2]))).not.toBe(
    sha256(canonicalReport(input, "warehouse.testnet", [p2, p1])),
  );
  expect(sha256(canonicalReport({ ...input, goodQty: 111 }, "warehouse.testnet", [p1]))).not.toBe(
    first.reportHash,
  );
});
it("allows only shipment participants/team to receive private photo links", async () => {
  const { reports, files } = setup();
  await reports.create(profile("warehouse"), input, [samplePng]);
  for (const role of ["shipper", "driver", "warehouse", "admin"] as const)
    expect((await reports.read(profile(role), 1)).photos).toHaveLength(1);
  const before = files.signed.length;
  await expect(reports.read(profile("investor"), 1)).rejects.toMatchObject({ code: "E_ACCESS" });
  expect(files.signed.length).toBe(before);
  await expect(
    reports.create({ ...profile("warehouse"), accountId: "other.testnet" }, input, []),
  ).rejects.toMatchObject({ code: "E_ACCESS" });
});
it("resumes interrupted uploads and rejects invalid counts/photos", async () => {
  const { reports, files } = setup();
  const put = vi.spyOn(files, "put").mockRejectedValueOnce(new Error("storage timeout"));
  await expect(reports.create(profile("warehouse"), input, [samplePng])).rejects.toThrow();
  await expect(reports.read(profile("warehouse"), 1)).rejects.toMatchObject({
    code: "E_UNAVAILABLE",
  });
  expect((await reports.create(profile("warehouse"), input, [samplePng])).reportHash).toHaveLength(
    64,
  );
  expect(put).toHaveBeenCalledTimes(2);
  await expect(
    reports.create(profile("warehouse"), { ...input, goodQty: 121 }, []),
  ).rejects.toMatchObject({ code: "E_VALIDATION" });
  await expect(reports.create(profile("warehouse"), input, [samplePdf])).rejects.toMatchObject({
    code: "E_FILE_TYPE",
  });
});
it("rejects altered metadata and mismatched chain evidence", async () => {
  const { reports, store, shipment } = setup();
  const saved = await reports.create(profile("warehouse"), input, []);
  shipment.report_hash = "b".repeat(64);
  await expect(reports.read(profile("warehouse"), 1)).rejects.toMatchObject({
    code: "E_REPORT_INTEGRITY",
  });
  shipment.report_hash = null;
  const row = (await store.get<ReportRecord>("reports", "1"))!;
  await store.replace("reports", "1", row.version, { ...row.value, goodQty: 111 });
  await expect(reports.validateConfirmation(shipment, saved.reportHash, 111)).rejects.toMatchObject(
    { code: "E_REPORT_INTEGRITY" },
  );
});
it("connects a stored report to an actual signed warehouse delegate", async () => {
  const deps = setup();
  const saved = await deps.reports.create(profile("warehouse"), input, [samplePng]);
  const key = KeyPair.fromRandom("ed25519");
  await deps.store.insert("auth_identities", "a".repeat(64), {
    ready: true,
    accountId: "warehouse.testnet",
    devicePublicKey: key.getPublicKey().toString(),
  });
  const provider: RelayProvider = {
    access: async () => ({
      nonce: 0n,
      height: 100n,
      receiver: deps.env.WAYBIL_CONTRACT,
      methods: ["confirm_delivery"],
    }),
    prepare: async () => ({ txHash: "sample-report-tx", bytes: "sample-outer-tx" }),
    status: async () => null,
    broadcast: async () => {
      deps.shipment.status = "Reported";
      deps.shipment.report_hash = saved.reportHash;
      return "confirmed";
    },
  };
  const relay = new RelayService(
    deps.store,
    deps.chain,
    provider,
    deps.leases,
    deps.env.WAYBIL_CONTRACT,
    (shipment, hash, goodQty) => deps.reports.validateConfirmation(shipment, hash, goodQty),
  );
  const delegate = new DelegateAction({
    senderId: "warehouse.testnet",
    receiverId: deps.env.WAYBIL_CONTRACT,
    nonce: 1n,
    maxBlockHeight: 150n,
    publicKey: key.getPublicKey(),
    actions: [actions.functionCall("confirm_delivery", saved.confirmArgs, 50000000000000n, 0n)],
  });
  const signed = await new KeyPairSigner(key).signDelegateAction(delegate);
  await deps.store.insert("arrival_codes", "1", {
    shipmentId: 1,
    code: "ABCD2345",
    createdAt: "2026-11-12T00:00:00Z",
  });
  expect(
    (
      await relay.relay(
        profile("warehouse"),
        Buffer.from(encodeSignedDelegate(signed.signedDelegate)).toString("base64"),
        "ABCD2345",
      )
    ).status,
  ).toBe("confirmed");
  expect((await deps.reports.read(profile("shipper"), 1)).recorded).toBe(true);
});

it("exercises multipart report creation and shipment access through HTTP", async () => {
  const deps = setup();
  const warehouse = profile("warehouse");
  const outsider = profile("investor");
  await deps.store.insert("profiles", warehouse.accountId, warehouse);
  await deps.store.insert("profiles", outsider.accountId, outsider);
  const token = (await deps.sessions.issue(warehouse)).token;
  const otherToken = (await deps.sessions.issue(outsider)).token;
  const app = createApp(deps, reportRoutes(deps, deps.reports));
  const created = await request(app)
    .post("/v1/reports")
    .auth(token, { type: "bearer" })
    .field("report", JSON.stringify(input))
    .attach("photos", Buffer.from(samplePng), "sample.png");
  expect(created.status).toBe(201);
  expect(created.body.confirmArgs.report_hash).toBe(created.body.reportHash);
  expect(
    (await request(app).get("/v1/reports/1").auth(otherToken, { type: "bearer" })).status,
  ).toBe(403);
  expect((await request(app).get("/v1/reports/1").auth(token, { type: "bearer" })).status).toBe(
    200,
  );
});
