import { it, expect, vi } from "vitest";
import { haversineKm, planRoute } from "./routing";

const jakarta = { lat: -6.2, lng: 106.8167 };
const bandung = { lat: -6.9147, lng: 107.6098 };

it("measures a straight line with the haversine formula", () => {
  expect(haversineKm(jakarta, jakarta)).toBe(0);
  expect(haversineKm(jakarta, bandung)).toBeGreaterThan(115);
  expect(haversineKm(jakarta, bandung)).toBeLessThan(120);
});

it("keeps a straight line without a key and never calls the routing service", async () => {
  const fetcher = vi.fn();
  const plan = await planRoute(jakarta, bandung, undefined, fetcher);
  expect(fetcher).not.toHaveBeenCalled();
  expect(plan).toMatchObject({
    routeSource: "straight",
    durationMin: null,
    route: {
      type: "LineString",
      coordinates: [
        [106.8167, -6.2],
        [107.6098, -6.9147],
      ],
    },
  });
  expect(plan.distanceKm).toBe(Math.round(haversineKm(jakarta, bandung) * 10) / 10);
});

it("tries the truck profile, then the car profile, and sends the key", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response("busy", { status: 503 }))
    .mockResolvedValueOnce(
      Response.json({
        features: [
          {
            geometry: {
              type: "LineString",
              coordinates: [
                [106.8167, -6.2],
                [107.1, -6.5],
                [107.6098, -6.9147],
              ],
            },
            properties: { summary: { distance: 151234, duration: 10830 } },
          },
        ],
      }),
    );
  const plan = await planRoute(jakarta, bandung, "sample-key", fetcher);
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
    "https://api.openrouteservice.org/v2/directions/driving-hgv/geojson",
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
  ]);
  expect(fetcher.mock.calls[0]![1].headers.Authorization).toBe("sample-key");
  expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({
    coordinates: [
      [106.8167, -6.2],
      [107.6098, -6.9147],
    ],
  });
  expect(plan).toMatchObject({ routeSource: "road", distanceKm: 151.2, durationMin: 181 });
  expect(plan.route.coordinates).toHaveLength(3);
});

it("falls back to a straight line when both profiles fail or answer nonsense", async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("timeout"))
    .mockResolvedValueOnce(Response.json({ features: [{ geometry: { type: "Point" } }] }));
  const plan = await planRoute(jakarta, bandung, "sample-key", fetcher);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(plan.routeSource).toBe("straight");
  expect(plan.durationMin).toBeNull();
});
