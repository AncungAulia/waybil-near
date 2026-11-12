import { describe, expect, it } from "vitest";
import type { Trip } from "@waybil/shared";
import { along, km, lineKm, remaining, travelled, truckNow, type Point } from "./route";

const line: Point[] = [
  [106.8, -6.2],
  [107.0, -6.2],
  [107.2, -6.3],
];
const place = {
  id: "p",
  shipperId: "s",
  kind: "pickup" as const,
  name: "",
  address: "",
  createdAt: "",
};
const trip = (over: Partial<Trip> = {}): Trip => ({
  shipmentId: 1,
  shipperId: "s",
  pickup: { ...place, lat: -6.2, lng: 106.8 },
  destination: { ...place, kind: "destination", lat: -6.3, lng: 107.2 },
  route: { type: "LineString", coordinates: line },
  routeSource: "road",
  distanceKm: 50,
  durationMin: 60,
  lastLocation: null,
  simulation: null,
  ...over,
});

describe("route", () => {
  it("measures and walks a line", () => {
    expect(km([0, 0], [0, 1])).toBeCloseTo(111.19, 1);
    const total = lineKm(line);
    expect(along(line, 0)).toEqual(line[0]);
    expect(along(line, total + 5)).toEqual(line[2]);
    expect(along(line, km(line[0]!, line[1]!))[0]).toBeCloseTo(107.0, 5);
  });

  it("cuts the driven part at the point nearest the truck", () => {
    const cut = travelled(line, [106.9, -6.21]);
    expect(cut).toHaveLength(2);
    expect(cut[1]![0]).toBeCloseTo(106.9, 3);
  });

  it("places the truck from the simulation or the phone, and marks old points", () => {
    const now = Date.parse("2026-11-12T10:00:00Z");
    const half = trip({ simulation: { startedAt: "2026-11-12T09:58:30Z", durationSec: 180 } });
    expect(truckNow(half, now)?.progress).toBeCloseTo(0.5, 5);
    const old = trip({
      lastLocation: { lat: -6.2, lng: 107.0, recordedAt: "2026-11-12T09:40:00Z", source: "gps" },
    });
    expect(truckNow(old, now)?.stale).toBe(true);
    expect(truckNow(trip(), now)).toBeNull();
    expect(remaining(half, truckNow(half, now)).kmLeft).toBeCloseTo(25, 5);
  });
});
