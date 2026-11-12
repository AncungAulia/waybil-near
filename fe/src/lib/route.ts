import { LOCATION_STALE_MS, type Trip } from "@waybil/shared";

/* GeoJSON order: [lng, lat]. */
export type Point = [number, number];

const EARTH_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distance between two points on the earth, in km. */
export function km(a: Point, b: Point): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total length of a line, in km. */
export function lineKm(line: Point[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += km(line[i - 1]!, line[i]!);
  return total;
}

/** The point `distance` km along a line, clamped to its ends. */
export function along(line: Point[], distance: number): Point {
  if (line.length < 2 || distance <= 0) return line[0] ?? [0, 0];
  let left = distance;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const step = km(a, b);
    if (left <= step && step > 0) {
      const t = left / step;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    left -= step;
  }
  return line[line.length - 1]!;
}

/**
 * The part of the line the truck has already driven: the start of the line up to the point on
 * it nearest the truck. Flat projection is fine at the scale of one segment.
 */
export function travelled(line: Point[], truck: Point): Point[] {
  if (line.length < 2) return [];
  let best = { d: Infinity, i: 1, p: line[0]! };
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = dx * dx + dy * dy;
    const t = len
      ? Math.max(0, Math.min(1, ((truck[0] - a[0]) * dx + (truck[1] - a[1]) * dy) / len))
      : 0;
    const p: Point = [a[0] + dx * t, a[1] + dy * t];
    const d = km(p, truck);
    if (d < best.d) best = { d, i, p };
  }
  return [...line.slice(0, best.i), best.p];
}

export interface TruckOnMap {
  point: Point;
  /** No point for 10 minutes. The truck is drawn grey and the label says so. */
  stale: boolean;
  simulated: boolean;
  /** 0 to 1 along the route, when it can be told. */
  progress: number | null;
  recordedAt: string | null;
}

/** Where to draw the truck now: the demo simulation, else the newest point from the phone. */
export function truckNow(trip: Trip, now = Date.now()): TruckOnMap | null {
  const line = trip.route.coordinates;
  if (trip.simulation) {
    const started = Date.parse(trip.simulation.startedAt);
    const progress = Math.max(0, Math.min(1, (now - started) / 1000 / trip.simulation.durationSec));
    return {
      point: along(line, lineKm(line) * progress),
      stale: false,
      simulated: true,
      progress,
      recordedAt: null,
    };
  }
  const last = trip.lastLocation;
  if (!last) return null;
  const at = Date.parse(last.recordedAt);
  const point: Point = [last.lng, last.lat];
  const total = lineKm(line);
  return {
    point,
    stale: !Number.isFinite(at) || now - at > LOCATION_STALE_MS,
    simulated: last.source === "simulated",
    progress: total ? Math.min(1, lineKm(travelled(line, point)) / total) : null,
    recordedAt: last.recordedAt,
  };
}

/** Km left and the expected arrival, from the trip's distance and drive time. */
export function remaining(trip: Trip, truck: TruckOnMap | null) {
  const progress = truck?.progress ?? 0;
  const kmLeft = Math.max(0, trip.distanceKm * (1 - progress));
  const minutesLeft =
    trip.durationMin == null ? null : Math.max(0, trip.durationMin * (1 - progress));
  return {
    kmLeft,
    minutesLeft,
    arriving: progress >= 0.9 || (minutesLeft != null && minutesLeft < 10),
  };
}

/** Opens turn-by-turn directions to a place in Google Maps. */
export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}
