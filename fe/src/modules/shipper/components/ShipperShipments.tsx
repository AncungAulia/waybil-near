"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { ShipmentList } from "./ShipmentList";
import { cn } from "@/lib/cn";
import type { DemoShipmentRow, ShipperState } from "../data/fixtures";

const FILTERS = ["All", "On the road", "Bills due", "Done"] as const;
type Filter = (typeof FILTERS)[number];

function matchesFilter(row: DemoShipmentRow, filter: Filter) {
  return (
    filter === "All" ||
    row.shipment.status ===
      ({ "On the road": "PickedUp", "Bills due": "Paid", Done: "Repaid" } as const)[filter]
  );
}

export function ShipperShipments({
  state,
  rows,
  go,
  onOpen,
  recorded,
}: {
  state: ShipperState;
  rows: DemoShipmentRow[];
  go: (state: ShipperState) => void;
  onOpen: (id: number) => void;
  recorded?: string;
}) {
  const [filter, setFilter] = useState<Filter>(state === "P6.2" ? "Bills due" : "All");
  const [search, setSearch] = useState(state === "P6.3" ? "Lakeside" : "");
  const query = search.trim().toLowerCase().replace(/^#/, "");
  const filtered = rows.filter(
    (row) =>
      matchesFilter(row, filter) &&
      `${row.city} ${row.driver} ${row.shipment.id} ${row.cargo}`.toLowerCase().includes(query),
  );
  const clear = () => {
    setSearch("");
    setFilter("All");
    go("P6.1");
  };

  return (
    <>
      <div className="mb-16 flex items-center justify-between gap-12 md:mb-24 md:items-end">
        <div>
          <h1 className="text-[30px] leading-[32px] font-medium tracking-[-0.03em] md:text-[40px] md:leading-[42px]">
            Shipments
          </h1>
          <p className="mt-6 hidden text-[14px] leading-[17px] text-ds-muted md:block">
            Everything you approved, newest first
          </p>
        </div>
        <Button
          aria-label="New shipment"
          className="h-52 w-120 shrink-0 text-[15px] md:w-220"
          icon={<ListGlyph kind="plus" size={17} />}
          onClick={() => go("P2.1")}
        >
          <span className="md:hidden">New</span>
          <span className="hidden md:inline">New shipment</span>
        </Button>
      </div>
      <div className="mb-16 flex flex-col items-start justify-between gap-12 md:mb-24 md:flex-row md:items-center">
        <div
          role="group"
          aria-label="Filter shipments"
          className="flex h-40 gap-6 rounded-full bg-ds-bg p-4"
        >
          {FILTERS.map((label) => (
            <button
              type="button"
              key={label}
              aria-pressed={filter === label}
              onClick={() => {
                setFilter(label);
                if (state === "P6.4") go("P6.1");
              }}
              className={cn(
                "tap focus-ring inline-flex items-center gap-6 rounded-full px-10 py-8 text-[13px] leading-[16px] font-medium md:px-14",
                label === "Done" && "hidden md:inline-flex",
                filter === label
                  ? "bg-ds-ink text-ds-bg"
                  : "text-ds-ink-2 hover:bg-ds-canvas hover:text-ds-ink",
              )}
            >
              {label}
              <span
                className={cn(
                  "text-[12px] leading-[15px] font-normal",
                  filter === label ? "text-ds-filter-count" : "text-ds-muted",
                )}
              >
                {rows.filter((row) => matchesFilter(row, label)).length}
              </span>
            </button>
          ))}
        </div>
        <label
          className={cn(
            "flex h-44 w-full items-center gap-10 rounded-full border-[1.5px] border-transparent bg-ds-bg px-16 transition-colors duration-150 ease-base has-[:focus]:border-ds-ink md:w-280",
            search && "border-ds-ink",
          )}
        >
          <ListGlyph kind="search" size={16} className="shrink-0 text-ds-muted" />
          <span className="sr-only">Search shipments</span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (state === "P6.4") go("P6.1");
            }}
            placeholder="Search shipments"
            className="min-w-0 flex-1 bg-transparent text-[14px] leading-[17px] text-ds-ink outline-none placeholder:text-ds-muted focus-visible:outline-none"
          />
        </label>
      </div>
      {state === "P6.4" ? (
        <section
          role="status"
          aria-busy="true"
          className="flex flex-col gap-18 rounded-card bg-ds-bg p-24"
        >
          <span className="sr-only">Loading shipments</span>
          {[0, 1, 2, 3, 4].map((i) => (
            <div aria-hidden="true" key={i} className="flex items-center gap-12">
              <span className="shipment-skeleton size-40 shrink-0 rounded-full bg-ds-surface-3" />
              <span className="flex min-w-0 flex-1 flex-col gap-8">
                <span className="shipment-skeleton h-12 w-180 max-w-full rounded-full bg-ds-surface-3" />
                <span className="shipment-skeleton h-10 w-260 max-w-full rounded-full bg-ds-surface-3" />
              </span>
            </div>
          ))}
        </section>
      ) : filtered.length ? (
        <ShipmentList rows={filtered} onOpen={onOpen} />
      ) : (
        <section className="flex min-h-[calc(100dvh-365px)] flex-col items-center justify-center gap-10 rounded-card bg-ds-bg px-24 py-48 text-center md:min-h-[calc(100dvh-305px)] lg:min-h-[calc(100dvh-313px)]">
          <ListGlyph kind="empty" size={28} className="text-ds-muted" />
          <h2 className="text-[16px] leading-[20px] font-medium">
            {search.trim()
              ? `No shipments match "${search.trim()}"`
              : "No shipments match your search"}
          </h2>
          <p className="max-w-360 text-[13.5px] leading-[16px] text-ds-muted">
            Try a city, a driver&apos;s name, or a shipment number like #1041.
          </p>
          <button
            type="button"
            className="link focus-ring -my-12 rounded-small py-12 text-[13px] leading-[16px] font-medium"
            onClick={clear}
          >
            Clear search
          </button>
        </section>
      )}
      {recorded && (
        <div className="mt-16">
          <DemoRecord title={recorded} />
        </div>
      )}
    </>
  );
}

function ListGlyph({
  kind,
  size,
  className,
}: {
  kind: "plus" | "search" | "empty";
  size: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {kind === "plus" ? (
        <path d="M12 5v14M5 12h14" />
      ) : (
        <>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
          {kind === "empty" && <path d="m8 8 6 6m0-6-6 6" />}
        </>
      )}
    </svg>
  );
}
