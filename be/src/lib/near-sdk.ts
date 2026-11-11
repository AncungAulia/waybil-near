import { AsyncLocalStorage } from "node:async_hooks";
import { InvalidTransactionError, TransactionExecutionError } from "near-api-js/rpc-errors";
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, type KeyPairString } from "near-api-js";
import { logError } from "./logger";
import type { Env } from "../config/env";
import { ApiException, unavailable } from "./errors";

const deadlines = new AsyncLocalStorage<AbortSignal>();
export class DefinitiveTransactionError extends ApiException {
  constructor() {
    super(503, "E_TX_REJECTED", "This request was not recorded. Please try again.");
  }
}
export function sdkProvider(env: Env) {
  const provider = new JsonRpcProvider({ url: env.NEAR_RPC_URL }, { retries: 1 });
  return new Proxy(provider, {
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        if (deadlines.getStore()?.aborted)
          throw new ApiException(
            503,
            "E_RPC_TIMEOUT",
            "The delivery record took too long. Please try again.",
          );
        return Reflect.apply(value, receiver, args);
      };
    },
  });
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
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        deadlines.run(
          deadlines.getStore()
            ? AbortSignal.any([deadlines.getStore()!, controller.signal])
            : controller.signal,
          work,
        ),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(
              new ApiException(
                503,
                "E_RPC_TIMEOUT",
                "The delivery record took too long. Please try again.",
              ),
            );
          }, 15000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    logError("near_rpc", error);
    if (error instanceof ApiException) throw error;
    if (error instanceof InvalidTransactionError || error instanceof TransactionExecutionError)
      throw new DefinitiveTransactionError();
    throw new ApiException(
      503,
      "E_RPC",
      "The delivery record could not be reached. Please try again.",
    );
  }
}
