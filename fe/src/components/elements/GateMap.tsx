"use client";
import { useRef, useState } from "react";
import { MapPin } from "@phosphor-icons/react";
import { DemoMap } from "./DemoMap";

/** A movable pin in the design's fictional map. Backend coordinates replace this demo position. */
export function GateMap() {
  const root = useRef<HTMLDivElement>(null),
    dragging = useRef(false);
  const [pin, setPin] = useState({ x: 65, y: 50 });
  const bound = (x: number) => Math.max(5, Math.min(95, x));
  return (
    <div ref={root} className="relative overflow-hidden rounded-row">
      <DemoMap empty label="Drop-off gate" className="h-200" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ transform: `translate(${pin.x}%,${pin.y}%)` }}
      >
        <button
          type="button"
          aria-label="Move the drop-off gate pin"
          className="focus-ring pointer-events-auto grid size-40 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-full border-3 border-ds-bg bg-ds-ink text-ds-brand"
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const rect = root.current?.getBoundingClientRect();
            if (rect && dragging.current)
              setPin({
                x: bound(((e.clientX - rect.left) / rect.width) * 100),
                y: bound(((e.clientY - rect.top) / rect.height) * 100),
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
          <MapPin size={22} weight="fill" />
        </button>
      </div>
    </div>
  );
}
