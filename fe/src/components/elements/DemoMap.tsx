"use client";
import { useState } from "react";
import { Truck, Warehouse, Plus, Minus } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/** `cancelled` keeps the grey route of a trip that never left, with no truck on it. */
type Phase = "pickup" | "road" | "arrived" | "planned" | "cancelled";
/** Vector geography and route exported from the design. This is a fixture, not live location data. */
export function DemoMap({
  label = "Sharing location",
  className,
  twoTrucks = false,
  empty = false,
  phase = "road",
  controls = false,
  truckLabel,
  paused = false,
  appearance,
  background,
  zoom: initialZoom = 1,
  origin = "Eastport",
  destination = "Harbor Hub",
}: {
  /** The pill in the top left corner. `null` drops it, the way the planned route on P2 is drawn. */
  label?: string | null;
  className?: string;
  twoTrucks?: boolean;
  empty?: boolean;
  phase?: Phase;
  controls?: boolean;
  paused?: boolean;
  appearance?: "shipment";
  background?: "gate";
  truckLabel?: { shipmentId: number; distance: string };
  /** How close the board holds the map. The planned route on P2 sits at 1.435. */
  zoom?: number;
  /** Where the route starts, read out to screen readers. */
  origin?: string;
  /** Where the route ends, read out to screen readers. */
  destination?: string;
}) {
  const [zoom, setZoom] = useState(initialZoom);
  const position = (x: number, y: number) => ({
    left: `calc(50% + ${x / 944 - 0.5} * max(100cqw, 168.571cqh))`,
    top: `calc(50% + ${y / 560 - 0.5} * max(100cqh, 59.322cqw))`,
    transform: `translate(-50%, -50%) scale(${1 / zoom})`,
  });
  /* Once the trip has arrived the truck stands on the warehouse, so only two marks show. */
  const truck =
    phase === "pickup"
      ? [346, 463]
      : phase === "arrived"
        ? [598, 97]
        : paused
          ? [410.18696, 302.70087]
          : [459.1164, 242.744];
  /*
   * The board paints the travelled leg yellow and the rest grey, so a trip that has not left
   * is all grey and an arrived one is all yellow.
   */
  const asset =
    background === "gate"
      ? "network/gate-base.svg"
      : empty
        ? "demo-map.svg"
        : phase === "pickup" || phase === "cancelled"
          ? "demo-route-waiting.svg"
          : phase === "planned" || phase === "arrived"
            ? "demo-route-planned.svg"
            : paused
              ? "demo-route-paused.svg"
              : "demo-route.svg";
  return (
    <div
      role={controls ? "region" : "img"}
      aria-label={`${empty ? "Demo map." : `Demo route from ${origin} to ${destination}.`}${label ? ` ${label}.` : ""}`}
      style={{ containerType: "size" }}
      className={cn("relative h-290 overflow-hidden rounded-[24px] bg-ds-surface-3", className)}
    >
      <div className="absolute inset-0" style={{ transform: `scale(${zoom})` }}>
        <img
          src={`/illustrations/${asset}`}
          alt=""
          className={cn(
            "absolute size-full object-cover",
            background === "gate" &&
              "top-[-4px] left-[calc(50%-600px)] h-600 w-960 max-w-none object-fill md:top-16",
          )}
        />
        {!empty && (
          <>
            <span
              style={position(346, 463)}
              className="absolute size-16 rounded-full border-3 border-ds-bg bg-ds-ink"
            />
            {phase !== "arrived" && (
              <span
                style={position(598, 97)}
                className={cn(
                  "absolute grid size-32 place-items-center rounded-small border-3 border-ds-bg bg-ds-ink text-ds-bg",
                  appearance === "shipment" && "size-30 rounded-[10px]",
                )}
              >
                <Warehouse size={appearance === "shipment" ? 15 : 16} />
              </span>
            )}
            {phase !== "planned" && phase !== "cancelled" && (
              <span
                style={position(truck[0]!, truck[1]!)}
                className={cn(
                  "absolute grid size-44 place-items-center rounded-full border-3 border-ds-bg ring-12 ring-ds-brand/30",
                  paused ? "size-40 bg-ds-map-paused text-ds-bg" : "bg-ds-ink text-ds-brand",
                  appearance === "shipment" && "size-40 ring-14 ring-ds-brand/25",
                )}
              >
                <Truck size={appearance === "shipment" ? 18 : 20} />
              </span>
            )}
            {(truckLabel || paused) && phase === "road" && (
              <span style={position(truck[0]!, truck[1]!)} className="absolute hidden md:block">
                <span className="absolute top-[-17px] left-26 flex w-max items-center gap-6 rounded-full bg-ds-bg px-12 py-7 shadow-float">
                  <span className="text-[12.5px] font-medium text-ds-ink">
                    {paused ? "Last seen 25 min ago" : `#${truckLabel?.shipmentId}`}
                  </span>
                  <span className="text-[12px] text-ds-muted">
                    {paused ? "near Oakdale" : truckLabel?.distance}
                  </span>
                </span>
              </span>
            )}
            {twoTrucks && (
              <span
                style={position(420, 463)}
                className="absolute grid size-40 place-items-center rounded-full border-3 border-ds-bg bg-ds-ink text-ds-brand"
              >
                <Truck size={18} />
              </span>
            )}
          </>
        )}
      </div>
      {label && (
        <span
          className={cn(
            "absolute top-16 left-16 z-10 flex max-w-[calc(100%-80px)] items-center gap-8 rounded-full bg-ds-bg px-12 py-8 text-caption",
            appearance === "shipment" && "text-[12.5px] leading-[1.2] font-medium shadow-float",
          )}
        >
          <span
            className={cn(
              "size-8 shrink-0 rounded-full",
              paused
                ? "bg-ds-warning"
                : phase === "cancelled"
                  ? "bg-ds-line-strong"
                  : appearance === "shipment" && phase !== "road"
                    ? "bg-ds-muted"
                    : "bg-ds-success",
            )}
          />
          <span className="truncate">{label}</span>
        </span>
      )}
      {controls && (
        /*
         * No `overflow-hidden` here: it would clip the focus ring. Each button rounds its own
         * outer corners instead, so the ring follows the control's shape.
         */
        <div className="absolute top-16 right-16 z-10 flex flex-col rounded-small bg-ds-bg">
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= 2.5}
            className="press focus-ring grid size-36 place-items-center rounded-t-small disabled:text-ds-muted"
            onClick={() => setZoom(Math.min(2.5, zoom + 0.25))}
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= 1}
            className="press focus-ring grid size-36 place-items-center rounded-b-small disabled:text-ds-muted"
            onClick={() => setZoom(Math.max(1, zoom - 0.25))}
          >
            <Minus size={16} />
          </button>
        </div>
      )}
      <span className="absolute right-12 bottom-8 text-[10px] text-ds-off-ink">
        © OpenStreetMap
      </span>
    </div>
  );
}
