import { actions, type JsonRpcProvider, type SignedDelegate } from "near-api-js";
import { signTx, txStatus, broadcastTx, outcome } from "../../lib/near-tx";
import type { Env } from "../../config/env";
import type { RelayResponse } from "@waybil/shared";
import { sdkAccount, rpcCall } from "../../lib/near-sdk";

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
    return signTx(
      sdkAccount(this.provider, this.env.RELAYER_ACCOUNT, this.env.RELAYER_PRIVATE_KEY),
      signed.delegateAction.senderId,
      [actions.signedDelegate(signed)],
    );
  }
  async broadcast(bytes: string) {
    return outcome(await broadcastTx(this.provider, bytes));
  }
  async status(txHash: string) {
    const result = await txStatus(this.provider, this.env.RELAYER_ACCOUNT, txHash);
    return result ? outcome(result) : null;
  }
}
