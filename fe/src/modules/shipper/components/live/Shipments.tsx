"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { ShipmentList } from "../ShipmentList";
import { toRow, type LiveShipperData } from "../../data/live";

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
  const rows = data.shipments.filter((s) => match(s.status)).map((s) => toRow(s, data));
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-12">
        <div>
          <h1 className="text-title">Shipments</h1>
          <p className="mt-6 text-label text-ds-muted">Every trip you approved and its bill.</p>
        </div>
        <ButtonLink href="/shipper/shipments/new" icon={<Plus size={17} />}>
          New shipment
        </ButtonLink>
      </header>
      <Segmented
        options={FILTERS.map((f) => ({ value: f, label: f }))}
        value={filter}
        onChange={setFilter}
        label="Filter shipments"
        className="w-fit flex-wrap"
      />
      {rows.length === 0 ? (
        <Panel className="grid min-h-240 place-content-center text-center">
          <p className="text-label text-ds-muted">No shipments match this filter.</p>
        </Panel>
      ) : (
        <ShipmentList rows={rows} onOpen={(id) => router.push(`/shipper/shipments/${id}`)} />
      )}
    </>
  );
}
