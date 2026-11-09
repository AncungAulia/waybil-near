import { createHash } from "node:crypto";
import {
  actions,
  baseEncode,
  decodeSignedTransaction,
  encodeTransaction,
  type JsonRpcProvider,
  type SignedDelegate,
} from "near-api-js";
import { UnknownTransactionError, UnknownTransactionOrReceiptError } from "near-api-js/rpc-errors";
import type { Env } from "../../config/env";
import type { RelayResponse } from "@waybil/shared";
import { sdkAccount, rpcCall } from "../../lib/near-sdk";
type RpcTransactionResponse = Awaited<ReturnType<JsonRpcProvider["viewTransactionStatus"]>>;

export interface RelayProvider {
  access(
    signed: SignedDelegate,
  ): Promise<{ nonce: bigint; height: bigint; receiver: string; methods: string[] }>;
  prepare(signed: SignedDelegate): Promise<{ txHash: string; bytes: string }>;
  broadcast(bytes: string): Promise<RelayResponse["status"]>;
  status(txHash: string): Promise<RelayResponse["status"] | null>;
}
export class NearRelayer implements RelayProvider {
  constructor(
    private env: Env,
    private provider: JsonRpcProvider,
  ) {}
  async access(signed: SignedDelegate) {
    return rpcCall(async () => {
      const key = await this.provider.viewAccessKey({
        accountId: signed.delegateAction.senderId,
        publicKey: signed.delegateAction.publicKey,
        finalityQuery: { finality: "final" },
      });
      const rule =
        typeof key.permission === "object" && "FunctionCall" in key.permission
          ? key.permission.FunctionCall
          : null;
      return {
        nonce: key.nonce,
        height: BigInt(key.block_height),
        receiver: rule?.receiver_id ?? "",
        methods: rule?.method_names ?? [],
      };
    });
  }
  async prepare(signed: SignedDelegate) {
    return rpcCall(async () => {
      const outer = await sdkAccount(
        this.provider,
        this.env.RELAYER_ACCOUNT,
        this.env.RELAYER_PRIVATE_KEY,
      ).createSignedTransaction({
        receiverId: signed.delegateAction.senderId,
        actions: [actions.signedDelegate(signed)],
      });
      return {
        txHash: baseEncode(
          createHash("sha256").update(encodeTransaction(outer.transaction)).digest(),
        ),
        bytes: Buffer.from(encodeTransaction(outer)).toString("base64"),
      };
    });
  }
  async broadcast(bytes: string) {
    return rpcCall(async () =>
      this.result(
        await this.provider.sendTransactionUntil(
          decodeSignedTransaction(Buffer.from(bytes, "base64")),
          "FINAL",
        ),
      ),
    );
  }
  async status(txHash: string) {
    try {
      return this.result(
        await this.provider.viewTransactionStatus({
          txHash,
          accountId: this.env.RELAYER_ACCOUNT,
          waitUntil: "FINAL",
        }),
      );
    } catch (error) {
      if (
        error instanceof UnknownTransactionError ||
        error instanceof UnknownTransactionOrReceiptError
      )
        return null;
      return rpcCall(async () => {
        throw error;
      });
    }
  }
  private result(result: RpcTransactionResponse): RelayResponse["status"] {
    if (result.final_execution_status !== "FINAL") return "pending";
    if (
      (typeof result.status === "object" && "Failure" in result.status) ||
      result.receipts_outcome.some(
        (r) => typeof r.outcome.status === "object" && "Failure" in r.outcome.status,
      )
    )
      return "failed";
    return typeof result.status === "object" && "SuccessValue" in result.status
      ? "confirmed"
      : "pending";
  }
}
