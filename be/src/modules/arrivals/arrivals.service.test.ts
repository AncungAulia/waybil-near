import { it, expect, vi } from "vitest";
import request from "supertest";
import type { Destination, Shipment } from "@waybil/shared";
import { createApp } from "../../app";
import { testDeps, profile } from "../../test/support";
import { Arrivals } from "./arrivals.service";
import { arrivalRoutes } from "./arrivals.routes";
import { ARRIVAL_CODE_ALPHABET } from "./arrivals.schema";

function shipment(id: number, patch: Partial<Shipment> = {}): Shipment {
  return {
    id,
    shipper: "shipper.testnet",
    driver: "driver.testnet",
    destination: 3,
    qty: 10,
    unit: "boxes",
    bill: "1000000",
    advance: "500000",
    due_at: "0",
    status: "PickedUp",
    approved_at: "0",
    picked_up_at: "1",
    arrived_at: null,
    good_qty: null,
    report_hash: null,
    paid_at: null,
    repaid_at: null,
    marked_late: false,
    ...patch,
  };
}

async function setup(random?: (max: number) => number) {
  const deps = testDeps();
  const shipments = new Map<number, Shipment>([
    [7, shipment(7)],
    [8, shipment(8, { destination: 4 })],
    [9, shipment(9, { status: "Approved", picked_up_at: null })],
  ]);
  const destinations = new Map<number, Destination>([
    [3, { id: 3, shipper: "shipper.testnet", warehouse: "warehouse.testnet" }],
    [4, { id: 4, shipper: "shipper.testnet", warehouse: "other.testnet" }],
  ]);
  deps.chain.view = vi.fn(async (method: string, args: Record<string, unknown>) => {
    if (method === "get_shipment") return structuredClone(shipments.get(Number(args.id)) ?? null);
    if (method === "get_destination") return destinations.get(Number(args.id)) ?? null;
    return null;
  }) as unknown as typeof deps.chain.view;
  const arrivals = new Arrivals(deps.store, deps.chain, random);
  const tokens: Record<string, string> = {};
  for (const role of ["shipper", "driver", "warehouse"] as const) {
    const p = profile(role);
    await deps.store.insert("profiles", p.accountId, p);
    tokens[role] = (await deps.sessions.issue(p)).token;
  }
  const app = createApp(deps, arrivalRoutes(deps, arrivals));
  const get = (id: number, role = "driver") =>
    request(app).get(`/v1/trips/${id}/code`).auth(tokens[role]!, { type: "bearer" });
  const lookup = (code: unknown) =>
    request(app)
      .post("/v1/arrivals/lookup")
      .auth(tokens.warehouse!, { type: "bearer" })
      .send({ code });
  return { deps, app, arrivals, shipments, get, lookup };
}

it("makes a random code on the first call and keeps it", async () => {
  const { deps, get } = await setup();
  const first = await get(7);
  expect(first.status).toBe(200);
  expect(first.body.code).toMatch(new RegExp(`^[${ARRIVAL_CODE_ALPHABET}]{8}$`));
  expect((await get(7)).body).toEqual(first.body);
  const other = await get(8);
  expect(other.body.code).not.toBe(first.body.code);
  const row = await deps.store.get<{ shipmentId: number; code: string }>("arrival_codes", "7");
  expect(row?.value).toMatchObject({ shipmentId: 7, code: first.body.code });
});

it("draws again when another shipment holds the code", async () => {
  const draws = [...Array(8).fill(0), ...Array(8).fill(0), ...Array(8).fill(1)];
  const { arrivals } = await setup(() => draws.shift()!);
  const driver = profile("driver");
  expect((await arrivals.code(driver, 7)).code).toBe("22222222");
  expect((await arrivals.code(driver, 8)).code).toBe("33333333");
});

it("reads back the code a racing request stored", async () => {
  const { deps, arrivals } = await setup();
  const insert = deps.store.insert.bind(deps.store);
  deps.store.insert = vi.fn(async (table, id, value) => {
    await insert(table, id, { ...(value as object), code: "WINNER22" });
    return insert(table, id, value);
  }) as typeof deps.store.insert;
  expect((await arrivals.code(profile("driver"), 7)).code).toBe("WINNER22");
});

it("gives the code only to the shipment's driver while on the road", async () => {
  const { get, shipments } = await setup();
  expect((await get(7, "warehouse")).status).toBe(403);
  shipments.set(7, shipment(7, { driver: "someone.testnet" }));
  expect((await get(7)).status).toBe(403);
  const waiting = await get(9);
  expect(waiting.status).toBe(409);
  expect(waiting.body.error.code).toBe("E_NOT_ON_ROAD");
  expect((await get(99)).status).toBe(404);
  expect((await get(0)).status).toBe(400);
});

it("finds a shipment by code only for its own warehouse", async () => {
  const { arrivals, lookup } = await setup();
  const driver = profile("driver");
  const mine = (await arrivals.code(driver, 7)).code;
  const theirs = (await arrivals.code(driver, 8)).code;
  const found = await lookup(` ${mine.slice(0, 4).toLowerCase()} ${mine.slice(4)} `);
  expect(found.status).toBe(200);
  expect(found.body).toEqual({ shipmentId: 7 });
  const other = await lookup(theirs);
  expect(other.status).toBe(404);
  expect(other.body.error.code).toBe("E_NOT_FOUND");
  const unknown = await lookup(mine === "ZZZZZZZZ" ? "YYYYYYYY" : "ZZZZZZZZ");
  expect(unknown.status).toBe(404);
  expect(unknown.body).toEqual(other.body);
  for (const bad of ["ABC", "ABCD0345", "ABCD23456", 12345678, ""])
    expect((await lookup(bad)).status).toBe(400);
});

it("limits lookups to 20 a minute per warehouse", async () => {
  const { lookup, app, deps } = await setup();
  for (let i = 0; i < 20; i++) expect((await lookup("ZZZZZZZZ")).status).toBe(404);
  expect((await lookup("ZZZZZZZZ")).status).toBe(429);
  const driver = profile("driver");
  const { token } = await deps.sessions.issue(driver);
  expect(
    (
      await request(app)
        .post("/v1/arrivals/lookup")
        .auth(token, { type: "bearer" })
        .send({ code: "ZZZZZZZZ" })
    ).status,
  ).toBe(403);
});
