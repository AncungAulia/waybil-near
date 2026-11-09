import { expect, it, vi } from "vitest";
import request from "supertest";
import type { JsonRpcProvider } from "near-api-js";
import type { ProposalReasonInput } from "@waybil/shared";
import { createApp } from "../../app";
import { testDeps, MemoryLeases, profile } from "../../test/support";
import { AdminNotes } from "./admin.service";
import { NearPauseProof } from "./admin.proof";
import { adminRoutes } from "./admin.routes";

function setup() {
  const deps = testDeps();
  const proposal = { id: 1, rejections: ["admin.testnet"] };
  let member = true;
  deps.chain.view = vi
    .fn()
    .mockImplementation(async (method: string) => (method === "is_member" ? member : proposal));
  const proof = { assert: vi.fn().mockResolvedValue(undefined) };
  const notes = new AdminNotes(deps.store, deps.chain, new MemoryLeases(), proof);
  return {
    ...deps,
    proposal,
    notes,
    proof,
    removeMember: () => {
      member = false;
    },
  };
}
it("records one private reason per real reject vote and rechecks team membership", async () => {
  const deps = setup();
  const actor = profile("admin");
  const input: ProposalReasonInput = {
    reason: "needs_history",
    note: "Sample private review note.",
  };
  const saved = await deps.notes.saveReason(actor, 1, input);
  expect(await deps.notes.saveReason(actor, 1, input)).toEqual(saved);
  expect((await deps.notes.reasons(actor, 1)).reasons).toHaveLength(1);
  await expect(
    deps.notes.saveReason(actor, 1, { ...input, reason: "other" }),
  ).rejects.toMatchObject({ code: "E_CONFLICT" });
  await expect(deps.notes.saveReason(profile("investor"), 1, input)).rejects.toMatchObject({
    code: "E_ACCESS",
  });
  deps.removeMember();
  await expect(deps.notes.reasons(actor, 1)).rejects.toMatchObject({ code: "E_ACCESS" });
});
it("requires a finalized successful direct pause receipt with matching actor and public arguments", async () => {
  const txHash = "1".repeat(43);
  const receipt = {
    final_execution_status: "FINAL",
    status: { SuccessValue: "" },
    receipts_outcome: [],
    transaction: {
      hash: txHash,
      signer_id: "admin.testnet",
      receiver_id: "app.waybil.testnet",
      actions: [
        {
          FunctionCall: {
            method_name: "pause_shipper",
            args: Buffer.from(
              JSON.stringify({ shipper: "shipper.testnet", reason: "payment_risk" }),
            ).toString("base64"),
          },
        },
      ],
    },
  };
  const view = vi.fn().mockResolvedValue(receipt);
  const proof = new NearPauseProof(
    { viewTransactionStatus: view } as unknown as JsonRpcProvider,
    "app.waybil.testnet",
  );
  await proof.assert("admin.testnet", "shipper.testnet", "payment_risk", txHash);
  await expect(
    proof.assert("other.testnet", "shipper.testnet", "payment_risk", txHash),
  ).rejects.toMatchObject({ code: "E_ACCESS" });
  await expect(
    proof.assert("admin.testnet", "shipper.testnet", "other", txHash),
  ).rejects.toMatchObject({ code: "E_ACCESS" });
  for (const change of [
    { final_execution_status: "EXECUTED_OPTIMISTIC" },
    { status: { Failure: {} } },
    { receipts_outcome: [{ outcome: { status: { Failure: {} } } }] },
    { transaction: { ...receipt.transaction, receiver_id: "another.testnet" } },
    {
      transaction: {
        ...receipt.transaction,
        actions: [...receipt.transaction.actions, ...receipt.transaction.actions],
      },
    },
  ]) {
    view.mockResolvedValueOnce({ ...receipt, ...change });
    await expect(
      proof.assert("admin.testnet", "shipper.testnet", "payment_risk", txHash),
    ).rejects.toMatchObject({ code: "E_ACCESS" });
  }
});
it("protects team routes and keeps pause notes immutable and separate from the receipt", async () => {
  const deps = setup();
  const actor = profile("admin");
  await deps.store.insert("profiles", actor.accountId, actor);
  const { token } = await deps.sessions.issue(actor);
  const app = createApp(deps, adminRoutes(deps, deps.notes));
  const input = {
    shipperId: "shipper.testnet",
    reason: "late_bills",
    note: "Sample private note.",
    txHash: "1".repeat(43),
  };
  expect((await request(app).post("/v1/admin/pauses").send(input)).status).toBe(401);
  const saved = await request(app)
    .post("/v1/admin/pauses")
    .auth(token, { type: "bearer" })
    .send(input);
  expect(saved.status).toBe(201);
  expect(deps.proof.assert).toHaveBeenCalledWith(
    actor.accountId,
    input.shipperId,
    input.reason,
    input.txHash,
  );
  expect(
    (await request(app).get("/v1/admin/pauses/shipper.testnet").auth(token, { type: "bearer" }))
      .body.notes,
  ).toHaveLength(1);
  expect(
    (
      await request(app)
        .post("/v1/admin/pauses")
        .auth(token, { type: "bearer" })
        .send({ ...input, note: "Changed" })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .post("/v1/admin/proposals/1/reasons")
        .auth(token, { type: "bearer" })
        .send({ reason: "unknown" })
    ).status,
  ).toBe(400);
});
