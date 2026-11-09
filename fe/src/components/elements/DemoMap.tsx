"use client";
import { useState } from "react";
import { Truck, Warehouse, Plus, Minus } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

type Phase = "pickup" | "road" | "arrived" | "planned";
/** Vector geography and route exported from the design. This is a fixture, not live location data. */
export function DemoMap({
  label = "Sharing location",
  className,
  twoTrucks = false,
  empty = false,
  phase = "road",
  controls = false,
}: {
  label?: string;
  className?: string;
  twoTrucks?: boolean;
  empty?: boolean;
  phase?: Phase;
  controls?: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const position = (x: number, y: number) => ({
    left: `calc(50% + ${x / 944 - 0.5} * max(100cqw, 168.571cqh))`,
    top: `calc(50% + ${y / 560 - 0.5} * max(100cqh, 59.322cqw))`,
    transform: `translate(-50%, -50%) scale(${1 / zoom})`,
  });
  const truck =
    phase === "pickup" ? [346, 463] : phase === "arrived" ? [568, 140] : [459.1164, 242.744];
  /*
   * The board paints the travelled leg yellow and the rest grey, so a trip that has not left
   * is all grey and an arrived one is all yellow.
   */
  const asset = empty
    ? "demo-map.svg"
    : phase === "pickup"
      ? "demo-route-waiting.svg"
      : phase === "planned" || phase === "arrived"
        ? "demo-route-planned.svg"
        : "demo-route.svg";
  return (
    <div
      role={controls ? "region" : "img"}
      aria-label={`Demo route from Eastport to Harbor Hub. ${label}.`}
      style={{ containerType: "size" }}
      className={cn("relative h-290 overflow-hidden rounded-[24px] bg-ds-surface-3", className)}
    >
      <div className="absolute inset-0" style={{ transform: `scale(${zoom})` }}>
        <img src={`/illustrations/${asset}`} alt="" className="absolute size-full object-cover" />
        {!empty && (
          <>
            <span
              style={position(346, 463)}
              className="absolute size-16 rounded-full border-3 border-ds-bg bg-ds-ink"
            />
            <span
              style={position(598, 97)}
              className="absolute grid size-32 place-items-center rounded-small border-3 border-ds-bg bg-ds-ink text-ds-bg"
            >
              <Warehouse size={16} />
            </span>
            {phase !== "planned" && (
              <span
                style={position(truck[0]!, truck[1]!)}
                className="absolute grid size-44 place-items-center rounded-full border-3 border-ds-bg bg-ds-ink text-ds-brand ring-12 ring-ds-brand/30"
              >
                <Truck size={20} />
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
      <span className="absolute top-16 left-16 z-10 flex max-w-[calc(100%-80px)] items-center gap-8 rounded-full bg-ds-bg px-12 py-8 text-caption">
        <span className="size-8 shrink-0 rounded-full bg-ds-success" />
        <span className="truncate">{label}</span>
      </span>
      {controls && (
        <div className="absolute top-16 right-16 z-10 flex flex-col overflow-hidden rounded-small bg-ds-bg">
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= 2.5}
            className="press focus-ring grid size-36 place-items-center disabled:text-ds-muted"
            onClick={() => setZoom(Math.min(2.5, zoom + 0.25))}
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= 1}
            className="press focus-ring grid size-36 place-items-center disabled:text-ds-muted"
            onClick={() => setZoom(Math.max(1, zoom - 0.25))}
          >
            <Minus size={16} />
          </button>
        </div>
      )}
      <span className="absolute right-12 bottom-8 text-[10px] text-ds-muted">
        Demo map · © OpenStreetMap
      </span>
    </div>
  );
}
