import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, type KeyPairString } from "near-api-js";
import type { Env } from "../config/env";
import { ApiException, unavailable } from "./errors";

export function sdkProvider(env: Env) {
  return new JsonRpcProvider({ url: env.NEAR_RPC_URL }, { retries: 0 });
}
export function sdkAccount(
  provider: JsonRpcProvider,
  accountId: string,
  secret: string | undefined,
) {
  if (!secret) unavailable();
  return new Account(
    accountId,
    provider,
    new KeyPairSigner(KeyPair.fromString(secret as KeyPairString)),
  );
}
export async function rpcCall<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ApiException) throw error;
    throw new ApiException(
      503,
      "E_RPC",
      "The delivery record could not be reached. Please try again.",
    );
  }
}
