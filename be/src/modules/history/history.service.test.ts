import { it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { testDeps, profile, MemoryStore } from "../../test/support";
import { PoolHistory, txBudget, type PoolScan } from "./history.service";
import { historyRoutes } from "./history.routes";
import type { ContractReceipt, EventSource, ReceiptLog } from "./history.source";

const CONTRACT = "app.waybil.testnet";
const event = (name: string, data: Record<string, string>) =>
  `EVENT_JSON:${JSON.stringify({ standard: "waybil", version: "1.0.0", event: name, data: [data] })}`;
const ns = (iso: string) => String(BigInt(Date.parse(iso)) * 1000000n);

class FakeSource implements EventSource {
  pages: ContractReceipt[][] = [];
  txs: Record<string, ReceiptLog[]> = {};
  fail = false;
  receipts = vi.fn(async (cursor?: string) => {
    if (this.fail) throw new Error("indexer down");
    const i = cursor ? Number(cursor) : 0;
    return {
      receipts: this.pages[i] ?? [],
      next: i + 1 < this.pages.length ? String(i + 1) : null,
    };
  });
  logs = vi.fn(async (hash: string) => this.txs[hash] ?? []);
}
const investor = { ...profile("investor"), accountId: "ana.testnet" };

function setup(store = new MemoryStore(), budget?: number) {
  const source = new FakeSource();
  let now = 1_000_000;
  const history = new PoolHistory(store, source, CONTRACT, budget, () => now);
  return { source, history, store, advance: (ms: number) => (now += ms) };
}
/* One contract receipt per transaction, each holding one deposit for ana, newest first. */
function deposits(source: FakeSource, count: number, prefix = "t") {
  const hashes = Array.from({ length: count }, (_, i) => `${prefix}${count - 1 - i}`);
  source.pages = [
    hashes.map((h) => ({ receiptId: `r-${h}`, txHash: h, methods: ["ft_on_transfer"] })),
  ];
  hashes.forEach((h, i) => {
    source.txs[h] = [
      {
        receiptId: `x${h}`,
        executor: CONTRACT,
        at: ns(new Date(Date.parse("2026-11-01T00:00:00Z") + (count - i) * 60000).toISOString()),
        logs: [event("deposited", { investor: "ana.testnet", amount: "1", shares: "1" })],
      },
    ];
  });
  return hashes;
}

it("lists only this investor's deposits and withdrawals, newest first", async () => {
  const { source, history } = setup();
  source.pages = [
    [
      { receiptId: "r3", txHash: "t2", methods: ["withdraw"] },
      { receiptId: "r2", txHash: "t9", methods: ["add_driver"] },
    ],
    [{ receiptId: "r1", txHash: "t1", methods: ["ft_on_transfer"] }],
  ];
  source.txs.t1 = [
    {
      receiptId: "x1",
      executor: "usdc.waybil.testnet",
      at: ns("2026-11-09T10:00:00Z"),
      logs: [event("deposited", { investor: "ana.testnet", amount: "999", shares: "1" })],
    },
    {
      receiptId: "x2",
      executor: CONTRACT,
      at: ns("2026-11-09T10:00:01Z"),
      logs: [
        "plain log line",
        event("deposited", { investor: "ana.testnet", amount: "2500000000", shares: "2500000000" }),
      ],
    },
  ];
  source.txs.t2 = [
    {
      receiptId: "x3",
      executor: CONTRACT,
      at: ns("2026-11-10T08:00:00Z"),
      logs: [
        event("withdraw_queued", { investor: "ana.testnet", amount: "300" }),
        event("withdraw_paid", { investor: "ana.testnet", amount: "700" }),
        event("withdraw_paid", { investor: "bob.testnet", amount: "50" }),
      ],
    },
  ];
  const { items } = await history.history(investor);
  expect(items.map((i) => [i.kind, i.amount, i.txHash])).toEqual([
    ["withdraw_paid", "700", "t2"],
    ["withdraw_queued", "300", "t2"],
    ["deposit", "2500000000", "t1"],
  ]);
  expect(items[2]).toMatchObject({ shares: "2500000000", at: "2026-11-09T10:00:01.000Z" });
  /* Unrelated receipts are never opened. */
  expect(source.logs).not.toHaveBeenCalledWith("t9");
});

it("reads only new receipts on later scans and shares one scan between quick calls", async () => {
  const { source, history, advance } = setup();
  source.pages = [[{ receiptId: "r1", txHash: "t1", methods: ["ft_on_transfer"] }]];
  source.txs.t1 = [
    {
      receiptId: "x1",
      executor: CONTRACT,
      at: ns("2026-11-09T10:00:00Z"),
      logs: [event("deposited", { investor: "ana.testnet", amount: "10", shares: "10" })],
    },
  ];
  await Promise.all([history.history(investor), history.history(investor)]);
  expect(source.receipts).toHaveBeenCalledTimes(1);
  advance(61000);
  source.pages = [
    [
      { receiptId: "r2", txHash: "t2", methods: ["process_queue"] },
      { receiptId: "r1", txHash: "t1", methods: ["ft_on_transfer"] },
    ],
  ];
  source.txs.t2 = [
    {
      receiptId: "x2",
      executor: CONTRACT,
      at: ns("2026-11-11T10:00:00Z"),
      logs: [event("withdraw_paid", { investor: "ana.testnet", amount: "4" })],
    },
  ];
  expect((await history.history(investor)).items).toHaveLength(2);
  expect(source.logs).toHaveBeenCalledTimes(2);
});

it("keeps serving what it has when the indexer fails, and says unavailable before that", async () => {
  const { source, history, advance } = setup();
  source.fail = true;
  await expect(history.history(investor)).rejects.toMatchObject({ code: "E_UNAVAILABLE" });
  source.fail = false;
  expect((await history.history(investor)).items).toEqual([]);
  advance(61000);
  source.fail = true;
  expect((await history.history(investor)).items).toEqual([]);
});

it("is for signed-in investors only", async () => {
  const deps = testDeps();
  const { history } = setup();
  const app = createApp(deps, historyRoutes(deps, history));
  expect((await request(app).get("/v1/me/history")).status).toBe(401);
  const driver = profile("driver");
  await deps.store.insert("profiles", driver.accountId, driver);
  const { token } = await deps.sessions.issue(driver);
  expect((await request(app).get("/v1/me/history").auth(token, { type: "bearer" })).status).toBe(
    403,
  );
  await deps.store.insert("profiles", investor.accountId, investor);
  const ok = await deps.sessions.issue(investor);
  const res = await request(app).get("/v1/me/history").auth(ok.token, { type: "bearer" });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ items: [] });
});

