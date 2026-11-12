import { it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { testDeps, profile } from "../../test/support";
import { Places, photonLabel } from "./places.service";
import { placeRoutes } from "./places.routes";

async function signedIn(deps: ReturnType<typeof testDeps>, role: Parameters<typeof profile>[0]) {
  const p = profile(role);
  await deps.store.insert("profiles", p.accountId, p);
  return (await deps.sessions.issue(p)).token;
}
const pickup = {
  kind: "pickup" as const,
  name: "Main yard",
  address: "1 Sample Street",
  lat: -6.2,
  lng: 106.8,
};

it("labels a suggestion with its parts in order and without repeats", () => {
  expect(
    photonLabel({
      name: "Sample Depot",
      street: "Sample Road",
      housenumber: "12",
      city: "Bandung",
      state: "Bandung",
      country: "Indonesia",
    }),
  ).toBe("Sample Depot, Sample Road 12, Bandung, Indonesia");
  expect(photonLabel({ name: "Jakarta", city: "jakarta", country: "Indonesia" })).toBe(
    "Jakarta, Indonesia",
  );
});

it("searches Photon, keeps five valid suggestions and drops bad coordinates", async () => {
  const deps = testDeps();
  const token = await signedIn(deps, "shipper");
  const feature = (name: string, coordinates: unknown) => ({
    geometry: { coordinates },
    properties: { name, country: "Indonesia" },
  });
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      features: [
        feature("Bad", [200, 10]),
        feature("Missing", null),
        ...Array.from({ length: 6 }, (_, i) => feature(`Depot ${i}`, [106.8 + i / 100, -6.2])),
      ],
    }),
  );
  const app = createApp(
    deps,
    placeRoutes(deps, new Places(deps.store, "https://photon.example/", fetcher)),
  );
  const res = await request(app)
    .get("/v1/places/search?q=sample%20depot")
    .auth(token, { type: "bearer" });
  expect(res.status).toBe(200);
  expect(res.body.results).toHaveLength(5);
  expect(res.body.results[0]).toEqual({ label: "Depot 0, Indonesia", lat: -6.2, lng: 106.8 });
  const url = new URL(String(fetcher.mock.calls[0]![0]));
  expect(`${url.origin}${url.pathname}`).toBe("https://photon.example/api/");
  expect(url.searchParams.get("q")).toBe("sample depot");
  expect(url.searchParams.get("limit")).toBe("5");
  expect(fetcher.mock.calls[0]![1].headers["User-Agent"]).toBe("Waybil/1.0");
});

it("answers 503 when Photon fails and checks the query and the role", async () => {
  const deps = testDeps();
  const token = await signedIn(deps, "shipper");
  const driver = await signedIn(deps, "driver");
  const fetcher = vi.fn().mockRejectedValue(new Error("down"));
  const app = createApp(
    deps,
    placeRoutes(deps, new Places(deps.store, "https://photon.example", fetcher)),
  );
  const search = (q: string, as = token) =>
    request(app).get(`/v1/places/search?q=${q}`).auth(as, { type: "bearer" });
  expect((await search("sample")).body.error.code).toBe("E_UNAVAILABLE");
  expect((await search("ab")).status).toBe(400);
  expect((await search("x".repeat(201))).status).toBe(400);
  expect((await search("sample", driver)).status).toBe(403);
});

it("limits address search to 30 requests a minute", async () => {
  const deps = testDeps();
  const token = await signedIn(deps, "shipper");
  const fetcher = vi.fn(async () => Response.json({ features: [] }));
  const app = createApp(
    deps,
    placeRoutes(deps, new Places(deps.store, "https://photon.example", fetcher)),
  );
  for (let i = 0; i < 30; i++)
    expect(
      (await request(app).get("/v1/places/search?q=sample").auth(token, { type: "bearer" })).status,
    ).toBe(200);
  const res = await request(app).get("/v1/places/search?q=sample").auth(token, { type: "bearer" });
  expect(res.status).toBe(429);
  expect(res.body.error.code).toBe("E_RATE_LIMIT");
});

it("saves places for a shipper and shows a warehouse only its accepted destinations", async () => {
  const deps = testDeps();
  const shipper = await signedIn(deps, "shipper");
  const warehouse = await signedIn(deps, "warehouse");
  const driver = await signedIn(deps, "driver");
  const app = createApp(deps, placeRoutes(deps, new Places(deps.store, "https://photon.example")));
  const post = (body: object, as = shipper) =>
    request(app).post("/v1/places").auth(as, { type: "bearer" }).send(body);
  const yard = await post(pickup);
  expect(yard.status).toBe(201);
  expect(yard.body.place).toMatchObject({ ...pickup, shipperId: "shipper.testnet" });
  const dock = (await post({ ...pickup, kind: "destination", name: "Dock" })).body.place;
  await post({ ...pickup, kind: "destination", name: "Unused" });
  expect((await post({ ...pickup, lat: 91 })).status).toBe(400);
  expect((await post({ ...pickup, name: "" })).status).toBe(400);
  expect((await post({ ...pickup, address: "x".repeat(301) })).status).toBe(400);
  expect((await post(pickup, warehouse)).status).toBe(403);

  const mine = await request(app).get("/v1/places").auth(shipper, { type: "bearer" });
  expect(mine.body.places).toHaveLength(3);

  for (const [code, placeId] of [
    ["c1", dock.id],
    ["c2", yard.body.place.id],
  ])
    await deps.store.insert("invites", code, {
      code,
      shipperId: "shipper.testnet",
      type: "warehouse",
      acceptedBy: "warehouse.testnet",
      placeId,
    });
  const theirs = await request(app).get("/v1/places").auth(warehouse, { type: "bearer" });
  expect(theirs.body.places.map((p: { id: string }) => p.id)).toEqual([dock.id]);
  expect((await request(app).get("/v1/places").auth(driver, { type: "bearer" })).status).toBe(403);
});

it("names the address at a moved pin and keeps the pin's own position", async () => {
  const deps = testDeps();
  const token = await signedIn(deps, "shipper");
  const driver = await signedIn(deps, "driver");
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        features: [
          {
            geometry: { coordinates: [106.81, -6.21] },
            properties: { name: "Sample Depot", city: "Bekasi", country: "Indonesia" },
          },
        ],
      }),
    )
    .mockResolvedValueOnce(Response.json({ features: [] }))
    .mockRejectedValueOnce(new Error("down"));
  const app = createApp(
    deps,
    placeRoutes(deps, new Places(deps.store, "https://photon.example/", fetcher)),
  );
  const reverse = (q: string, as = token) =>
    request(app).get(`/v1/places/reverse?${q}`).auth(as, { type: "bearer" });
  const found = await reverse("lat=-6.2&lng=106.8");
  expect(found.body).toEqual({
    result: { label: "Sample Depot, Bekasi, Indonesia", lat: -6.2, lng: 106.8 },
  });
  const url = fetcher.mock.calls[0]![0] as URL;
  expect(url.pathname).toBe("/reverse");
  expect(url.searchParams.get("lon")).toBe("106.8");
  expect((await reverse("lat=-6.2&lng=106.8")).body).toEqual({ result: null });
  expect((await reverse("lat=-6.2&lng=106.8")).body.error.code).toBe("E_UNAVAILABLE");
  expect((await reverse("lat=95&lng=106.8")).status).toBe(400);
  expect((await reverse("lat=-6.2&lng=106.8", driver)).status).toBe(403);
});
