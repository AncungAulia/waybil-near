"use client";
import { Truck } from "@phosphor-icons/react";
import { Money } from "@/components/elements/Money";
import { StatusPill } from "@/components/elements/StatusPill";
import { statusChip } from "@/lib/status";
import type { DemoShipmentRow } from "../data/fixtures";

export function ShipmentList({
  rows,
  onOpen,
  meta = "cargo",
}: {
  rows: DemoShipmentRow[];
  onOpen: (id: number) => void;
  /**
   * What the second line says after the number and the driver. The shipments page shows the
   * cargo and keeps the due date in its own column (P6). The home card shows the due date
   * on that line instead (P1).
   */
  meta?: "cargo" | "due";
}) {
  return (
    <div className="flex flex-col">
      {rows.map(({ shipment, city, driver, cargo, due }) => (
        <button
          type="button"
          disabled={shipment.status === "Cancelled"}
          key={shipment.id}
          onClick={() => onOpen(shipment.id)}
          className="press focus-ring flex w-full flex-wrap items-center gap-12 rounded-row p-16 text-left hover:bg-ds-canvas"
        >
          <span className="hidden size-40 shrink-0 place-items-center rounded-full bg-ds-canvas md:grid">
            <Truck size={18} />
          </span>
          <span className="min-w-140 flex-1">
            <span className="block text-body font-medium">Eastport to {city}</span>
            <span className="mt-4 block text-caption text-ds-muted">
              #{shipment.id} · {driver} · {meta === "due" ? due.replace(/^Due /, "due ") : cargo}
            </span>
          </span>
          <span className="flex flex-col items-end gap-6">
            <Money amount={shipment.bill} className="text-body font-medium" />
            <StatusPill status={statusChip(shipment)} />
            {meta === "cargo" && <span className="text-caption text-ds-muted">{due}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
