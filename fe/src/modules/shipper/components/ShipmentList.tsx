"use client";

import { Truck } from "@phosphor-icons/react";
import { Money } from "@/components/elements/Money";
import { StatusPill } from "@/components/elements/StatusPill";
import { statusChip } from "@/lib/status";
import { cn } from "@/lib/cn";
import type { DemoShipmentRow } from "../data/fixtures";

const COLUMNS = "xl:grid xl:grid-cols-[minmax(0,1fr)_150px_140px_160px] xl:items-center";
const CHIP = "gap-6 px-11 py-6 text-[12px] leading-[15px] [&>span]:size-7";

export function ShipmentList({
  rows,
  onOpen,
  meta = "cargo",
}: {
  rows: DemoShipmentRow[];
  onOpen: (id: number) => void;
  meta?: "cargo" | "due";
}) {
  if (meta === "cargo") {
    return (
      <section aria-label="Shipments" className="flex flex-col rounded-card bg-ds-bg px-20 py-8">
        <div
          className={cn("hidden gap-16 py-12 text-[12.5px] leading-[15px] text-ds-muted", COLUMNS)}
        >
          <span>Shipment</span>
          <span>Status</span>
          <span>Fee</span>
          <span>Bill</span>
        </div>
        {rows.map(({ shipment, route, city, driver, cargo, due }) => (
          <button
            type="button"
            disabled={shipment.status === "Cancelled"}
            key={shipment.id}
            onClick={() => onOpen(shipment.id)}
            className={cn(
              "tap focus-ring flex w-full items-center gap-16 rounded-[16px] py-14 text-left hover:bg-ds-canvas",
              COLUMNS,
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-12">
              <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-canvas">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 3h14v14H1zM15 8h4l3 4v5h-7M1 17h2m4 0h9m4 0h2" />
                  <circle cx="5" cy="17" r="2" />
                  <circle cx="18" cy="17" r="2" />
                </svg>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="truncate text-[15px] leading-[18px] font-medium">
                  {route ?? `Eastport to ${city}`}
                </span>
                <span className="text-[12.5px] leading-[17px] text-ds-muted">
                  {driver} carries {cargo} on #{shipment.id}.
                </span>
              </span>
            </span>
            <span className="hidden xl:block">
              <StatusPill className={CHIP} status={statusChip(shipment)} />
            </span>
            <span className="hidden xl:block">
              <Money amount={shipment.bill} className="text-[14px] leading-[17px] font-medium" />
            </span>
            <span
              className={cn(
                "hidden text-[13.5px] leading-[16px] xl:block",
                due.startsWith("Due in") ? "font-medium text-ds-warning" : "text-ds-ink-2",
              )}
            >
              {due}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-6 xl:hidden">
              <Money amount={shipment.bill} className="text-[14px] leading-[17px] font-medium" />
              <StatusPill className={CHIP} status={statusChip(shipment)} />
            </span>
          </button>
        ))}
      </section>
    );
  }

  return (
    <div className="flex flex-col">
      {rows.map(({ shipment, route, city, driver, due }) => (
        <button
          type="button"
          disabled={shipment.status === "Cancelled"}
          key={shipment.id}
          onClick={() => onOpen(shipment.id)}
          className="tap focus-ring flex w-full flex-wrap items-center gap-12 rounded-row p-16 text-left hover:bg-ds-canvas"
        >
          <span className="flex min-w-140 flex-1 items-center gap-12">
            <span className="hidden size-40 shrink-0 place-items-center rounded-full bg-ds-canvas md:grid">
              <Truck size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-medium">{route ?? `Eastport to ${city}`}</span>
              <span className="mt-4 block text-[12.5px] text-ds-muted">
                {driver} drives #{shipment.id}. {due.charAt(0).toUpperCase() + due.slice(1)}.
              </span>
            </span>
          </span>
          <span className="flex flex-col items-end gap-6">
            <Money amount={shipment.bill} className="text-body font-medium" />
            <StatusPill status={statusChip(shipment)} />
          </span>
        </button>
      ))}
    </div>
  );
}
