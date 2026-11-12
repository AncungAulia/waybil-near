"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Plus, UserPlus, Warning } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { Stat } from "@/components/elements/Stat";
import { FleetMap } from "@/components/elements/FleetMap";
import { ShipmentList } from "../ShipmentList";
import { billsToPay, toRow, withTrips, type LiveShipperData } from "../../data/live";
import { useTrips } from "@/hooks/useTrips";
import { Meter } from "./shared";

/* P1. */
export function Home({ data, name }: { data: LiveShipperData; name: string }) {
  const router = useRouter();
  const shipper = data.shipper!;
  const bills = billsToPay(data.shipments);
  const recent = data.shipments.slice(0, 5);
  const { trips } = useTrips(recent.map((s) => s.id));
  const rows = withTrips(
    recent.map((s) => toRow(s, data)),
    trips,
  );
  /* A first shipment needs a driver and a destination in the network. */
  const ready = data.network.drivers.length > 0 && data.network.destinations.length > 0;
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-12">
        <div>
          <h1 className="text-title break-all">Hi, {name}</h1>
          <p className="mt-6 text-label text-ds-muted">
            Approve trips before the truck leaves. Your drivers get paid on arrival.
          </p>
        </div>
        {/* On a phone the two actions share the full width, half each. */}
        <div className="grid w-full grid-cols-2 gap-10 md:flex md:w-auto">
          <ButtonLink
            variant="secondary"
            href="/shipper/network"
            icon={<UserPlus size={17} />}
            className="w-full min-w-0 md:w-auto"
          >
            Invite driver
          </ButtonLink>
          <ButtonLink
            href="/shipper/shipments/new"
            icon={<Plus size={17} />}
            className="w-full min-w-0 md:w-auto"
          >
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
      {ready && <FleetMap shipments={data.shipments} />}
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
          rows.length > 0 && (
            <Link className="link focus-ring text-label" href="/shipper/shipments">
              See all
            </Link>
          )
        }
      >
        {rows.length === 0 ? (
          <div className="flex min-h-240 flex-col items-center justify-center gap-10 py-24 text-center">
            <span className="grid size-56 place-items-center rounded-full bg-ds-canvas text-ds-muted">
              <Package size={26} />
            </span>
            <h3 className="text-[16px] leading-[20px] font-medium">No shipments yet</h3>
            <p className="max-w-360 text-[13.5px] leading-[1.4] text-ds-muted">
              {ready
                ? "Approve your first trip. Your driver gets paid the moment the goods arrive."
                : "Invite a driver and add a destination. Then you can create your first shipment."}
            </p>
            <ButtonLink
              href={ready ? "/shipper/shipments/new" : "/shipper/network"}
              icon={ready ? <Plus size={17} /> : <UserPlus size={17} />}
              className="mt-6"
            >
              {ready ? "New shipment" : "Open your network"}
            </ButtonLink>
          </div>
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
