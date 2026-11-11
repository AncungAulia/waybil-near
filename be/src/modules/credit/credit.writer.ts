import { actions, type JsonRpcProvider } from "near-api-js";
import { signTx, statusOrBroadcast, outcome } from "../../lib/near-tx";
import type { Env } from "../../config/env";
import { sdkAccount, rpcCall, DefinitiveTransactionError } from "../../lib/near-sdk";

export interface PreparedCredit {
  txHash: string;
  bytes: string;
  method: "assistant_set_limit" | "assistant_propose";
  limit: string;
}
export interface CreditReceipt {
  status: "pending" | "confirmed" | "failed";
  proposalId: number | null;
}
export interface CreditWriter {
  time(): Promise<bigint>;
  prepare(
    shipper: string,
    limit: string,
    method: PreparedCredit["method"],
  ): Promise<PreparedCredit>;
  check(prepared: PreparedCredit): Promise<CreditReceipt>;
}
export class NearCreditWriter implements CreditWriter {
  constructor(
    private env: Env,
    private provider: JsonRpcProvider,
  ) {}
  async time() {
    return rpcCall(async () =>
      BigInt((await this.provider.viewBlock({ finality: "final" })).header.timestamp_nanosec),
    );
  }
  async prepare(shipper: string, limit: string, method: PreparedCredit["method"]) {
    const prepared = await signTx(
      sdkAccount(this.provider, this.env.ASSISTANT_ACCOUNT, this.env.ASSISTANT_PRIVATE_KEY),
      this.env.WAYBIL_CONTRACT,
      [actions.functionCall(method, { shipper, limit }, 100000000000000n, 0n)],
    );
    return { ...prepared, method, limit };
  }
  async check(prepared: PreparedCredit): Promise<CreditReceipt> {
    const result = await statusOrBroadcast(this.provider, this.env.ASSISTANT_ACCOUNT, prepared);
    const status = outcome(result);
    if (status !== "confirmed") return { status, proposalId: null };
    let proposalId: number | null = null;
    if (prepared.method === "assistant_propose") {
      try {
        if (typeof result.status !== "object" || !("SuccessValue" in result.status))
          throw new Error();
        const value: unknown = JSON.parse(
          Buffer.from(result.status.SuccessValue, "base64").toString(),
        );
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
          throw new Error();
        proposalId = value;
      } catch {
        throw new DefinitiveTransactionError();
      }
    }
    return { status, proposalId };
  }
}
