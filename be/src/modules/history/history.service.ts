import type { PoolHistoryItem, PoolHistoryResponse, Principal } from "@waybil/shared";
import { allowed, unavailable } from "../../lib/errors";
import { logError } from "../../lib/logger";
import type { EventSource } from "./history.source";

/*
 * The receipts that can carry a pool event. Deposits and repaid bills arrive as
 * ft_on_transfer, and a repaid bill or a team decision executed by `vote` can pay the queue.
 */
const POOL_METHODS = new Set([
  "ft_on_transfer",
  "withdraw",
  "process_queue",
  "on_withdraw_sent",
  "vote",
]);
const EVENTS = new Set<PoolHistoryItem["kind"]>([
  "withdraw_paid",
  "withdraw_queued",
  "withdraw_failed",
]);
/*
 * The free indexer plan allows only a few calls a minute, so one scan runs at most once a
 * minute, page loads in between share it, and each scan opens at most TX_BUDGET transactions.
 * The rest wait for the next scan. Set NEARBLOCKS_API_KEY for a higher limit.
 */
const FRESH_MS = 60000;
const TX_BUDGET = 4;
/* A first scan lists the whole contract history. Later scans stop at the first known receipt. */
const MAX_PAGES = 50;

interface PoolEvent extends PoolHistoryItem {
  investor: string;
  key: string;
}

/**
 * Pool history for investors, from the contract's NEP-297 events (`deposited`,
 * `withdraw_paid`, `withdraw_queued`, `withdraw_failed`). The events live on chain, so this
 * keeps them in memory and only fetches what is new. A restart reads them again.
 */
export class PoolHistory {
  private seen = new Set<string>();
  /* Transactions that may hold pool events and are not read yet, newest first. */
  private pending: string[] = [];
  private done = new Set<string>();
  private events = new Map<string, PoolEvent>();
  private loadedAt = 0;
  private running: Promise<void> | null = null;

  constructor(
    private source: EventSource,
    private contract: string,
    private now = () => Date.now(),
  ) {}

  async history(actor: Principal): Promise<PoolHistoryResponse> {
    allowed(actor.role === "investor");
    try {
      await this.refresh();
    } catch (error) {
      logError("pool_history", error);
      /* Serve what is known. With nothing loaded yet there is nothing honest to show. */
      if (!this.loadedAt) unavailable();
    }
    const items = [...this.events.values()]
      .filter((e) => e.investor === actor.accountId)
      .sort((a, b) => b.at.localeCompare(a.at) || b.key.localeCompare(a.key))
      .map(({ kind, amount, shares, txHash, at }) => ({ kind, amount, shares, txHash, at }));
    return { items };
  }

  private refresh() {
    if (this.loadedAt && this.now() - this.loadedAt < FRESH_MS) return Promise.resolve();
    this.running ??= this.scan().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async scan() {
    const fresh: string[] = [];
    const found: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const { receipts, next } = await this.source.receipts(cursor);
      let reachedKnown = false;
      for (const r of receipts) {
        if (this.seen.has(r.receiptId)) {
          reachedKnown = true;
          break;
        }
        fresh.push(r.receiptId);
        if (r.methods.some((m) => POOL_METHODS.has(m))) found.push(r.txHash);
      }
      if (reachedKnown || !next) break;
      cursor = next;
    }
    /* The listing is complete, so these receipts are seen. Their transactions wait in pending. */
    fresh.forEach((id) => this.seen.add(id));
    /*
     * New transactions go to the front, so a deposit or withdrawal made a moment ago is read
     * on the next scan instead of waiting behind the older history still being filled in.
     */
    const newer = found.filter(
      (txHash) => !this.done.has(txHash) && !this.pending.includes(txHash),
    );
    this.pending = [...newer, ...this.pending];
    this.loadedAt = this.now();

    for (let read = 0; read < TX_BUDGET && this.pending.length; read++) {
      const txHash = this.pending[0]!;
      let receipts;
      try {
        receipts = await this.source.logs(txHash);
      } catch (error) {
        /* Over the limit or down. Keep the rest for the next scan. */
        logError("pool_history_tx", error, { txHash });
        return;
      }
      for (const receipt of receipts) {
        if (receipt.executor !== this.contract) continue;
        receipt.logs.forEach((line, index) => {
          const event = parse(line);
          if (!event) return;
          const at = new Date(Number(BigInt(receipt.at) / 1000000n)).toISOString();
          const key = `${receipt.receiptId}:${index}`;
          this.events.set(key, { ...event, txHash, at, key });
        });
      }
      this.pending.shift();
      this.done.add(txHash);
    }
  }
}

/** One `EVENT_JSON:` line from the Waybil contract, if it is a pool event for an investor. */
function parse(line: string): Omit<PoolEvent, "txHash" | "at" | "key"> | null {
  if (!line.startsWith("EVENT_JSON:")) return null;
  try {
    const body = JSON.parse(line.slice("EVENT_JSON:".length)) as {
      standard?: string;
      event?: string;
      data?: { investor?: string; amount?: string; shares?: string }[];
    };
    const data = body.data?.[0];
    if (body.standard !== "waybil" || !data?.investor || !data.amount) return null;
    if (body.event === "deposited")
      return {
        kind: "deposit",
        investor: data.investor,
        amount: data.amount,
        shares: data.shares ?? null,
      };
    if (EVENTS.has(body.event as PoolHistoryItem["kind"]))
      return {
        kind: body.event as PoolHistoryItem["kind"],
        investor: data.investor,
        amount: data.amount,
        shares: null,
      };
    return null;
  } catch {
    return null;
  }
}
