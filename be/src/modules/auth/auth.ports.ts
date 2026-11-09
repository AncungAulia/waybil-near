import type { ChallengeResponse } from "@waybil/shared";

export interface GoogleIdentity {
  sub: string;
  nonce: string;
  name: string;
  email: string;
}
export interface LoginProvider {
  verifyWallet(
    accountId: string,
    publicKey: string,
    signature: string,
    challenge: ChallengeResponse,
  ): Promise<void>;
  verifyGoogle(idToken: string, nonce: string): Promise<GoogleIdentity>;
  newRecoveryKey(): { secret: string; publicKey: string };
  ensureAccount(
    accountId: string,
    deviceKey: string,
    recoverySecret: string,
    role: "driver" | "warehouse",
  ): Promise<void>;
  replaceDevice(
    accountId: string,
    previous: string,
    next: string,
    recoverySecret: string,
    role: "driver" | "warehouse",
  ): Promise<void>;
  registerToken(accountId: string): Promise<void>;
  validPublicKey(key: string): void;
}
