/*
 * The contract's own records of pool events come from the NearBlocks indexer. A plain RPC
 * node can't search past events by contract, so the indexer lists the contract's receipts and
 * then each transaction's receipt tree, which carries the logs.
 */

export interface ContractReceipt {
  receiptId: string;
  txHash: string;
  /** Function names the receipt called, for example "ft_on_transfer". */
  methods: string[];
}
export interface ReceiptLog {
  receiptId: string;
  executor: string;
  /** Block time in nanoseconds. */
  at: string;
  logs: string[];
}
export interface EventSource {
  /** One page of the contract's receipts, newest first. */
  receipts(cursor?: string): Promise<{ receipts: ContractReceipt[]; next: string | null }>;
  /** Every receipt in a transaction, with its logs. */
  logs(txHash: string): Promise<ReceiptLog[]>;
}

interface NearBlocksReceipt {
  receipt_id: string;
  transaction_hash: string;
  actions: { action: string; method: string | null }[];
}
interface NearBlocksNode {
  receipt_id: string;
  block: { block_timestamp: string };
  outcome: { executor_account_id: string; logs: string[] };
  receipts?: NearBlocksNode[];
}

export class NearBlocksEvents implements EventSource {
  constructor(
    private baseUrl: string,
    private contract: string,
    private apiKey?: string,
  ) {}
  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok)
      throw Object.assign(new Error("The indexer did not answer."), {
        code: `INDEXER_${res.status}`,
      });
    return (await res.json()) as T;
  }
  async receipts(cursor?: string) {
    const page = await this.get<{ data: NearBlocksReceipt[]; meta?: { next_page?: string } }>(
      `/v3/accounts/${this.contract}/receipts?limit=100${cursor ? `&next=${encodeURIComponent(cursor)}` : ""}`,
    );
    return {
      receipts: page.data.map((r) => ({
        receiptId: r.receipt_id,
        txHash: r.transaction_hash,
        methods: r.actions.flatMap((a) => (a.method ? [a.method] : [])),
      })),
      next: page.meta?.next_page ?? null,
    };
  }
  async logs(txHash: string) {
    const { data } = await this.get<{ data: NearBlocksNode | null }>(
      `/v3/txns/${encodeURIComponent(txHash)}/receipts`,
    );
    const out: ReceiptLog[] = [];
    const walk = (node: NearBlocksNode) => {
      out.push({
        receiptId: node.receipt_id,
        executor: node.outcome.executor_account_id,
        at: node.block.block_timestamp,
        logs: node.outcome.logs ?? [],
      });
      node.receipts?.forEach(walk);
    };
    if (data) walk(data);
    return out;
  }
}
