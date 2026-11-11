"use client";

import { useState } from "react";
import { Minus, Plus } from "@phosphor-icons/react";

/** The Warehouse board's map crops include both routes and the truck arrival labels. */
export function WarehouseMap({ arriving = false }: { arriving?: boolean }) {
  const [zoom, setZoom] = useState(1);
  return (
    <section className="warehouse-map-card flex flex-col gap-12 rounded-card bg-ds-bg p-14 md:p-18">
      <h2 className="text-[18px] leading-22 font-medium">Heading to Harbor Hub</h2>
      <div
        role="region"
        aria-label={`Two trucks heading to Harbor Hub. Sam arrives in ${arriving ? "5 minutes" : "1 hour 20 minutes"}. Jordan Lee arrives in 2 hours 40 minutes.`}
        className="warehouse-map relative h-260 overflow-hidden rounded-row md:h-360 lg:h-420"
      >
        <picture className="block size-full" style={{ transform: `scale(${zoom})` }}>
          <source
            media="(min-width: 1024px)"
            srcSet={`/illustrations/warehouse/${arriving ? "arriving-desktop" : "arrivals-desktop"}.svg`}
          />
          <source
            media="(min-width: 768px)"
            srcSet={`/illustrations/warehouse/${arriving ? "arriving-tablet" : "arrivals-tablet"}.svg`}
          />
          <img src="/illustrations/warehouse/arrivals-mobile.svg" alt="" className="size-full" />
        </picture>
        <div
          className={`warehouse-map-zoom absolute ${arriving ? "top-16 right-12 lg:top-auto lg:right-20 lg:bottom-32" : "top-16 right-20"} flex flex-col overflow-hidden rounded-small bg-ds-bg shadow-md`}
        >
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= 2.5}
            onClick={() => setZoom(Math.min(2.5, zoom + 0.25))}
            className="press focus-ring grid size-36 place-items-center disabled:text-ds-muted"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= 1}
            onClick={() => setZoom(Math.max(1, zoom - 0.25))}
            className="press focus-ring grid size-36 place-items-center disabled:text-ds-muted"
          >
            <Minus size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
