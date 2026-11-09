import { it, expect, vi } from "vitest";
import { KeyPair } from "near-api-js";
import { testDeps, MemoryLeases, profile } from "../../test/support";
import { RecoveryKeys } from "../../lib/recovery";
import { Invites } from "../invites/invites.service";
import { AuthService, subjectHash, type Identity } from "./auth.service";
import type { LoginProvider } from "./auth.ports";
import { parse } from "../../middlewares/validate";
import { profileUpdate } from "./auth.schema";

function setup() {
  const deps = testDeps();
  const recoveryKey = KeyPair.fromRandom("ed25519");
  const provider: LoginProvider = {
    verifyWallet: vi.fn().mockResolvedValue(undefined),
    verifyGoogle: vi.fn().mockImplementation(async (_token: string, nonce: string) => ({
      sub: "subject-1",
      nonce,
      name: "Sam",
      email: "sam@example.com",
    })),
    newRecoveryKey: () => ({
      secret: recoveryKey.toString(),
      publicKey: recoveryKey.getPublicKey().toString(),
    }),
    validPublicKey: vi.fn(),
    ensureAccount: vi.fn().mockResolvedValue(undefined),
    replaceDevice: vi.fn().mockResolvedValue(undefined),
    registerToken: vi.fn().mockResolvedValue(undefined),
  };
  const invites = new Invites(deps.store, deps.chain, deps.env.APP_URL);
  let now = Date.now();
  const recovery = new RecoveryKeys(Buffer.alloc(32, 1).toString("base64"));
  const service = new AuthService(
    deps.store,
    deps.chain,
    provider,
    deps.sessions,
    new MemoryLeases(),
    invites,
    deps.env,
    recovery,
    () => now,
  );
  return {
    ...deps,
    provider,
    service,
    recovery,
    advance: (n: number) => {
      now += n;
    },
  };
}
const key = () => KeyPair.fromRandom("ed25519").getPublicKey().toString();
it("consumes a wallet challenge once, including simultaneous requests", async () => {
  const { service } = setup();
  const challenge = await service.challenge({
    kind: "wallet",
    accountId: "sam.testnet",
    role: "shipper",
  });
  const body = {
    accountId: "sam.testnet",
    publicKey: key(),
    signature: "signature",
    challengeId: challenge.id,
    nonce: challenge.nonce,
  };
  const results = await Promise.allSettled([service.wallet(body), service.wallet(body)]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  await expect(service.wallet(body)).rejects.toMatchObject({ code: "E_SESSION" });
});
it("binds the wallet account, expires challenges and derives admin only from the chain", async () => {
  const { service, chain, advance } = setup();
  const c = await service.challenge({ kind: "wallet", accountId: "sam.testnet", role: "investor" });
  const input = {
    challengeId: c.id,
    nonce: c.nonce,
    accountId: "other.testnet",
    publicKey: key(),
    signature: "signature",
  };
  await expect(service.wallet(input)).rejects.toMatchObject({ code: "E_ACCESS" });
  advance(300000);
  await expect(service.wallet({ ...input, accountId: "sam.testnet" })).rejects.toMatchObject({
    code: "E_SESSION",
  });
  chain.view = vi.fn().mockResolvedValue(true);
  const admin = await service.challenge({ kind: "wallet", accountId: "risk.waybil.testnet" });
  expect(
    (
      await service.wallet({
        ...input,
        accountId: "risk.waybil.testnet",
        challengeId: admin.id,
        nonce: admin.nonce,
      })
    ).profile.role,
  ).toBe("admin");
});
it("resumes failed token registration and issues no session until ready", async () => {
  const { service, provider, store, recovery } = setup();
  vi.mocked(provider.registerToken).mockRejectedValueOnce(new Error("storage unavailable"));
  const publicKey = key();
  let challenge = await service.challenge({ kind: "google", publicKey });
  await expect(service.google({ challengeId: challenge.id, idToken: "token" })).rejects.toThrow();
  const identity = (await store.get<Identity>("auth_identities", subjectHash("subject-1")))!;
  expect(identity.value.ready).toBe(false);
  const privateKey = recovery.open(identity.value.recovery, identity.value.subjectHash);
  expect(JSON.stringify(identity.value)).not.toContain(privateKey);
  expect(privateKey).toMatch(/^ed25519:/);
  challenge = await service.challenge({ kind: "google", publicKey });
  const session = await service.google({ challengeId: challenge.id, idToken: "new-token" });
  expect(session.profile.accountId).toBe(identity.value.accountId);
  expect(
    (await store.get<Identity>("auth_identities", identity.value.subjectHash))!.value.ready,
  ).toBe(true);
  expect(provider.newRecoveryKey).toBeDefined();
});
it("replaces the device and invalidates old sessions without changing account or role", async () => {
  const { service, provider, store } = setup();
  const first = await service.challenge({ kind: "google", publicKey: key() });
  const original = await service.google({ challengeId: first.id, idToken: "token" });
  const nextKey = key();
  const second = await service.challenge({ kind: "google", publicKey: nextKey });
  const replaced = await service.google({ challengeId: second.id, idToken: "token" });
  expect(replaced.profile.accountId).toBe(original.profile.accountId);
  expect(replaced.profile.sessionVersion).toBe(1);
  expect(provider.replaceDevice).toHaveBeenCalledTimes(1);
  expect(
    (await store.get<Identity>("auth_identities", subjectHash("subject-1")))!.value.devicePublicKey,
  ).toBe(nextKey);
  await expect(service.google({ challengeId: second.id, idToken: "token" })).rejects.toMatchObject({
    code: "E_SESSION",
  });
});
it("uses an invite for warehouse signup without accepting it, then allows explicit acceptance", async () => {
  const { service, store, chain } = setup();
  chain.view = vi.fn().mockResolvedValue({ limit: "1000" });
  const invites = new Invites(store, chain, "http://localhost:3001");
  const { invite } = await invites.create(profile(), {
    type: "warehouse",
    name: "Sample",
    phone: "+12075550142",
    address: "9 Sample Road",
  });
  const challenge = await service.challenge({
    kind: "google",
    publicKey: key(),
    inviteCode: invite.code,
  });
  const login = await service.google({ challengeId: challenge.id, idToken: "token" });
  expect(login.profile.role).toBe("warehouse");
  expect((await invites.read(invite.code)).state).toBe("open");
  await invites.accept(
    login.profile,
    invite.code,
    await service.subjectFor(login.profile.accountId),
  );
  expect((await invites.read(invite.code)).state).toBe("used");
});
it("binds encrypted keys to identity and rejects role/account profile edits", async () => {
  const { recovery, service, store } = setup();
  const sealed = recovery.seal("private-value", "subject-a");
  expect(() => recovery.open(sealed, "subject-b")).toThrow();
  expect(() =>
    recovery.open({ ...sealed, tag: Buffer.alloc(16).toString("base64") }, "subject-a"),
  ).toThrow();
  expect(() => parse(profileUpdate, { role: "admin" })).toThrow();
  const p = profile();
  await store.insert("profiles", p.accountId, p);
  await expect(service.updateProfile(p.accountId, { truckPlate: "NWF-204" })).rejects.toMatchObject(
    { code: "E_ACCESS" },
  );
});
