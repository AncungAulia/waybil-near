import { createHash } from "node:crypto";
import {
  baseEncode,
  decodeSignedTransaction,
  encodeTransaction,
  type Account,
  type Action,
  type JsonRpcProvider,
} from "near-api-js";
import { UnknownTransactionError, UnknownTransactionOrReceiptError } from "near-api-js/rpc-errors";
import { rpcCall } from "./near-sdk";
export type TransactionReceipt = Awaited<ReturnType<JsonRpcProvider["viewTransactionStatus"]>>;
export async function signTx(account: Account, receiverId: string, actions: Action[]) {
  return rpcCall(async () => {
    const signed = await account.createSignedTransaction({ receiverId, actions });
    return {
      txHash: baseEncode(
        createHash("sha256").update(encodeTransaction(signed.transaction)).digest(),
      ),
      bytes: Buffer.from(encodeTransaction(signed)).toString("base64"),
    };
  });
}
export async function txStatus(provider: JsonRpcProvider, accountId: string, txHash: string) {
  return rpcCall(async () => {
    try {
      return await provider.viewTransactionStatus({ txHash, accountId, waitUntil: "FINAL" });
    } catch (error) {
      if (
        error instanceof UnknownTransactionError ||
        error instanceof UnknownTransactionOrReceiptError
      )
        return null;
      throw error;
    }
  });
}
export function broadcastTx(provider: JsonRpcProvider, bytes: string) {
  return rpcCall(() =>
    provider.sendTransactionUntil(decodeSignedTransaction(Buffer.from(bytes, "base64")), "FINAL"),
  );
}
export async function statusOrBroadcast(
  provider: JsonRpcProvider,
  accountId: string,
  prepared: { txHash: string; bytes: string },
) {
  return (
    (await txStatus(provider, accountId, prepared.txHash)) ??
    (await broadcastTx(provider, prepared.bytes))
  );
}
export function outcome(result: TransactionReceipt): "pending" | "confirmed" | "failed" {
  if (result.final_execution_status !== "FINAL") return "pending";
  if (
    (typeof result.status === "object" && "Failure" in result.status) ||
    result.receipts_outcome.some(
      (r) => typeof r.outcome.status === "object" && "Failure" in r.outcome.status,
    )
  )
    return "failed";
  if (typeof result.status !== "object" || !("SuccessValue" in result.status)) return "pending";
  return Buffer.from(result.status.SuccessValue, "base64").toString() === "false"
    ? "failed"
    : "confirmed";
}
