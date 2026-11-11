import { randomBytes, randomUUID, createHash } from "node:crypto";
import type {
  ChallengeRequest,
  ChallengeResponse,
  WalletLogin,
  GoogleLogin,
  Profile,
  ProfileUpdate,
} from "@waybil/shared";
import type { Store } from "../../types/db";
import type { Chain } from "../../lib/near";
import type { Leases } from "../../lib/leases";
import type { Sessions } from "../../lib/session";
import { RecoveryKeys, type SealedKey } from "../../lib/recovery";
import { allowed, ApiException, requireValue } from "../../lib/errors";
import type { Env } from "../../config/env";
import type { Invites } from "../invites/invites.service";
import type { LoginProvider } from "./auth.ports";

interface Challenge extends ChallengeResponse {
  request: ChallengeRequest;
  consumed: boolean;
}
export interface Identity {
  subjectHash: string;
  accountId: string;
  recovery: SealedKey;
  devicePublicKey: string;
  role: "driver" | "warehouse";
  ready: boolean;
  pendingKey: string | null;
  provisioningDay?: string;
}
export const subjectHash = (sub: string) => createHash("sha256").update(sub).digest("hex");
export class AuthService {
  constructor(
    private store: Store,
    private chain: Chain,
    private provider: LoginProvider,
    private sessions: Sessions,
    private leases: Leases,
    private invites: Invites,
    private env: Env,
    private recovery: RecoveryKeys,
    private now = () => Date.now(),
  ) {}
  async challenge(input: ChallengeRequest): Promise<ChallengeResponse> {
    if (input.kind === "google") this.provider.validPublicKey(input.publicKey);
    const value: Challenge = {
      id: randomUUID(),
      nonce: randomBytes(32).toString("base64"),
      message: "Sign in to Waybil.",
      recipient: new URL(this.env.APP_URL).host,
      callbackUrl: new URL("/start", this.env.APP_URL).toString(),
      expiresAt: new Date(this.now() + 300000).toISOString(),
      request: input,
      consumed: false,
    };
    await this.store.insert("auth_challenges", value.id, value);
    return this.publicChallenge(value);
  }
  async wallet(input: WalletLogin) {
    const row = await this.loadChallenge(input.challengeId, "wallet");
    const attempt = row.value.request;
    if (attempt.kind !== "wallet") throw new ApiException(401, "E_SESSION");
    allowed(attempt.accountId === input.accountId && row.value.nonce === input.nonce);
    await this.provider.verifyWallet(
      input.accountId,
      input.publicKey,
      input.signature,
      this.publicChallenge(row.value),
    );
    await this.store.replace("auth_challenges", input.challengeId, row.version, {
      ...row.value,
      consumed: true,
    });
    return this.leases.run(`account:${input.accountId}`, async () => {
      const existing = await this.store.get<Profile>("profiles", input.accountId);
      const isTeam = await this.chain.view<boolean>("is_member", { account_id: input.accountId });
      if (existing) {
        allowed(existing.value.authMethod === "wallet");
        if (existing.value.role === "admin") allowed(isTeam);
        return this.sessions.issue(existing.value);
      }
      const role = isTeam ? "admin" : attempt.role;
      if (!role) throw new ApiException(400, "E_ROLE_REQUIRED", "Choose your role to continue.");
      const profile: Profile = {
        accountId: input.accountId,
        role,
        authMethod: "wallet",
        name: "",
        phone: "",
        email: "",
        truckPlate: null,
        sessionVersion: 0,
      };
      await this.store.insert("profiles", input.accountId, profile);
      return this.sessions.issue(profile);
    });
  }
  async google(input: GoogleLogin) {
    const challenge = await this.loadChallenge(input.challengeId, "google");
    const attempt = challenge.value.request;
    if (attempt.kind !== "google") throw new ApiException(401, "E_SESSION");
    const google = await this.provider.verifyGoogle(input.idToken, challenge.value.nonce);
    const hash = subjectHash(google.sub);
    await this.store.replace("auth_challenges", input.challengeId, challenge.version, {
      ...challenge.value,
      consumed: true,
    });
    return this.leases.run(`identity:${hash}`, async () => {
      let row = await this.store.get<Identity>("auth_identities", hash);
      let inviteRole: "driver" | "warehouse" = "driver";
      if (attempt.inviteCode)
        inviteRole = (await this.invites.reserve(attempt.inviteCode, hash, row?.value.accountId))
          .type;
      if (!row) {
        const key = this.provider.newRecoveryKey();
        const accountId = this.accountName(google.name, hash);
        const value: Identity = {
          subjectHash: hash,
          accountId,
          recovery: this.recovery.seal(key.secret, hash),
          devicePublicKey: attempt.publicKey,
          role: inviteRole,
          ready: false,
          pendingKey: null,
        };
        row = await this.store.insert("auth_identities", hash, value);
      }
      if (attempt.inviteCode) allowed(row.value.role === inviteRole);
      let id = row.value;
      const recoverySecret = this.recovery.open(id.recovery, hash);
      if (!id.ready && !id.pendingKey)
        await this.leases.run("signup:budget", async () => {
          const day = new Date(this.now()).toISOString().slice(0, 10);
          if (row!.value.provisioningDay !== day) {
            const reserved = await this.store.list<Identity>("auth_identities", {
              provisioningDay: day,
            });
            if (reserved.length >= this.env.GOOGLE_SIGNUP_DAILY_LIMIT)
              throw new ApiException(
                503,
                "E_SIGNUP_CAP",
                "Account setup is busy today. Please try again tomorrow.",
              );
            row = await this.store.replace("auth_identities", hash, row!.version, {
              ...row!.value,
              provisioningDay: day,
            });
          }
          await this.provider.ensureAccount(
            id.accountId,
            id.devicePublicKey,
            recoverySecret,
            id.role,
          );
        });
      let profileRow = await this.store.get<Profile>("profiles", id.accountId);
      if (!profileRow) {
        profileRow = await this.store.insert("profiles", id.accountId, {
          accountId: id.accountId,
          role: id.role,
          authMethod: "google",
          name: google.name,
          email: google.email,
          phone: "",
          truckPlate: null,
          sessionVersion: 0,
        } satisfies Profile);
      }
      allowed(profileRow.value.authMethod === "google" && profileRow.value.role === id.role);
      if (id.pendingKey && id.pendingKey !== attempt.publicKey) {
        await this.provider.replaceDevice(
          id.accountId,
          id.devicePublicKey,
          id.pendingKey,
          recoverySecret,
          id.role,
        );
        row = await this.store.replace("auth_identities", hash, row.version, {
          ...row.value,
          devicePublicKey: id.pendingKey,
          pendingKey: null,
        });
        id = row.value;
      }
      if (id.devicePublicKey !== attempt.publicKey || id.pendingKey) {
        if (!id.pendingKey) {
          profileRow = await this.store.replace("profiles", id.accountId, profileRow.version, {
            ...profileRow.value,
            sessionVersion: profileRow.value.sessionVersion + 1,
          });
          row = await this.store.replace("auth_identities", hash, row.version, {
            ...row.value,
            pendingKey: attempt.publicKey,
          });
        }
        await this.provider.replaceDevice(
          id.accountId,
          id.devicePublicKey,
          attempt.publicKey,
          recoverySecret,
          id.role,
        );
        row = await this.store.replace("auth_identities", hash, row.version, {
          ...row.value,
          devicePublicKey: attempt.publicKey,
          pendingKey: null,
        });
      }
      await this.provider.registerToken(id.accountId);
      if (!row.value.ready)
        await this.store.replace("auth_identities", hash, row.version, {
          ...row.value,
          ready: true,
        });
      return this.sessions.issue(profileRow.value);
    });
  }
  async logout(accountId: string) {
    return this.leases.run(`account:${accountId}`, async () => {
      const row = requireValue(await this.store.get<Profile>("profiles", accountId));
      await this.store.replace("profiles", accountId, row.version, {
        ...row.value,
        sessionVersion: row.value.sessionVersion + 1,
      });
      return { revoked: true };
    });
  }
  async updateProfile(accountId: string, input: ProfileUpdate) {
    return this.leases.run(`account:${accountId}`, async () => {
      const row = requireValue(await this.store.get<Profile>("profiles", accountId));
      allowed(input.truckPlate === undefined || row.value.role === "driver");
      return (
        await this.store.replace("profiles", accountId, row.version, { ...row.value, ...input })
      ).value;
    });
  }
  async subjectFor(accountId: string): Promise<string> {
    const rows = await this.store.list<Identity>("auth_identities", { accountId });
    const identity = requireValue(rows[0]);
    allowed(identity.value.ready);
    return identity.value.subjectHash;
  }
  private async loadChallenge(id: string, kind: string) {
    const row = await this.store.get<Challenge>("auth_challenges", id);
    if (
      !row ||
      row.value.consumed ||
      row.value.request.kind !== kind ||
      Date.parse(row.value.expiresAt) <= this.now()
    )
      throw new ApiException(401, "E_SESSION");
    return row;
  }
  private publicChallenge(value: Challenge): ChallengeResponse {
    return {
      id: value.id,
      nonce: value.nonce,
      message: value.message,
      recipient: value.recipient,
      callbackUrl: value.callbackUrl,
      expiresAt: value.expiresAt,
    };
  }
  private accountName(name: string, hash: string) {
    const names = JSON.parse(this.env.GOOGLE_ACCOUNT_NAMES) as Record<string, unknown>;
    const selected = names[hash];
    const slug =
      typeof selected === "string"
        ? selected
        : `${
            name
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .slice(0, 20) || "user"
          }-${hash.slice(0, 12)}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 40)
      throw new ApiException(
        503,
        "E_ACCOUNT_CONFIG",
        "Account setup is unavailable. Please try again later.",
      );
    return `${slug}.${this.env.USERS_ACCOUNT}`;
  }
}
