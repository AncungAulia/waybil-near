import { it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { testDeps, profile } from "../../test/support";
import { PoolHistory } from "./history.service";
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

function setup() {
  const source = new FakeSource();
  let now = 1_000_000;
  const history = new PoolHistory(source, CONTRACT, () => now);
  return { source, history, advance: (ms: number) => (now += ms) };
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
