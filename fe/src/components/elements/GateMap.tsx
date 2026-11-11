"use client";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { MapPin } from "@phosphor-icons/react";
import { DemoMap } from "./DemoMap";

/** A movable pin in the design's fictional map. Backend coordinates replace this demo position. */
export function GateMap({ appearance }: { appearance?: "destination" }) {
  const destination = appearance === "destination";
  const root = useRef<HTMLDivElement>(null),
    dragging = useRef(false);
  const [pin, setPin] = useState({ x: destination ? 50 : 65, y: 50 });
  const bound = (x: number) => Math.max(5, Math.min(95, x));
  return (
    <div
      ref={root}
      className={cn(
        "relative overflow-hidden rounded-row",
        destination && "shrink-0 rounded-[18px]",
      )}
    >
      <DemoMap
        empty
        label={destination ? null : "Drop-off gate"}
        controls={destination}
        background={destination ? "gate" : undefined}
        className={cn("h-200", destination && "rounded-[18px] md:h-240")}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={
          destination
            ? { left: `${pin.x}%`, top: `calc(${pin.y}% - 12px)` }
            : { transform: `translate(${pin.x}%,${pin.y}%)` }
        }
      >
        <button
          type="button"
          aria-label="Move the drop-off gate pin"
          className={cn(
            "focus-ring pointer-events-auto grid size-40 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-full border-3 border-ds-bg bg-ds-ink text-ds-brand",
            destination && "flex h-44 w-36 flex-col rounded-none border-0 bg-transparent",
          )}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const rect = root.current?.getBoundingClientRect();
            if (rect && dragging.current)
              setPin({
                x: bound(((e.clientX - rect.left) / rect.width) * 100),
                y: bound(((e.clientY - rect.top + (destination ? 12 : 0)) / rect.height) * 100),
              });
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
          onKeyDown={(e) => {
            const directions: Record<string, [number, number]> = {
              ArrowLeft: [-2, 0],
              ArrowRight: [2, 0],
              ArrowUp: [0, -2],
              ArrowDown: [0, 2],
            };
            const delta = directions[e.key];
            if (delta) {
              e.preventDefault();
              setPin({ x: bound(pin.x + delta[0]), y: bound(pin.y + delta[1]) });
            }
          }}
        >
          {destination ? (
            <>
              <span className="grid size-36 shrink-0 place-items-center rounded-full border-3 border-ds-bg bg-ds-ink">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 21V7l9-4 9 4v14M3 21h18M7 21V11h10v10M7 15h10M7 18h10" />
                </svg>
              </span>
              <span className="h-8 w-3 shrink-0 bg-ds-ink" />
            </>
          ) : (
            <MapPin size={22} weight="fill" />
          )}
        </button>
      </div>
    </div>
  );
}
