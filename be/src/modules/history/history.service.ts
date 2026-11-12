import type { PoolHistoryItem, PoolHistoryResponse, Principal } from "@waybil/shared";
import { allowed, ApiException, unavailable } from "../../lib/errors";
import { logError } from "../../lib/logger";
import type { Store } from "../../types/db";
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
 * minute per process, page loads in between share it, and each scan opens at most `budget`
 * transactions. The rest wait for the next scan.
 */
const FRESH_MS = 60000;
/** Transactions one scan may open: 4 on the free indexer plan, 40 with NEARBLOCKS_API_KEY. */
export const txBudget = (apiKey?: string) => (apiKey ? 40 : 4);
/* A first scan lists the whole contract history. Later scans stop at the newest known receipt. */
const MAX_PAGES = 50;
/* Recently read transactions, so a late receipt of the same transaction doesn't queue it again. */
const DONE_KEEP = 200;

/** One row of `pool_events`, id `<receiptId>:<logIndex>`. */
export interface StoredPoolEvent {
  id: string;
  kind: PoolHistoryItem["kind"];
  investor: string;
  amount: string;
  shares?: string;
  txHash: string;
  at: string;
}
/** The `pool_scan` row for one contract: how far reading the indexer got. */
export interface PoolScan {
  /** The newest receipt id already listed. A listing stops when it reaches it. */
  newest: string | null;
  /** Transactions that may hold pool events and are not read yet, newest first. */
  pending: string[];
  /** Transactions read lately, newest first. */
  done?: string[];
}

/**
 * Pool history for investors, from the contract's NEP-297 events (`deposited`,
 * `withdraw_paid`, `withdraw_queued`, `withdraw_failed`). The events are kept in `pool_events`
 * and the scan position in `pool_scan`, so a restart or deploy keeps them and only fetches
 * what is new.
 */
export class PoolHistory {
  private loadedAt = 0;
  private running: Promise<void> | null = null;

  constructor(
    private store: Store,
    private source: EventSource,
    private contract: string,
    private budget = txBudget(),
    private now = () => Date.now(),
  ) {}

  async history(actor: Principal): Promise<PoolHistoryResponse> {
    allowed(actor.role === "investor");
    try {
      await this.refresh();
    } catch (error) {
      logError("pool_history", error);
      /* Serve what is stored. With nothing stored yet there is nothing honest to show. */
      if (!(await this.store.get("pool_scan", this.contract))) unavailable();
    }
    const rows = await this.store.list<StoredPoolEvent>("pool_events", {
      investor: actor.accountId,
    });
    const items = rows
      .map((r) => r.value)
      .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id))
      .map(({ kind, amount, shares, txHash, at }) => ({
        kind,
        amount,
        shares: shares ?? null,
        txHash,
        at,
      }));
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
    const saved = await this.store.get<PoolScan>("pool_scan", this.contract);
    const state: PoolScan = saved?.value ?? { newest: null, pending: [] };
    const done = state.done ?? [];
    const found: string[] = [];
    let newest = state.newest;
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const { receipts, next } = await this.source.receipts(cursor);
      if (page === 0 && receipts[0]) newest = receipts[0].receiptId;
      let reachedKnown = false;
      for (const r of receipts) {
        if (r.receiptId === state.newest) {
          reachedKnown = true;
          break;
        }
        if (r.methods.some((m) => POOL_METHODS.has(m))) found.push(r.txHash);
      }
      if (reachedKnown || !next) break;
      cursor = next;
    }
    /*
     * New transactions go to the front, so a deposit or withdrawal made a moment ago is read
     * on this scan instead of waiting behind the older history still being filled in.
     */
    const newer = [...new Set(found)].filter(
      (txHash) => !done.includes(txHash) && !state.pending.includes(txHash),
    );
    const pending = [...newer, ...state.pending];
    const read: string[] = [];

    for (const txHash of pending.slice(0, this.budget)) {
      let receipts;
      try {
        receipts = await this.source.logs(txHash);
      } catch (error) {
        /* Over the limit or down. Keep the rest for the next scan. */
        logError("pool_history_tx", error, { txHash });
        break;
      }
      for (const receipt of receipts) {
        if (receipt.executor !== this.contract) continue;
        const at = new Date(Number(BigInt(receipt.at) / 1000000n)).toISOString();
        for (const [index, line] of receipt.logs.entries()) {
          const event = parse(line);
          if (!event) continue;
          const id = `${receipt.receiptId}:${index}`;
          await this.keep({ id, ...event, txHash, at });
        }
      }
      read.push(txHash);
    }

    const next: PoolScan = {
      newest,
      pending: pending.slice(read.length),
      done: [...read, ...done].slice(0, DONE_KEEP),
    };
    try {
      if (saved) await this.store.replace("pool_scan", this.contract, saved.version, next);
      else await this.store.insert("pool_scan", this.contract, next);
    } catch (error) {
      /* Another process saved a scan first. Its position wins and this one is skipped. */
      if (!isConflict(error)) throw error;
    }
    this.loadedAt = this.now();
  }

  /** Saves one event. An event already stored is left as it is. */
  private async keep(event: StoredPoolEvent) {
    try {
      await this.store.insert("pool_events", event.id, event);
    } catch (error) {
      if (!isConflict(error)) throw error;
    }
  }
}

function isConflict(error: unknown) {
  return error instanceof ApiException && error.code === "E_CONFLICT";
}

/** One `EVENT_JSON:` line from the Waybil contract, if it is a pool event for an investor. */
function parse(
  line: string,
): Pick<StoredPoolEvent, "kind" | "investor" | "amount" | "shares"> | null {
  if (!line.startsWith("EVENT_JSON:")) return null;
  try {
    const body = JSON.parse(line.slice("EVENT_JSON:".length)) as {
      standard?: string;
      event?: string;
      data?: { investor?: string; amount?: string; shares?: string }[];
    };
    const data = body.data?.[0];
    if (
      body.standard !== "waybil" ||
      !data?.investor ||
      !data.amount ||
      !/^[0-9]+$/.test(data.amount)
    )
      return null;
    if (body.event === "deposited")
      return {
        kind: "deposit",
        investor: data.investor,
        amount: data.amount,
        ...(data.shares ? { shares: data.shares } : {}),
      };
    if (EVENTS.has(body.event as PoolHistoryItem["kind"]))
      return {
        kind: body.event as PoolHistoryItem["kind"],
        investor: data.investor,
        amount: data.amount,
      };
    return null;
  } catch {
    return null;
  }
}
