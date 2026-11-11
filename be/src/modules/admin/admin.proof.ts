import { outcome } from "../../lib/near-tx";
import type { JsonRpcProvider } from "near-api-js";
import { z } from "zod";
import { allowed, ApiException } from "../../lib/errors";
import { rpcCall } from "../../lib/near-sdk";
import type { PauseProof } from "./admin.service";
export class NearPauseProof implements PauseProof {
  constructor(
    private provider: JsonRpcProvider,
    private contract: string,
  ) {}
  async assert(actor: string, shipperId: string, reason: string, txHash: string) {
    const receipt = await rpcCall(() =>
      this.provider.viewTransactionStatus({ txHash, accountId: actor, waitUntil: "FINAL" }),
    );
    allowed(
      receipt.final_execution_status === "FINAL" &&
        receipt.transaction.hash === txHash &&
        receipt.transaction.signer_id === actor &&
        receipt.transaction.receiver_id === this.contract,
    );
    allowed(outcome(receipt) === "confirmed");
    const action = receipt.transaction.actions[0];
    allowed(
      receipt.transaction.actions.length === 1 &&
        action &&
        typeof action === "object" &&
        "FunctionCall" in action &&
        action.FunctionCall.method_name === "pause_shipper",
    );
    let args: unknown;
    try {
      args = JSON.parse(Buffer.from(action.FunctionCall.args, "base64").toString());
    } catch {
      throw new ApiException(400, "E_RECEIPT", "This approval record could not be read.");
    }
    const checked = z.object({ shipper: z.string(), reason: z.string() }).strict().safeParse(args);
    allowed(
      checked.success && checked.data.shipper === shipperId && checked.data.reason === reason,
    );
  }
}
