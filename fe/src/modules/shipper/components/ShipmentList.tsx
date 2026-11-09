"use client";
import { Truck } from "@phosphor-icons/react";
import { Money } from "@/components/elements/Money";
import { StatusPill } from "@/components/elements/StatusPill";
import { statusChip } from "@/lib/status";
import type { DemoShipmentRow } from "../data/fixtures";

/* The four columns P6 draws above the rows. The home card (P1) has no header. */
const COLUMNS = "md:grid md:grid-cols-[minmax(0,1fr)_160px_160px_160px] md:items-center";

export function ShipmentList({
  rows,
  onOpen,
  meta = "cargo",
}: {
  rows: DemoShipmentRow[];
  onOpen: (id: number) => void;
  /**
   * What the second line says after the number and the driver. The shipments page shows the
   * cargo and keeps the status, fee and bill in their own columns (P6). The home card shows
   * the due date on that line and stacks the rest (P1).
   */
  meta?: "cargo" | "due";
}) {
  const table = meta === "cargo";
  return (
    <div className="flex flex-col">
      {table && (
        <div className={`hidden px-16 pb-8 text-[12.5px] text-ds-muted ${COLUMNS}`}>
          <span>Shipment</span>
          <span>Status</span>
          <span>Fee</span>
          <span>Bill</span>
        </div>
      )}
      {rows.map(({ shipment, city, driver, cargo, due }) => (
        <button
          type="button"
          disabled={shipment.status === "Cancelled"}
          key={shipment.id}
          onClick={() => onOpen(shipment.id)}
          className={`press focus-ring w-full rounded-row p-16 text-left hover:bg-ds-canvas ${
            table
              ? `flex flex-wrap items-center gap-12 ${COLUMNS}`
              : "flex flex-wrap items-center gap-12"
          }`}
        >
          <span className="flex min-w-140 flex-1 items-center gap-12">
            <span className="hidden size-40 shrink-0 place-items-center rounded-full bg-ds-canvas md:grid">
              <Truck size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium">Eastport to {city}</span>
              <span className="mt-4 block text-[12.5px] text-ds-muted">
                #{shipment.id} · {driver} · {meta === "due" ? due.replace(/^Due /, "due ") : cargo}
              </span>
            </span>
          </span>
          {table ? (
            <>
              <StatusPill status={statusChip(shipment)} />
              <Money amount={shipment.bill} className="text-[14px] font-medium" />
              {/* A bill due in days is drawn in the board's warning colour. */}
              <span
                className={`text-[13.5px] ${due.startsWith("Due in") ? "text-ds-warning" : "text-ds-ink-2"}`}
              >
                {due}
              </span>
            </>
          ) : (
            <span className="flex flex-col items-end gap-6">
              <Money amount={shipment.bill} className="text-body font-medium" />
              <StatusPill status={statusChip(shipment)} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
