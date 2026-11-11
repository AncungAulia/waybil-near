"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, UserPlus, Warning } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { Stat } from "@/components/elements/Stat";
import { ShipmentList } from "../ShipmentList";
import { billsToPay, toRow, type LiveShipperData } from "../../data/live";
import { Meter } from "./shared";

/* P1. */
export function Home({ data, name }: { data: LiveShipperData; name: string }) {
  const router = useRouter();
  const shipper = data.shipper!;
  const bills = billsToPay(data.shipments);
  const rows = data.shipments.slice(0, 5).map((s) => toRow(s, data));
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-12">
        <div>
          <h1 className="text-title break-all">Hi, {name}</h1>
          <p className="mt-6 text-label text-ds-muted">
            Approve trips before the truck leaves. Your drivers get paid on arrival.
          </p>
        </div>
        <div className="flex gap-10">
          <ButtonLink variant="secondary" href="/shipper/network" icon={<UserPlus size={17} />}>
            Invite driver
          </ButtonLink>
          <ButtonLink href="/shipper/shipments/new" icon={<Plus size={17} />}>
            New shipment
          </ButtonLink>
        </div>
      </header>
      {(shipper.paused || shipper.late_bills > 0) && (
        <div className="flex items-start gap-12 rounded-[20px] bg-ds-danger-stamp p-16 text-ds-report-ink">
          <Warning size={20} className="shrink-0" />
          <p className="text-label">
            {shipper.paused
              ? "The team paused new shipments. Open trips keep going and drivers still get paid."
              : `You have ${shipper.late_bills} late ${shipper.late_bills === 1 ? "bill" : "bills"}. Pay it to approve new trips again.`}
          </p>
        </div>
      )}
      <div className="grid gap-16 md:grid-cols-3">
        <Stat
          className="w-full"
          label="Bills to pay"
          value={<Money amount={String(bills.total)} />}
          context={`${bills.count} ${bills.count === 1 ? "bill" : "bills"}`}
        />
        <Stat
          className="w-full"
          label="Due this week"
          value={<Money amount={String(bills.weekTotal)} />}
          context={`${bills.weekCount} ${bills.weekCount === 1 ? "bill" : "bills"}`}
        />
        <Stat
          className="w-full"
          label="Late bills"
          value={String(shipper.late_bills)}
          context={shipper.late_bills ? "Pay them to approve new trips" : "Every bill is on time"}
        />
      </div>
      <Panel
        title="Credit limit"
        action={
          <Link className="link focus-ring text-label" href="/shipper/credit">
            See credit
          </Link>
        }
      >
        <Meter data={data} />
      </Panel>
      <Panel
        title="Latest shipments"
        action={
          <Link className="link focus-ring text-label" href="/shipper/shipments">
            See all
          </Link>
        }
      >
        {rows.length === 0 ? (
          <p className="py-12 text-label text-ds-muted">
            No shipments yet. Invite a driver and add a destination, then create your first one.
          </p>
        ) : (
          <ShipmentList
            rows={rows}
            meta="due"
            onOpen={(id) => router.push(`/shipper/shipments/${id}`)}
          />
        )}
      </Panel>
    </>
  );
}
