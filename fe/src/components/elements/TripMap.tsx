"use client";
import type { Shipment, Trip } from "@waybil/shared";
import { remaining } from "@/lib/route";
import { cn } from "@/lib/cn";
import { toMapTrip, useClock } from "@/hooks/useTrips";
import { RouteMap } from "./RouteMap";

/**
 * One shipment's map: the road from pickup to destination and, while it is on the road, the
 * truck and how far it still has to go. Nothing shows for a shipment that has no trip.
 */
export function TripMap({
  trip,
  status,
  className,
  caption = true,
}: {
  trip: Trip | undefined;
  status: Shipment["status"];
  className?: string;
  /** False when the screen shows the distance and time itself, around the map. */
  caption?: boolean;
}) {
  const onRoad = status === "PickedUp";
  const now = useClock(onRoad && !!trip?.simulation);
  if (!trip) return null;
  const view = toMapTrip(trip, now);
  const truck = onRoad ? view.truckInfo : null;
  const left = remaining(trip, truck);
  const chip = onRoad
    ? !truck
      ? "Waiting for the driver's location"
      : truck.stale
        ? "Location paused"
        : left.arriving
          ? "Arriving soon"
          : "On the road"
    : status === "Approved"
      ? trip.routeSource === "road"
        ? "Route preview"
        : "Direct route preview"
      : status === "Cancelled"
        ? "Cancelled before pickup"
        : "Arrived";
  /* One short sentence, for example "12 km left, about 20 min to go." */
  const facts = onRoad
    ? `${Math.round(left.kmLeft)} km left${left.minutesLeft != null ? `, about ${eta(left.minutesLeft)} to go` : ""}.`
    : `The trip is ${Math.round(trip.distanceKm)} km${trip.durationMin != null ? `, about ${eta(trip.durationMin)} by road` : ""}.`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <RouteMap
        trips={[{ ...view, truck: truck ? view.truck : null }]}
        chip={chip}
        badge={truck?.simulated ? "Simulated location for the demo" : undefined}
        className={cn("h-260 w-full md:h-360", className)}
      />
      {caption && (
        <div>
          <p className="text-caption text-ds-muted">
            {trip.pickup.name} to {trip.destination.name}
          </p>
          <p className="text-caption text-ds-muted">{facts}</p>
        </div>
      )}
    </div>
  );
}

function eta(minutes: number) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}
