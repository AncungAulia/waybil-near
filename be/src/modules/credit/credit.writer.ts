import { createHash } from "node:crypto";
import {
  actions,
  baseEncode,
  decodeSignedTransaction,
  encodeTransaction,
  type JsonRpcProvider,
} from "near-api-js";
import { UnknownTransactionError, UnknownTransactionOrReceiptError } from "near-api-js/rpc-errors";
import type { Env } from "../../config/env";
import { sdkAccount, rpcCall } from "../../lib/near-sdk";

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
    return rpcCall(async () => {
      const signed = await sdkAccount(
        this.provider,
        this.env.ASSISTANT_ACCOUNT,
        this.env.ASSISTANT_PRIVATE_KEY,
      ).createSignedTransaction({
        receiverId: this.env.WAYBIL_CONTRACT,
        actions: [actions.functionCall(method, { shipper, limit }, 100000000000000n, 0n)],
      });
      return {
        method,
        limit,
        bytes: Buffer.from(encodeTransaction(signed)).toString("base64"),
        txHash: baseEncode(
          createHash("sha256").update(encodeTransaction(signed.transaction)).digest(),
        ),
      };
    });
  }
  async check(prepared: PreparedCredit): Promise<CreditReceipt> {
    return rpcCall(async () => {
      let result: Awaited<ReturnType<JsonRpcProvider["viewTransactionStatus"]>>;
      try {
        result = await this.provider.viewTransactionStatus({
          txHash: prepared.txHash,
          accountId: this.env.ASSISTANT_ACCOUNT,
          waitUntil: "FINAL",
        });
      } catch (error) {
        if (
          !(error instanceof UnknownTransactionError) &&
          !(error instanceof UnknownTransactionOrReceiptError)
        )
          throw error;
        result = await this.provider.sendTransactionUntil(
          decodeSignedTransaction(Buffer.from(prepared.bytes, "base64")),
          "FINAL",
        );
      }
      if (result.final_execution_status !== "FINAL") return { status: "pending", proposalId: null };
      if (
        typeof result.status !== "object" ||
        !("SuccessValue" in result.status) ||
        result.receipts_outcome.some(
          (r) => typeof r.outcome.status === "object" && "Failure" in r.outcome.status,
        )
      )
        return { status: "failed", proposalId: null };
      let proposalId: number | null = null;
      if (prepared.method === "assistant_propose") {
        const value: unknown = JSON.parse(
          Buffer.from(result.status.SuccessValue, "base64").toString(),
        );
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
          throw new Error();
        proposalId = value;
      }
      return { status: "confirmed", proposalId };
    });
  }
}
