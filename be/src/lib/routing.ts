import type { RouteLine } from "@waybil/shared";

export interface Point {
  lat: number;
  lng: number;
}
export interface RoutePlan {
  route: RouteLine;
  routeSource: "road" | "straight";
  distanceKm: number;
  durationMin: number | null;
}
export type Fetcher = typeof fetch;

const ORS_URL = "https://api.openrouteservice.org/v2/directions";
const PROFILES = ["driving-hgv", "driving-car"] as const;

/** Great-circle distance in kilometres between two points. */
export function haversineKm(a: Point, b: Point): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const tenth = (value: number) => Math.round(value * 10) / 10;

export function straightLine(from: Point, to: Point): RoutePlan {
  return {
    route: {
      type: "LineString",
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    },
    routeSource: "straight",
    distanceKm: tenth(haversineKm(from, to)),
    durationMin: null,
  };
}

function validPosition(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  );
}

/**
 * The road between two points from OpenRouteService, truck profile first, then car. Without a
 * key, or when both fail, the plan is a straight line with its haversine distance. Coordinates
 * are never logged.
 */
export async function planRoute(
  from: Point,
  to: Point,
  apiKey: string | undefined,
  fetcher: Fetcher = fetch,
): Promise<RoutePlan> {
  if (!apiKey) return straightLine(from, to);
  for (const profile of PROFILES) {
    try {
      const response = await fetcher(`${ORS_URL}/${profile}/geojson`, {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
          Accept: "application/geo+json, application/json",
        },
        body: JSON.stringify({
          coordinates: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ],
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as {
        features?: Array<{
          geometry?: { type?: string; coordinates?: unknown };
          properties?: { summary?: { distance?: unknown; duration?: unknown } };
        }>;
      };
      const feature = payload.features?.[0];
      const coordinates = feature?.geometry?.coordinates;
      const summary = feature?.properties?.summary;
      if (
        feature?.geometry?.type !== "LineString" ||
        !Array.isArray(coordinates) ||
        coordinates.length < 2 ||
        !coordinates.every(validPosition) ||
        typeof summary?.distance !== "number" ||
        typeof summary.duration !== "number" ||
        !Number.isFinite(summary.distance) ||
        !Number.isFinite(summary.duration)
      )
        continue;
      return {
        route: {
          type: "LineString",
          coordinates: coordinates.map(([lng, lat]) => [lng, lat] as [number, number]),
        },
        routeSource: "road",
        distanceKm: tenth(summary.distance / 1000),
        durationMin: Math.round(summary.duration / 60),
      };
    } catch {
      continue;
    }
  }
  return straightLine(from, to);
}
