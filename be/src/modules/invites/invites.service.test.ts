import { it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { testDeps, profile } from "../../test/support";
import { Invites } from "./invites.service";
import { inviteRoutes } from "./invites.routes";
import { parse } from "../../middlewares/validate";
import { inviteCreate } from "./invites.schema";

function setup() {
  const deps = testDeps();
  deps.chain.view = vi.fn().mockResolvedValue({ limit: "1000000" });
  let now = Date.parse("2026-11-09T00:00:00Z");
  return {
    deps,
    invites: new Invites(deps.store, deps.chain, "http://localhost:3001", () => now),
    advance: (n: number) => {
      now += n;
    },
  };
}
const input = {
  type: "warehouse" as const,
  name: "Sample Warehouse",
  phone: "+12075550142",
  address: "9 Sample Road",
};
it("hides contact details and checks expiry at the exact boundary", async () => {
  const { invites, advance } = setup();
  const { invite, link } = await invites.create(profile(), input);
  expect(link).toContain(invite.code);
  expect(await invites.read(invite.code)).toEqual({
    shipperName: "shipper.testnet",
    type: "warehouse",
    state: "open",
  });
  advance(7 * 86400000);
  expect((await invites.read(invite.code)).state).toBe("expired");
  await expect(invites.accept(profile("warehouse"), invite.code, "subject")).rejects.toMatchObject({
    code: "E_INVITE_EXPIRED",
  });
});
it("allows one concurrent claim and makes the winner's retry idempotent", async () => {
  const { invites } = setup();
  const { invite } = await invites.create(profile(), input);
  const actors = [profile("warehouse"), { ...profile("warehouse"), accountId: "other.testnet" }];
  const results = await Promise.allSettled(
    actors.map((p) => invites.accept(p, invite.code, p.accountId)),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const winner = results[0]!.status === "fulfilled" ? actors[0]! : actors[1]!;
  expect((await invites.accept(winner, invite.code, winner.accountId)).invite.acceptedBy).toBe(
    winner.accountId,
  );
  expect((await invites.read(invite.code)).state).toBe("used");
});
it("reserves signup for its subject without consuming the invitation", async () => {
  const { invites } = setup();
  const { invite } = await invites.create(profile(), input);
  await invites.reserve(invite.code, "a");
  expect((await invites.read(invite.code)).state).toBe("open");
  await expect(invites.reserve(invite.code, "b")).rejects.toMatchObject({ code: "E_CONFLICT" });
  await expect(invites.accept(profile("warehouse"), invite.code, "b")).rejects.toMatchObject({
    code: "E_ACCESS",
  });
  await expect(invites.accept(profile("driver"), invite.code, "a")).rejects.toMatchObject({
    code: "E_ACCESS",
  });
  expect((await invites.accept(profile("warehouse"), invite.code, "a")).networkLinkRequired).toBe(
    true,
  );
});
it("validates warehouse addresses and guards HTTP creation/listing", async () => {
  expect(() => parse(inviteCreate, { ...input, address: "" })).toThrow();
  const { deps, invites } = setup();
  const p = profile();
  await deps.store.insert("profiles", p.accountId, p);
  const { token } = await deps.sessions.issue(p);
  const app = createApp(
    deps,
    inviteRoutes(deps, invites, async () => "subject"),
  );
  expect((await request(app).post("/v1/invites").send(input)).status).toBe(401);
  expect(
    (await request(app).post("/v1/invites").auth(token, { type: "bearer" }).send(input)).status,
  ).toBe(201);
  expect(
    (await request(app).get("/v1/invites").auth(token, { type: "bearer" })).body.invites,
  ).toHaveLength(1);
});
it("copies the address of the shipper's own destination place onto a warehouse invite", async () => {
  const { deps, invites } = setup();
  const place = (id: string, patch: object = {}) =>
    deps.store.insert("places", id, {
      id,
      shipperId: "shipper.testnet",
      kind: "destination",
      name: "Dock",
      address: "12 Pinned Road",
      lat: -6.9,
      lng: 107.6,
      createdAt: "2026-11-09T00:00:00Z",
      ...patch,
    });
  const dock = "00000000-0000-4000-8000-000000000001";
  const yard = "00000000-0000-4000-8000-000000000002";
  const theirs = "00000000-0000-4000-8000-000000000003";
  await place(dock);
  await place(yard, { kind: "pickup" });
  await place(theirs, { shipperId: "second.testnet" });
  const { address, ...typed } = input;
  void address;
  const made = await invites.create(profile(), parse(inviteCreate, { ...typed, placeId: dock }));
  expect(made.invite).toMatchObject({ placeId: dock, address: "12 Pinned Road" });
  const replaced = await invites.create(profile(), { ...input, placeId: dock });
  expect(replaced.invite.address).toBe("12 Pinned Road");
  await expect(invites.create(profile(), { ...input, placeId: theirs })).rejects.toMatchObject({
    status: 403,
  });
  await expect(invites.create(profile(), { ...input, placeId: yard })).rejects.toMatchObject({
    status: 400,
  });
  await expect(
    invites.create(profile(), { ...input, placeId: "00000000-0000-4000-8000-000000000009" }),
  ).rejects.toMatchObject({ status: 404 });
  expect(() => parse(inviteCreate, typed)).toThrow();
  expect(() => parse(inviteCreate, { ...input, placeId: "not-a-uuid" })).toThrow();
  expect(() =>
    parse(inviteCreate, { type: "driver", name: "Sam", phone: "+12075550142", placeId: dock }),
  ).toThrow();
  const plain = await invites.create(profile(), input);
  expect(plain.invite).not.toHaveProperty("placeId");
  expect(plain.invite.address).toBe("9 Sample Road");
});