it("reads a few transactions per scan and picks up the rest later, even after a limit error", async () => {
  const { source, history, advance } = setup();
  const hashes = ["t1", "t2", "t3", "t4", "t5", "t6"];
  source.pages = [
    hashes.map((h, i) => ({ receiptId: `r${i}`, txHash: h, methods: ["ft_on_transfer"] })),
  ];
  for (const [i, h] of hashes.entries())
    source.txs[h] = [
      {
        receiptId: `x${i}`,
        executor: CONTRACT,
        at: ns(`2026-11-0${i + 1}T00:00:00Z`),
        logs: [event("deposited", { investor: "ana.testnet", amount: String(i + 1), shares: "1" })],
      },
    ];
  expect((await history.history(investor)).items).toHaveLength(4);
  advance(61000);
  source.logs.mockRejectedValueOnce(Object.assign(new Error("limit"), { code: "INDEXER_429" }));
  expect((await history.history(investor)).items).toHaveLength(4);
  advance(61000);
  expect((await history.history(investor)).items).toHaveLength(6);
  expect(source.logs).toHaveBeenCalledTimes(7);
});

it("reads a new withdrawal before older history still waiting to be read", async () => {
  const { source, history, advance } = setup();
  /* Ten old deposits, more than one scan reads. */
  source.pages = [
    Array.from({ length: 10 }, (_, i) => ({
      receiptId: `old${i}`,
      txHash: `old${i}`,
      methods: ["ft_on_transfer"],
    })),
  ];
  for (let i = 0; i < 10; i++)
    source.txs[`old${i}`] = [
      {
        receiptId: `x-old${i}`,
        executor: CONTRACT,
        at: ns("2026-11-09T10:00:00Z"),
        logs: [event("deposited", { investor: "bob.testnet", amount: "1", shares: "1" })],
      },
    ];
  await history.history(investor);
  /* A withdrawal arrives. It is listed first by the indexer and must be read on the next scan. */
  source.pages = [
    [{ receiptId: "new", txHash: "fresh", methods: ["withdraw"] }, ...source.pages[0]!],
  ];
  source.txs.fresh = [
    {
      receiptId: "x-new",
      executor: CONTRACT,
      at: ns("2026-11-12T10:00:00Z"),
      logs: [event("withdraw_paid", { investor: "ana.testnet", amount: "100" })],
    },
  ];
  advance(10 * 60_000);
  const { items } = await history.history(investor);
  expect(items.map((i) => [i.kind, i.txHash])).toEqual([["withdraw_paid", "fresh"]]);
});

