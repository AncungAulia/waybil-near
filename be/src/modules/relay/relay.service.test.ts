import { it, expect, vi } from "vitest";
import {
  actions,
  DelegateAction,
  KeyPair,
  KeyPairSigner,
  encodeSignedDelegate,
  type Action,
} from "near-api-js";
import type { Shipment } from "@waybil/shared";
import { testDeps, MemoryLeases, profile } from "../../test/support";
import { RelayService } from "./relay.service";
import type { RelayProvider } from "./relay.provider";
import { decodeDelegate } from "./relay.schema";
import { createApp } from "../../app";
import { relayRoutes } from "./relay.routes";
import request from "supertest";

const shipment = {
  id: 1,
  driver: "driver.testnet",
  shipper: "shipper.testnet",
  destination: 1,
  qty: 120,
  status: "Approved",
} as Shipment;
async function setup() {
  const deps = testDeps();
  deps.chain.view = vi
    .fn()
    .mockImplementation(async (method: string) =>
      method === "get_shipment" ? shipment : { warehouse: "warehouse.testnet" },
    );
  const key = KeyPair.fromRandom("ed25519");
  await deps.store.insert("auth_identities", "a".repeat(64), {
    accountId: "driver.testnet",
    ready: true,
    devicePublicKey: key.getPublicKey().toString(),
  });
  const provider: RelayProvider = {
    access: vi.fn().mockResolvedValue({
      nonce: 0n,
      height: 100n,
      receiver: deps.env.WAYBIL_CONTRACT,
      methods: ["confirm_pickup"],
    }),
    prepare: vi
      .fn()
      .mockResolvedValue({ txHash: "sample-hash", bytes: "sample-signed-transaction" }),
    status: vi.fn().mockResolvedValue(null),
    broadcast: vi.fn().mockResolvedValue("confirmed"),
  };
  const service = new RelayService(
    deps.store,
    deps.chain,
    provider,
    new MemoryLeases(),
    deps.env.WAYBIL_CONTRACT,
  );
  async function sign(
    options: {
      sender?: string;
      receiver?: string;
      calls?: Action[];
      nonce?: bigint;
      height?: bigint;
    } = {},
  ) {
    const delegate = new DelegateAction({
      senderId: options.sender ?? "driver.testnet",
      receiverId: options.receiver ?? deps.env.WAYBIL_CONTRACT,
      actions: options.calls ?? [
        actions.functionCall("confirm_pickup", { id: 1 }, 50000000000000n, 0n),
      ],
      nonce: options.nonce ?? 1n,
      maxBlockHeight: options.height ?? 150n,
      publicKey: key.getPublicKey(),
    });
    const signed = await new KeyPairSigner(key).signDelegateAction(delegate);
    return Buffer.from(encodeSignedDelegate(signed.signedDelegate)).toString("base64");
  }
  return { ...deps, provider, service, sign };
}
it("verifies real signatures and reuses the original transaction on retries", async () => {
  const { service, sign, provider } = await setup();
  const encoded = await sign();
  expect((await service.relay(profile("driver"), encoded)).status).toBe("confirmed");
  expect((await service.relay(profile("driver"), encoded)).txHash).toBe("sample-hash");
  expect(provider.prepare).toHaveBeenCalledTimes(1);
  expect(provider.broadcast).toHaveBeenCalledTimes(1);
});
it("keeps an ambiguous broadcast pending and reconciles it without a new signature", async () => {
  const { service, sign, provider } = await setup();
  vi.mocked(provider.broadcast).mockRejectedValueOnce(new Error("timeout"));
  const encoded = await sign();
  expect((await service.relay(profile("driver"), encoded)).status).toBe("pending");
  vi.mocked(provider.status).mockResolvedValue("confirmed");
  expect((await service.relay(profile("driver"), encoded)).status).toBe("confirmed");
  expect(provider.prepare).toHaveBeenCalledTimes(1);
});
it("rejects invalid signatures, senders, receivers, methods and attached funds", async () => {
  const { service, sign } = await setup();
  const actor = profile("driver");
  await expect(service.relay(actor, await sign({ sender: "other.testnet" }))).rejects.toMatchObject(
    { code: "E_ACCESS" },
  );
  await expect(
    service.relay(actor, await sign({ receiver: "other.testnet" })),
  ).rejects.toMatchObject({ code: "E_ACCESS" });
  for (const call of [
    actions.transfer(1n),
    actions.functionCall("pause_shipper", {}, 1n, 0n),
    actions.functionCall("confirm_pickup", { id: 1 }, 1n, 1n),
    actions.functionCall("confirm_pickup", { id: 1 }, 100000000000001n, 0n),
  ]) {
    await expect(service.relay(actor, await sign({ calls: [call] }))).rejects.toMatchObject({
      code: "E_DELEGATE",
    });
  }
  const signed = decodeDelegate(await sign());
  signed.signature.data[0] = signed.signature.data[0]! ^ 1;
  await expect(
    service.relay(actor, Buffer.from(encodeSignedDelegate(signed)).toString("base64")),
  ).rejects.toMatchObject({ code: "E_SIGNATURE" });
});
it("rejects multiple calls, trailing bytes, stale nonces and expiry", async () => {
  const { service, sign, provider } = await setup();
  const calls = [
    actions.functionCall("confirm_pickup", { id: 1 }, 1n, 0n),
    actions.functionCall("confirm_pickup", { id: 1 }, 1n, 0n),
  ];
  await expect(service.relay(profile("driver"), await sign({ calls }))).rejects.toMatchObject({
    code: "E_DELEGATE",
  });
  const encoded = await sign();
  expect(() =>
    decodeDelegate(
      Buffer.concat([Buffer.from(encoded, "base64"), Buffer.from([0])]).toString("base64"),
    ),
  ).toThrow();
  await expect(
    service.relay(profile("driver"), await sign({ height: 100n })),
  ).rejects.toMatchObject({ code: "E_DELEGATE_EXPIRED" });
  vi.mocked(provider.access).mockResolvedValue({
    nonce: 1n,
    height: 100n,
    receiver: "app.waybil.testnet",
    methods: ["confirm_pickup"],
  });
  await expect(service.relay(profile("driver"), await sign())).rejects.toMatchObject({
    code: "E_DELEGATE_EXPIRED",
  });
});
it("rejects non-ABI arguments and rate limits by the authenticated account", async () => {
  const deps = await setup();
  await expect(
    deps.service.relay(
      profile("driver"),
      await deps.sign({ calls: [actions.functionCall("confirm_pickup", { id: "1" }, 1n, 0n)] }),
    ),
  ).rejects.toMatchObject({ code: "E_VALIDATION" });
  const p = profile("driver");
  await deps.store.insert("profiles", p.accountId, p);
  const { token } = await deps.sessions.issue(p);
  const app = createApp(deps, relayRoutes(deps, deps.service));
  const signedDelegate = await deps.sign();
  for (let i = 0; i < 30; i++)
    expect(
      (
        await request(app)
          .post("/v1/relay")
          .auth(token, { type: "bearer" })
          .send({ signedDelegate })
      ).status,
    ).toBe(200);
  expect(
    (await request(app).post("/v1/relay").auth(token, { type: "bearer" }).send({ signedDelegate }))
      .status,
  ).toBe(429);
});
