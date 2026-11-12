import { it, expect, vi } from "vitest";
import request from "supertest";
import type { Destination, Place, Shipment } from "@waybil/shared";
import { createApp } from "../../app";
import { testDeps, profile } from "../../test/support";
import { Places } from "../places/places.service";
import { Trips } from "./trips.service";
import { tripRoutes } from "./trips.routes";

const pickedUpAt = Date.parse("2026-11-12T08:00:00Z");

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
    status: "Approved",
    approved_at: "0",
    picked_up_at: null,
    arrived_at: null,
    good_qty: null,
    report_hash: null,
    paid_at: null,
    repaid_at: null,
    marked_late: false,
    ...patch,
  };
}

async function setup(
  options: { simulation?: "on" | "off"; key?: string; fetcher?: typeof fetch } = {},
) {
  const deps = testDeps();
  const shipments = new Map<number, Shipment>([
    [7, shipment(7)],
    [8, shipment(8, { shipper: "second.testnet", driver: "other.testnet" })],
  ]);
  const destinations = new Map<number, Destination>([
    [3, { id: 3, shipper: "shipper.testnet", warehouse: "warehouse.testnet" }],
  ]);
  deps.chain.view = vi.fn(async (method: string, args: Record<string, unknown>) => {
    if (method === "get_shipment") return structuredClone(shipments.get(Number(args.id)) ?? null);
    if (method === "get_destination") return destinations.get(Number(args.id)) ?? null;
    return null;
  }) as unknown as typeof deps.chain.view;
  let now = pickedUpAt + 60000;
  const places = new Places(deps.store, "https://photon.example", vi.fn(), () => now);
  const shipper = profile("shipper");
  const yard = (
    await places.create(shipper, {
      kind: "pickup",
      name: "Main yard",
      address: "1 Sample Street",
      lat: -6.2,
      lng: 106.8,
    })
  ).place;
  const dock = (
    await places.create(shipper, {
      kind: "destination",
      name: "Dock",
      address: "9 Sample Road",
      lat: -6.9,
      lng: 107.6,
    })
  ).place;
  const trips = new Trips(
    deps.store,
    deps.chain,
    {
      ORS_API_KEY: options.key,
      DEMO_LOCATION_SIMULATION: options.simulation ?? "off",
      DEMO_TRIP_SECONDS: 180,
    },
    options.fetcher ?? vi.fn(),
    () => now,
  );
  const tokens: Record<string, string> = {};
  for (const role of ["shipper", "driver", "warehouse", "investor"] as const) {
    const p = profile(role);
    await deps.store.insert("profiles", p.accountId, p);
    tokens[role] = (await deps.sessions.issue(p)).token;
  }
  const app = createApp(deps, tripRoutes(deps, trips));
  return {
    deps,
    app,
    trips,
    tokens,
    yard,
    dock,
    shipments,
    destinations,
    advance: (ms: number) => {
      now += ms;
    },
    invite: async (placeId: string | undefined, code = "c1", acceptedAt = "2026-11-10T00:00:00Z") =>
      deps.store.insert("invites", code, {
        code,
        shipperId: "shipper.testnet",
        type: "warehouse",
        acceptedBy: "warehouse.testnet",
        acceptedAt,
        placeId,
      }),
  };
}

it("stores a straight-line trip and returns the same trip on a repeat", async () => {
  const { app, tokens, yard, dock, invite } = await setup();
  await invite(dock.id);
  const put = (pickupPlaceId: string) =>
    request(app)
      .put("/v1/trips/7")
      .auth(tokens.shipper!, { type: "bearer" })
      .send({ pickupPlaceId });
  const first = await put(yard.id);
  expect(first.status).toBe(200);
  expect(first.body.trip).toMatchObject({
    shipmentId: 7,
    shipperId: "shipper.testnet",
    pickup: { id: yard.id },
    destination: { id: dock.id },
    routeSource: "straight",
    durationMin: null,
    lastLocation: null,
    simulation: null,
  });
  expect(first.body.trip.distanceKm).toBeGreaterThan(100);
  expect(first.body.trip).not.toHaveProperty("createdAt");
  expect(first.body.trip).not.toHaveProperty("locationReceivedAt");
  expect((await put(yard.id)).body).toEqual(first.body);
  expect((await put("00000000-0000-4000-8000-000000000001")).body.error.code).toBe("E_CONFLICT");
});

it("uses the road from the routing service when a key is set", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      features: [
        {
          geometry: {
            type: "LineString",
            coordinates: [
              [106.8, -6.2],
              [107.6, -6.9],
            ],
          },
          properties: { summary: { distance: 150000, duration: 9000 } },
        },
      ],
    }),
  );
  const { trips, yard, dock, invite } = await setup({ key: "sample-key", fetcher });
  await invite(dock.id);
  const { trip } = await trips.create(profile("shipper"), 7, { pickupPlaceId: yard.id });
  expect(trip).toMatchObject({ routeSource: "road", distanceKm: 150, durationMin: 150 });
});

