import { it, expect, vi } from "vitest";
import { Account, KeyPair, KeyPairSigner } from "near-api-js";
import { signMessage } from "near-api-js/nep413";
import { AuthProvider } from "./auth.provider";
import { AccountDoesNotExistError } from "near-api-js/rpc-errors";
import { sdkProvider } from "../../lib/near-sdk";
import { testEnv, MemoryLeases } from "../../test/support";

it("creates only role-scoped device access and resumes an existing recovery-owned account", async () => {
  const env = testEnv();
  env.USERS_PRIVATE_KEY = KeyPair.fromRandom("ed25519").toString();
  const provider = sdkProvider(env);
  const recovery = KeyPair.fromRandom("ed25519");
  const device = KeyPair.fromRandom("ed25519").getPublicKey().toString();
  const accountId = "sample.users.waybil.testnet";
  const view = vi
    .spyOn(provider, "viewAccount")
    .mockRejectedValueOnce(new AccountDoesNotExistError(accountId, "block", 1))
    .mockResolvedValue({
      amount: 1000000000000000000000000n,
      locked: 0n,
      code_hash: "none",
      storage_usage: 0,
      block_hash: "block",
      block_height: 1,
    });
  vi.spyOn(provider, "viewAccessKey").mockImplementation(async ({ publicKey }) => ({
    permission:
      String(publicKey) === recovery.getPublicKey().toString()
        ? "FullAccess"
        : { FunctionCall: { receiver_id: env.WAYBIL_CONTRACT, method_names: ["confirm_pickup"] } },
    nonce: 0n,
    block_height: 1,
    block_hash: "block",
  }));
  const send = vi.spyOn(Account.prototype, "signAndSendTransaction").mockResolvedValue({} as never);
  try {
    const auth = new AuthProvider(env, provider, new MemoryLeases());
    await auth.ensureAccount(accountId, device, recovery.toString(), "driver");
    const request = send.mock.calls[0]![0];
    expect(request.receiverId).toBe(accountId);
    expect(request.actions[1]!.transfer!.deposit).toBe(5000000000000000000000n);
    const rule = request.actions[3]!.addKey!.accessKey.permission.functionCall!;
    expect(rule.methodNames).toEqual(["confirm_pickup"]);
    expect(rule.receiverId).toBe(env.WAYBIL_CONTRACT);
    await auth.ensureAccount(accountId, device, recovery.toString(), "driver");
    expect(view).toHaveBeenCalledTimes(3);
    expect(send).toHaveBeenCalledTimes(1);
  } finally {
    send.mockRestore();
  }
});

it("verifies actual NEP-413 signatures and rejects a function-call key", async () => {
  const env = testEnv();
  const provider = sdkProvider(env);
  const permission = vi.spyOn(provider, "viewAccessKey").mockResolvedValue({
    permission: "FullAccess",
    nonce: 0n,
    block_height: 1,
    block_hash: "test-block",
  });
  const key = KeyPair.fromRandom("ed25519");
  const account = new Account("sam.testnet", provider, new KeyPairSigner(key));
  const challenge = {
    id: "test",
    message: "Sign in to Waybil.",
    recipient: "localhost:3001",
    nonce: Buffer.alloc(32, 1).toString("base64"),
    callbackUrl: "http://localhost:3001/start",
    expiresAt: new Date().toISOString(),
  };
  const signed = await signMessage({
    signerAccount: account,
    payload: { ...challenge, nonce: Buffer.from(challenge.nonce, "base64") },
  });
  const service = new AuthProvider(env, provider, new MemoryLeases());
  await service.verifyWallet(
    account.accountId,
    key.getPublicKey().toString(),
    Buffer.from(signed.signature).toString("base64"),
    challenge,
  );
  await expect(
    service.verifyWallet(
      account.accountId,
      key.getPublicKey().toString(),
      Buffer.from(signed.signature).toString("base64"),
      { ...challenge, recipient: "attacker.example" },
    ),
  ).rejects.toMatchObject({ code: "E_SESSION" });
  permission.mockResolvedValue({
    permission: {
      FunctionCall: { receiver_id: env.WAYBIL_CONTRACT, method_names: ["confirm_pickup"] },
    },
    nonce: 0n,
    block_height: 1,
    block_hash: "test-block",
  });
  await expect(
    service.verifyWallet(
      account.accountId,
      key.getPublicKey().toString(),
      Buffer.from(signed.signature).toString("base64"),
      challenge,
    ),
  ).rejects.toMatchObject({ code: "E_SESSION" });
});
