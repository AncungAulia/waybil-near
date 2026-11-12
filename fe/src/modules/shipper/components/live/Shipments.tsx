"use client";
import { SkeletonGroup, SkeletonRow } from "@/components/elements/Skeleton";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus } from "@phosphor-icons/react";
import { ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { ShipmentList } from "../ShipmentList";
import { toRow, withTrips, type LiveShipperData } from "../../data/live";
import { useTrips } from "@/hooks/useTrips";

/* P6. */
const FILTERS = ["All", "Bills to pay", "On the road", "Done"] as const;
export function Shipments({ data }: { data: LiveShipperData }) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const match = (status: string) =>
    filter === "All" ||
    (filter === "Bills to pay" && status === "Paid") ||
    (filter === "On the road" && ["Approved", "PickedUp", "Reported"].includes(status)) ||
    (filter === "Done" && ["Repaid", "Cancelled", "CoveredByReserve"].includes(status));
  const { trips, data: tripData } = useTrips(data.shipments.map((s) => s.id));
  /* Rows wait for their trips, so a title never changes from "To X" to "A to X". */
  const loadingTrips = data.shipments.length > 0 && !tripData;
  const rows = withTrips(
    data.shipments.filter((s) => match(s.status)).map((s) => toRow(s, data)),
    trips,
  );
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-12">
        <div>
          <h1 className="text-title">Shipments</h1>
          <p className="mt-6 text-label text-ds-muted">Every trip you approved and its bill.</p>
        </div>
        <ButtonLink
          href="/shipper/shipments/new"
          icon={<Plus size={17} />}
          className="w-full md:w-auto"
        >
          New shipment
        </ButtonLink>
      </header>
      <Segmented
        options={FILTERS.map((f) => ({ value: f, label: f }))}
        value={filter}
        onChange={setFilter}
        label="Filter shipments"
        fill
      />
      {rows.length === 0 ? (
        /* Fills the window under the filters, as the board draws an empty list. */
        <section className="flex min-h-[calc(100dvh-365px)] flex-col items-center justify-center gap-10 rounded-card bg-ds-bg px-24 py-48 text-center md:min-h-[calc(100dvh-305px)] lg:min-h-[calc(100dvh-313px)]">
          <span className="grid size-56 place-items-center rounded-full bg-ds-canvas text-ds-muted">
            <Package size={26} />
          </span>
          <h2 className="text-[16px] leading-[20px] font-medium">
            {data.shipments.length ? "Nothing here yet" : "No shipments yet"}
          </h2>
          <p className="max-w-360 text-[13.5px] leading-[1.4] text-ds-muted">
            {data.shipments.length
              ? "No shipment fits this filter right now."
              : "Approve your first trip. Your driver gets paid the moment the goods arrive."}
          </p>
          {data.shipments.length ? (
            <button
              type="button"
              className="link focus-ring rounded-small px-8 py-10 text-[13px] font-medium"
              onClick={() => setFilter("All")}
            >
              Show all
            </button>
          ) : (
            <ButtonLink href="/shipper/shipments/new" icon={<Plus size={17} />} className="mt-6">
              New shipment
            </ButtonLink>
          )}
        </section>
      ) : loadingTrips ? (
        <SkeletonGroup
          label="Loading your shipments."
          className="flex flex-col rounded-card bg-ds-bg px-20 py-8"
        >
          {rows.map((r) => (
            <SkeletonRow key={r.shipment.id} />
          ))}
        </SkeletonGroup>
      ) : (
        <ShipmentList rows={rows} onOpen={(id) => router.push(`/shipper/shipments/${id}`)} />
      )}
    </>
  );
}
