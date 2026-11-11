import { it, expect, vi } from "vitest";
import request from "supertest";
import type { Application, Network } from "@waybil/shared";
import { createApp } from "../../app";
import { testDeps, profile } from "../../test/support";
import { Profiles } from "./profiles.service";
import { profileRoutes } from "./profiles.routes";
import { Invites } from "../invites/invites.service";

function company(state: Application["state"], name: string, createdAt: string): Application {
  return {
    id: `app-${name}`,
    shipperId: "shipper.testnet",
    company: { name } as Application["company"],
    state,
    documents: {},
    proposalId: null,
    reviewId: null,
    submissionNumber: 1,
    rejection: null,
    createdAt,
    updatedAt: createdAt,
  };
}
async function signedIn(deps: ReturnType<typeof testDeps>, role: Parameters<typeof profile>[0]) {
  const p = profile(role);
  await deps.store.insert("profiles", p.accountId, p);
  return (await deps.sessions.issue(p)).token;
}

it("shows only the account, role and public name, with the company name for a shipper", async () => {
  const deps = testDeps();
  const token = await signedIn(deps, "driver");
  await deps.store.insert("profiles", "shipper.testnet", { ...profile(), name: "" });
  await deps.store.insert(
    "applications",
    "a1",
    company("rejected", "Old Name", "2026-11-09T00:00:00Z"),
  );
  await deps.store.insert(
    "applications",
    "a2",
    company("approved", "Northwind Freight", "2026-11-08T00:00:00Z"),
  );
  const app = createApp(deps, profileRoutes(deps, new Profiles(deps.store, deps.chain)));
  const res = await request(app)
    .get("/v1/profiles?ids=shipper.testnet,driver.testnet,nobody.testnet,shipper.testnet")
    .auth(token, { type: "bearer" });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    profiles: [
      { accountId: "shipper.testnet", role: "shipper", name: "Northwind Freight" },
      { accountId: "driver.testnet", role: "driver", name: "Test Person" },
    ],
  });
  expect(JSON.stringify(res.body)).not.toMatch(/phone|email|truckPlate|\+1207/);
});

it("needs a session and one to fifty valid account ids", async () => {
  const deps = testDeps();
  const token = await signedIn(deps, "shipper");
  const app = createApp(deps, profileRoutes(deps, new Profiles(deps.store, deps.chain)));
  expect((await request(app).get("/v1/profiles?ids=driver.testnet")).status).toBe(401);
  const get = (query: string) =>
    request(app).get(`/v1/profiles${query}`).auth(token, { type: "bearer" });
  expect((await get("")).status).toBe(400);
  expect((await get("?ids=Not Valid")).status).toBe(400);
  const many = Array.from({ length: 51 }, (_, i) => `a${i}.testnet`).join(",");
  expect((await get(`?ids=${many}`)).status).toBe(400);
});

it("finds a warehouse's destinations from the invites it accepted", async () => {
  const deps = testDeps();
  const networks: Record<string, Network> = {
    "shipper.testnet": {
      drivers: [],
      destinations: [
        { id: 3, shipper: "shipper.testnet", warehouse: "warehouse.testnet" },
        { id: 4, shipper: "shipper.testnet", warehouse: "other.testnet" },
      ],
    },
    "second.testnet": {
      drivers: [],
      destinations: [{ id: 9, shipper: "second.testnet", warehouse: "warehouse.testnet" }],
    },
  };
  deps.chain.view = vi.fn(async (method: string, args: Record<string, unknown>) =>
    method === "get_network" ? (networks[args.account_id as string] ?? null) : { limit: "1" },
  ) as unknown as typeof deps.chain.view;
  await deps.store.insert(
    "applications",
    "a1",
    company("approved", "Northwind Freight", "2026-11-08T00:00:00Z"),
  );
  for (const [code, shipperId, acceptedBy, type] of [
    ["c1", "shipper.testnet", "warehouse.testnet", "warehouse"],
    ["c2", "second.testnet", "warehouse.testnet", "warehouse"],
    ["c3", "third.testnet", "warehouse.testnet", "driver"],
    ["c4", "fourth.testnet", "someone.testnet", "warehouse"],
  ] as const)
    await deps.store.insert("invites", code, { code, shipperId, acceptedBy, type });
  const token = await signedIn(deps, "warehouse");
  const app = createApp(deps, profileRoutes(deps, new Profiles(deps.store, deps.chain)));
  const res = await request(app).get("/v1/me/destinations").auth(token, { type: "bearer" });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    destinations: [
      { id: 9, shipperId: "second.testnet", shipperName: "second.testnet" },
      { id: 3, shipperId: "shipper.testnet", shipperName: "Northwind Freight" },
    ],
  });
  const driver = await signedIn(deps, "driver");
  expect(
    (await request(app).get("/v1/me/destinations").auth(driver, { type: "bearer" })).status,
  ).toBe(403);
});

it("names the company on a new invite once the shipper has applied", async () => {
  const deps = testDeps();
  deps.chain.view = vi.fn().mockResolvedValue({ limit: "1000000" });
  await deps.store.insert(
    "applications",
    "a1",
    company("approved", "Northwind Freight", "2026-11-08T00:00:00Z"),
  );
  const invites = new Invites(deps.store, deps.chain, "http://localhost:3001");
  const { invite } = await invites.create(profile(), {
    type: "driver",
    name: "Sam",
    phone: "+12075550142",
  });
  expect((await invites.read(invite.code)).shipperName).toBe("Northwind Freight");
});
