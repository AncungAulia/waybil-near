import type { Env } from "../config/env";
import { ApiException } from "./errors";

export interface Chain {
  view<T>(method: string, args?: object): Promise<T>;
}
export class NearViews implements Chain {
  constructor(protected env: Env) {}
  async view<T>(method: string, args: object = {}): Promise<T> {
    try {
      const response = await fetch(this.env.NEAR_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "waybil",
          method: "query",
          params: {
            request_type: "call_function",
            finality: "final",
            account_id: this.env.WAYBIL_CONTRACT,
            method_name: method,
            args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
          },
        }),
      });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { result?: { result: number[] }; error?: unknown };
      if (payload.error || !payload.result) throw new Error();
      return JSON.parse(Buffer.from(payload.result.result).toString()) as T;
    } catch {
      throw new ApiException(
        503,
        "E_RPC",
        "The delivery record could not be reached. Please try again.",
      );
    }
  }
}