it("checks the pickup place and needs a destination place", async () => {
  const { deps, trips, yard, dock, invite } = await setup();
  const shipper = profile("shipper");
  await expect(trips.create(shipper, 7, { pickupPlaceId: yard.id })).rejects.toMatchObject({
    status: 409,
    code: "E_NO_PLACE",
  });
  await invite(undefined, "c0");
  await expect(trips.create(shipper, 7, { pickupPlaceId: yard.id })).rejects.toMatchObject({
    code: "E_NO_PLACE",
  });
  await invite(dock.id, "c1");
  await expect(trips.create(shipper, 7, { pickupPlaceId: dock.id })).rejects.toMatchObject({
    status: 400,
  });
  const foreign: Place = { ...yard, id: "00000000-0000-4000-8000-000000000009", shipperId: "x" };
  await deps.store.insert("places", foreign.id, foreign);
  await expect(trips.create(shipper, 7, { pickupPlaceId: foreign.id })).rejects.toMatchObject({
    status: 403,
  });
  await expect(
    trips.create(shipper, 7, { pickupPlaceId: "00000000-0000-4000-8000-000000000002" }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(trips.create(shipper, 8, { pickupPlaceId: yard.id })).rejects.toMatchObject({
    status: 403,
  });
  await expect(trips.create(shipper, 99, { pickupPlaceId: yard.id })).rejects.toMatchObject({
    status: 404,
  });
});

it("picks the place of the newest accepted warehouse invite", async () => {
  const { deps, trips, yard, dock, invite } = await setup();
  const newer: Place = { ...dock, id: "00000000-0000-4000-8000-000000000003", name: "New dock" };
  await deps.store.insert("places", newer.id, newer);
  await invite(dock.id, "c1", "2026-11-10T00:00:00Z");
  await invite(newer.id, "c2", "2026-11-11T00:00:00Z");
  const { trip } = await trips.create(profile("shipper"), 7, { pickupPlaceId: yard.id });
  expect(trip.destination.name).toBe("New dock");
});

it("shows a trip to the shipper, driver and warehouse only", async () => {
  const { app, tokens, trips, yard, dock, invite } = await setup();
  await invite(dock.id);
  await trips.create(profile("shipper"), 7, { pickupPlaceId: yard.id });
  const get = (path: string, role: string) =>
    request(app).get(path).auth(tokens[role]!, { type: "bearer" });
  for (const role of ["shipper", "driver", "warehouse"])
    expect((await get("/v1/trips/7", role)).body.trip.shipmentId).toBe(7);
  expect((await get("/v1/trips/7", "investor")).status).toBe(403);
  expect((await get("/v1/trips/8", "driver")).status).toBe(403);
  expect((await get("/v1/trips/99", "driver")).status).toBe(404);
  const list = await get("/v1/trips?ids=7,8,99,7", "driver");
  expect(list.status).toBe(200);
  expect(list.body.trips.map((t: { shipmentId: number }) => t.shipmentId)).toEqual([7]);
  expect((await get("/v1/trips?ids=", "driver")).status).toBe(400);
  expect((await get("/v1/trips?ids=0", "driver")).status).toBe(400);
  const many = Array.from({ length: 51 }, (_, i) => i + 1).join(",");
  expect((await get(`/v1/trips?ids=${many}`, "driver")).status).toBe(400);
  expect((await get("/v1/trips?ids=7", "investor")).status).toBe(403);
});

it("takes a location only from the driver while the truck is on the road", async () => {
  const { app, tokens, trips, yard, dock, invite, shipments, advance } = await setup();
  await invite(dock.id);
  await trips.create(profile("shipper"), 7, { pickupPlaceId: yard.id });
  const post = (body: object, role = "driver") =>
    request(app).post("/v1/trips/7/location").auth(tokens[role]!, { type: "bearer" }).send(body);
  expect((await post({ lat: -6.5, lng: 107 })).body.error.code).toBe("E_NOT_ON_ROAD");
  shipments.get(7)!.status = "PickedUp";
  shipments.get(7)!.picked_up_at = String(BigInt(pickedUpAt) * 1000000n);
  expect((await post({ lat: -6.5, lng: 107 }, "shipper")).status).toBe(403);
  expect((await post({ lat: 95, lng: 107 })).status).toBe(400);

  const future = new Date(pickedUpAt + 3600000).toISOString();
  const first = await post({ lat: -6.5, lng: 107, recordedAt: future });
  expect(first.status).toBe(200);
  expect(first.body.location).toEqual({
    lat: -6.5,
    lng: 107,
    recordedAt: new Date(pickedUpAt + 60000).toISOString(),
    source: "gps",
  });
  advance(29999);
  const early = await post({ lat: -6.6, lng: 107.1 });
  expect(early.status).toBe(429);
  expect(early.body.error.code).toBe("E_RATE_LIMIT");
  advance(1);
  expect((await post({ lat: -6.6, lng: 107.1 })).body.location.lat).toBe(-6.6);
  advance(30000);
  const late = await post({ lat: -6.4, lng: 106.9, recordedAt: "2026-11-12T07:00:00Z" });
  expect(late.body.location.lat).toBe(-6.6);
  const read = await trips.read(profile("warehouse"), 7);
  expect(read.trip.lastLocation).toMatchObject({ lat: -6.6, lng: 107.1, source: "gps" });

  shipments.get(7)!.status = "Paid";
  advance(30000);
  expect((await post({ lat: -6.7, lng: 107.2 })).status).toBe(409);
});

it("adds the demo simulation from the pickup time when it is on", async () => {
  const { trips, yard, dock, invite, shipments } = await setup({ simulation: "on" });
  await invite(dock.id);
  const shipper = profile("shipper");
  expect((await trips.create(shipper, 7, { pickupPlaceId: yard.id })).trip.simulation).toBeNull();
  shipments.get(7)!.status = "PickedUp";
  shipments.get(7)!.picked_up_at = String(BigInt(pickedUpAt) * 1000000n + 123456n);
  expect((await trips.read(shipper, 7)).trip.simulation).toEqual({
    startedAt: "2026-11-12T08:00:00.000Z",
    durationSec: 180,
  });
});
