import {
  Account,
  actions,
  KeyPair,
  KeyPairSigner,
  PublicKey,
  teraToGas,
  nearToYocto,
  type JsonRpcProvider,
  type KeyPairString,
} from "near-api-js";
import { verifyMessage } from "near-api-js/nep413";
import {
  AccessKeyDoesNotExistError,
  AccountDoesNotExistError,
  RpcError,
} from "near-api-js/rpc-errors";
import { OAuth2Client } from "google-auth-library";
import type { Env } from "../../config/env";
import type { ChallengeResponse } from "@waybil/shared";
import type { Leases } from "../../lib/leases";
import { logError } from "../../lib/logger";
import { allowed, ApiException, unavailable } from "../../lib/errors";
import { rpcCall, sdkAccount } from "../../lib/near-sdk";
import type { LoginProvider } from "./auth.ports";

export const deviceMethods = (role: "driver" | "warehouse") =>
  role === "driver" ? ["confirm_pickup"] : ["confirm_delivery"];
export class AuthProvider implements LoginProvider {
  constructor(
    private env: Env,
    private provider: JsonRpcProvider,
    private leases: Leases,
  ) {}
  validPublicKey(key: string) {
    try {
      if (PublicKey.fromString(key).keyType !== 0) throw new Error();
    } catch {
      throw new ApiException(400, "E_VALIDATION");
    }
  }
  async verifyWallet(
    accountId: string,
    publicKey: string,
    signature: string,
    challenge: ChallengeResponse,
  ) {
    try {
      await verifyMessage({
        signerAccountId: accountId,
        signerPublicKey: publicKey,
        signature: Buffer.from(signature, "base64"),
        provider: this.provider,
        payload: {
          nonce: Buffer.from(challenge.nonce, "base64"),
          message: challenge.message,
          recipient: challenge.recipient,
          callbackUrl: challenge.callbackUrl,
        },
      });
    } catch (error) {
      if (
        error instanceof RpcError &&
        !(error instanceof AccessKeyDoesNotExistError) &&
        !(error instanceof AccountDoesNotExistError)
      )
        throw new ApiException(
          503,
          "E_RPC",
          "Your account could not be reached. Please try again.",
        );
      throw new ApiException(401, "E_SESSION");
    }
  }
  async verifyGoogle(idToken: string, nonce: string) {
    const audience = this.env.GOOGLE_CLIENT_ID ?? unavailable();
    try {
      const ticket = await new OAuth2Client(String(audience)).verifyIdToken({
        idToken,
        audience: String(audience),
      });
      const payload = ticket.getPayload();
      if (
        !payload?.sub ||
        !payload.email ||
        !payload.email_verified ||
        (payload as { nonce?: string }).nonce !== nonce
      )
        throw new Error();
      return {
        sub: payload.sub,
        nonce,
        name: payload.given_name ?? payload.name ?? "",
        email: payload.email,
      };
    } catch {
      throw new ApiException(401, "E_SESSION");
    }
  }
  newRecoveryKey() {
    const key = KeyPair.fromRandom("ed25519");
    return { secret: key.toString(), publicKey: key.getPublicKey().toString() };
  }
  async ensureAccount(
    accountId: string,
    deviceKey: string,
    recoverySecret: string,
    role: "driver" | "warehouse",
  ) {
    const recoveryKey = KeyPair.fromString(recoverySecret as KeyPairString).getPublicKey();
    await rpcCall(async () => {
      let exists = true;
      try {
        await this.provider.viewAccount({ accountId });
      } catch (error) {
        if (error instanceof AccountDoesNotExistError) exists = false;
        else throw error;
      }
      if (!exists) {
        const parent = await this.provider.viewAccount({ accountId: this.env.USERS_ACCOUNT });
        const spendable =
          BigInt(parent.amount) - BigInt(parent.storage_usage) * 10000000000000000000n;
        if (spendable < nearToYocto("0.1"))
          logError("signup_parent_low_balance", new Error(), { code: "E_SIGNUP_FUNDS" });
        if (spendable < nearToYocto("0.01"))
          throw new ApiException(
            503,
            "E_SIGNUP_FUNDS",
            "Account setup is temporarily unavailable. Please try again later.",
          );
        await this.leases.run("signer:users", () =>
          this.parent().signAndSendTransaction({
            receiverId: accountId,
            actions: [
              actions.createAccount(),
              actions.transfer(nearToYocto("0.005")),
              actions.addFullAccessKey(recoveryKey),
              actions.addFunctionCallAccessKey(
                PublicKey.fromString(deviceKey),
                this.env.WAYBIL_CONTRACT,
                deviceMethods(role),
              ),
            ],
            waitUntil: "FINAL",
            retries: 0,
          }),
        );
      }
      const recovery = await this.provider.viewAccessKey({ accountId, publicKey: recoveryKey });
      allowed(recovery.permission === "FullAccess");
      await this.checkDevice(accountId, deviceKey, role);
    });
  }
  async replaceDevice(
    accountId: string,
    previous: string,
    next: string,
    recoverySecret: string,
    role: "driver" | "warehouse",
  ) {
    await rpcCall(async () => {
      const keys = await this.provider.viewAccessKeyList({ accountId });
      const hasNext = keys.keys.some((k) => k.public_key === next);
      const hasPrevious = keys.keys.some((k) => k.public_key === previous);
      if (hasNext) {
        allowed(!hasPrevious || previous === next);
        await this.checkDevice(accountId, next, role);
        return;
      }
      allowed(hasPrevious);
      const account = new Account(
        accountId,
        this.provider,
        new KeyPairSigner(KeyPair.fromString(recoverySecret as KeyPairString)),
      );
      await account.signAndSendTransaction({
        receiverId: accountId,
        actions: [
          actions.addFunctionCallAccessKey(
            PublicKey.fromString(next),
            this.env.WAYBIL_CONTRACT,
            deviceMethods(role),
          ),
          actions.deleteKey(PublicKey.fromString(previous)),
        ],
        waitUntil: "FINAL",
        retries: 0,
      });
      await this.checkDevice(accountId, next, role);
    });
  }
  async registerToken(accountId: string) {
    await this.leases.run("signer:users", () =>
      rpcCall(async () => {
        const existing = await this.provider.callFunction({
          contractId: this.env.USDC_CONTRACT,
          method: "storage_balance_of",
          args: { account_id: accountId },
        });
        if (existing) return;
        const bounds = (await this.provider.callFunction({
          contractId: this.env.USDC_CONTRACT,
          method: "storage_balance_bounds",
          args: {},
        })) as { min: string };
        await this.parent().signAndSendTransaction({
          receiverId: this.env.USDC_CONTRACT,
          actions: [
            actions.functionCall(
              "storage_deposit",
              { account_id: accountId, registration_only: true },
              teraToGas("30"),
              BigInt(bounds.min),
            ),
          ],
          waitUntil: "FINAL",
          retries: 0,
        });
      }),
    );
  }
  private parent() {
    return sdkAccount(this.provider, this.env.USERS_ACCOUNT, this.env.USERS_PRIVATE_KEY);
  }
  private async checkDevice(accountId: string, publicKey: string, role: "driver" | "warehouse") {
    const { permission } = await this.provider.viewAccessKey({ accountId, publicKey });
    allowed(typeof permission === "object" && "FunctionCall" in permission);
    const rule = permission.FunctionCall;
    allowed(
      rule.receiver_id === this.env.WAYBIL_CONTRACT &&
        rule.method_names.length === 1 &&
        rule.method_names[0] === deviceMethods(role)[0],
    );
  }
}
