"use client";
import { Truck } from "@phosphor-icons/react";
import { Money } from "@/components/elements/Money";
import { StatusPill } from "@/components/elements/StatusPill";
import { statusChip } from "@/lib/status";
import type { DemoShipmentRow } from "../data/fixtures";
import { cn } from "@/lib/cn";

export function ShipmentList({
  rows,
  onOpen,
}: {
  rows: DemoShipmentRow[];
  onOpen: (id: number) => void;
}) {
  return (
    <div className="flex flex-col">
      {rows.map(({ shipment, city, driver, cargo, due }) => (
        <button
          type="button"
          disabled={shipment.status === "Cancelled"}
          key={shipment.id}
          onClick={() => onOpen(shipment.id)}
          className={cn(
            "press focus-ring flex w-full flex-wrap items-center gap-12 rounded-row p-16 text-left hover:bg-ds-canvas",
            shipment.id === 1039 && "bg-ds-brand-soft/40",
          )}
        >
          <span className="hidden size-40 shrink-0 place-items-center rounded-full bg-ds-canvas md:grid">
            <Truck size={18} />
          </span>
          <span className="min-w-140 flex-1">
            <span className="block text-body font-medium">Eastport to {city}</span>
            <span className="mt-4 block text-caption text-ds-muted">
              #{shipment.id} · {driver} · {cargo}
            </span>
          </span>
          <span className="flex flex-col items-end gap-6">
            <Money amount={shipment.bill} className="text-body font-medium" />
            <StatusPill status={statusChip(shipment)} />
            <span className="text-caption text-ds-muted">{due}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
