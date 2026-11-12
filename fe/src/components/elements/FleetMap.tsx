"use client";
import type { Shipment } from "@waybil/shared";
import { toMapTrip, useClock, useTrips } from "@/hooks/useTrips";
import { RouteMap } from "./RouteMap";

/**
 * Every truck on the road for this shipper on one map. With none on the road the map stays,
 * faded, under a short note, so the home screen keeps its shape.
 */
export function FleetMap({ shipments }: { shipments: Shipment[] }) {
  const moving = shipments.filter((s) => s.status === "PickedUp");
  const { trips } = useTrips(moving.map((s) => s.id));
  const now = useClock(trips.some((t) => t.simulation));
  const views = trips.map((t) => toMapTrip(t, now));
  const simulated = views.some((v) => v.truckInfo?.simulated);
  const count = views.length;
  return (
    <section className="flex flex-col gap-12 rounded-card bg-ds-bg p-20 md:p-28">
      <div className="flex items-center justify-between gap-12">
        <h2 className="text-heading font-medium">On the road</h2>
        {count > 0 && (
          <span className="flex items-center gap-6 rounded-full bg-ds-success-soft px-10 py-4 text-caption font-medium text-ds-success">
            <span aria-hidden className="size-6 rounded-full bg-ds-success" />
            {count} {count === 1 ? "truck" : "trucks"} moving
          </span>
        )}
      </div>
      <RouteMap
        trips={views}
        dim={count === 0}
        badge={simulated ? "Simulated location for the demo" : undefined}
        overlay={
          count === 0 ? (
            <p className="rounded-full bg-ds-bg px-14 py-8 text-label">
              No trucks on the road yet.
            </p>
          ) : undefined
        }
        className="h-260 w-full md:h-400"
      />
    </section>
  );
}
