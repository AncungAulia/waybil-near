"use client";
import { useEffect, useState } from "react";
import type { PlacesResponse, Trip, TripsResponse } from "@waybil/shared";
import { api } from "@/lib/api";
import { truckNow, type TruckOnMap } from "@/lib/route";
import type { MapTrip } from "@/components/elements/RouteMap";
import { useLive } from "./useLive";

/** The shipper's saved places, or a warehouse's destinations. Reads again every 10 seconds. */
export function usePlaces(enabled = true) {
  return useLive(() => api<PlacesResponse>("/places"), enabled ? "places" : null, 10000);
}

/**
 * The trips for these shipments, read again every 10 seconds so the truck moves on screen.
 * Shipments recorded before maps existed have no trip and are simply left out.
 */
export function useTrips(ids: number[]) {
  const key = [...new Set(ids)].sort((a, b) => a - b).join(",");
  const live = useLive(
    () => api<TripsResponse>(`/trips?ids=${key}`).then((r) => r.trips),
    key || null,
    10000,
  );
  return { ...live, trips: live.data ?? [] };
}

/** Ticks once a second while a demo truck is moving, so it glides between reads. */
export function useClock(running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  return now;
}

/** A trip as RouteMap draws it, with the truck where it is now. */
export function toMapTrip(trip: Trip, now: number): MapTrip & { truckInfo: TruckOnMap | null } {
  const truck = truckNow(trip, now);
  return {
    id: trip.shipmentId,
    pickup: { lat: trip.pickup.lat, lng: trip.pickup.lng, name: trip.pickup.name },
    destination: {
      lat: trip.destination.lat,
      lng: trip.destination.lng,
      name: trip.destination.name,
    },
    route: trip.route.coordinates,
    truck: truck ? { point: truck.point, stale: truck.stale } : null,
    truckInfo: truck,
  };
}
