/*
 * Places and trips for the map (docs/specs/backend-api.md, "Places and trips").
 * Coordinates are WGS84 degrees. Routes are GeoJSON, so each point is [lng, lat].
 */

export type PlaceKind = "pickup" | "destination";

/** A pickup point or a receiving address a shipper saved, with its pin on the map. */
export interface Place {
  id: string;
  shipperId: string;
  kind: PlaceKind;
  name: string;
  address: string;
  lat: number;
  lng: number;
  createdAt: string;
}

/** POST /v1/places */
export interface PlaceCreate {
  kind: PlaceKind;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/** One suggestion from GET /v1/places/search. */
export interface PlaceSuggestion {
  label: string;
  lat: number;
  lng: number;
}
export interface PlaceSearchResponse {
  results: PlaceSuggestion[];
}
/** GET /v1/places/reverse: the address at a pin, or null when there is none nearby. */
export interface PlaceReverseResponse {
  result: PlaceSuggestion | null;
}
export interface PlacesResponse {
  places: Place[];
}

export interface RouteLine {
  type: "LineString";
  coordinates: [number, number][];
}

/** The newest point a driver's phone sent while the truck was on the road. */
export interface TruckLocation {
  lat: number;
  lng: number;
  recordedAt: string;
  source: "gps" | "simulated";
}

/** PUT /v1/trips/:shipmentId, sent by the shipper right after the shipment is recorded. */
export interface TripCreate {
  pickupPlaceId: string;
}

/** POST /v1/trips/:shipmentId/location, sent by the driver's phone. */
export interface LocationUpdate {
  lat: number;
  lng: number;
  recordedAt?: string;
}

/** A shipment's journey: where it starts, where it goes, the road between and the truck. */
export interface Trip {
  shipmentId: number;
  shipperId: string;
  pickup: Place;
  destination: Place;
  route: RouteLine;
  /** "road" when a routing service drew it, "straight" when it fell back to a straight line. */
  routeSource: "road" | "straight";
  distanceKm: number;
  durationMin: number | null;
  lastLocation: TruckLocation | null;
  /** Demo only: the truck moves along the route from `startedAt` for `durationSec`. */
  simulation: { startedAt: string; durationSec: number } | null;
}
export interface TripsResponse {
  trips: Trip[];
}

/** A point older than this shows as "Location paused". */
export const LOCATION_STALE_MS = 10 * 60 * 1000;
/** The driver's phone sends at most one point in this time. */
export const LOCATION_EVERY_MS = 30 * 1000;