it("keeps events and the scan position across a restart", async () => {
  const first = setup();
  deposits(first.source, 3);
  expect((await first.history.history(investor)).items).toHaveLength(3);
  expect(first.store.rows.get(`pool_events/xt2:0`)?.value).toEqual({
    id: "xt2:0",
    kind: "deposit",
    investor: "ana.testnet",
    amount: "1",
    shares: "1",
    txHash: "t2",
    at: "2026-11-01T00:03:00.000Z",
  });
  /* A new process on the same database lists nothing new and opens no transaction again. */
  const second = setup(first.store);
  second.source.pages = first.source.pages;
  const { items } = await second.history.history(investor);
  expect(items.map((i) => i.txHash)).toEqual(["t2", "t1", "t0"]);
  expect(second.source.receipts).toHaveBeenCalledTimes(1);
  expect(second.source.logs).not.toHaveBeenCalled();
});

it("serves stored events after a restart when the indexer fails", async () => {
  const first = setup();
  deposits(first.source, 2);
  await first.history.history(investor);
  const second = setup(first.store);
  second.source.fail = true;
  expect((await second.history.history(investor)).items).toHaveLength(2);
});

it("stops the listing at the newest receipt already stored", async () => {
  const { source, history, store } = setup();
  await store.insert<PoolScan>("pool_scan", CONTRACT, { newest: "r2", pending: [] });
  source.pages = [
    [
      { receiptId: "r3", txHash: "t3", methods: ["withdraw"] },
      { receiptId: "r2", txHash: "t2", methods: ["withdraw"] },
    ],
    [{ receiptId: "r1", txHash: "t1", methods: ["withdraw"] }],
  ];
  await history.history(investor);
  expect(source.receipts).toHaveBeenCalledTimes(1);
  expect(source.logs.mock.calls.map(([h]) => h)).toEqual(["t3"]);
  expect((await store.get<PoolScan>("pool_scan", CONTRACT))?.value).toMatchObject({
    newest: "r3",
    pending: [],
  });
});

it("puts a new withdrawal ahead of older pending history kept in the database", async () => {
  const first = setup();
  deposits(first.source, 10, "old");
  await first.history.history(investor);
  /* After a restart the new withdrawal is read first, with the older queue behind it. */
  const second = setup(first.store);
  second.source.pages = [
    [{ receiptId: "new", txHash: "fresh", methods: ["withdraw"] }, ...first.source.pages[0]!],
  ];
  second.source.txs = {
    ...first.source.txs,
    fresh: [
      {
        receiptId: "x-new",
        executor: CONTRACT,
        at: ns("2026-11-12T10:00:00Z"),
        logs: [event("withdraw_paid", { investor: "ana.testnet", amount: "100" })],
      },
    ],
  };
  const { items } = await second.history.history(investor);
  expect(items[0]).toMatchObject({ kind: "withdraw_paid", txHash: "fresh" });
  expect(second.source.logs.mock.calls[0]).toEqual(["fresh"]);
  expect(items).toHaveLength(8);
});

it("opens 40 transactions per scan with an indexer key and 4 without", async () => {
  expect(txBudget()).toBe(4);
  expect(txBudget("key")).toBe(40);
  const { source, history } = setup(new MemoryStore(), txBudget("key"));
  deposits(source, 50);
  expect((await history.history(investor)).items).toHaveLength(40);
  expect(source.logs).toHaveBeenCalledTimes(40);
});

it("skips saving a scan when another process saved first, keeping the events it read", async () => {
  const { source, history, store } = setup();
  deposits(source, 2);
  source.logs.mockImplementationOnce(async (hash: string) => {
    /* Another process saves its scan while this one reads. */
    await store.insert<PoolScan>("pool_scan", CONTRACT, { newest: "other", pending: ["z"] });
    return source.txs[hash] ?? [];
  });
  expect((await history.history(investor)).items).toHaveLength(2);
  expect((await store.get<PoolScan>("pool_scan", CONTRACT))?.value).toEqual({
    newest: "other",
    pending: ["z"],
  });
});
