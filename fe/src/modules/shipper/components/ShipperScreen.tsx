"use client";
import { useState, useSyncExternalStore } from "react";
import { notFound, usePathname, useRouter } from "next/navigation";
import { ArrowLeft, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ShipmentRowSkeleton } from "@/components/elements/ShipmentRow";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { useDemoDelivery, useDemoSettlement } from "@/hooks/useDemoDelivery";
import { demoCreditUsed } from "@/lib/demo-delivery";
import { cn } from "@/lib/cn";
import { ShipperHome } from "./ShipperHome";
import { NewShipment } from "./NewShipment";
import { ShipperDetail } from "./ShipperDetail";
import { ShipperNetwork } from "./ShipperNetwork";
import { ShipperCredit } from "./ShipperCredit";
import { ShipmentList } from "./ShipmentList";
import { SHIPMENTS, SHIPPER_FIXTURES, type ShipperState } from "../data/fixtures";
import {
  cancelDemoShipment,
  createDemoShipment,
  useShipperShipments,
} from "../hooks/useShipperShipments";

function routeFor(state: ShipperState, id: number) {
  return state.startsWith("P1")
    ? "/shipper"
    : state.startsWith("P2")
      ? "/shipper/shipments/new"
      : state.startsWith("P3") || state.startsWith("P4")
        ? `/shipper/shipments/${id}`
        : state.startsWith("P5")
          ? "/shipper/network"
          : state.startsWith("P6")
            ? "/shipper/shipments"
            : "/shipper/credit";
}
const mountedSubscribe = () => () => {};
const mountedSnapshot = () => true;
const mountedServerSnapshot = () => false;
export function ShipperScreen({
  initialState = "P1.1",
  preview = false,
  shipmentId = 1041,
  initialReceipt,
}: {
  initialState?: ShipperState;
  preview?: boolean;
  shipmentId?: number;
  initialReceipt?: string;
}) {
  const [localState, setState] = useState(initialState),
    [search, setSearch] = useState(initialState === "P6.3" ? "Lakeside" : ""),
    [filter, setFilter] = useState(initialState === "P6.2" ? "Bills due" : "All"),
    [recorded, setRecorded] = useState<string | undefined>(initialReceipt);
  const router = useRouter(),
    pathname = usePathname(),
    delivery = useDemoDelivery(),
    settlement = useDemoSettlement();
  const liveRows = useShipperShipments();
  const rows = preview ? SHIPMENTS : liveRows;
  const mounted = useSyncExternalStore(mountedSubscribe, mountedSnapshot, mountedServerSnapshot);
  const committed = preview
    ? 0n
    : rows
        .filter((row) => row.shipment.id >= 1045 && row.shipment.status === "Approved")
        .reduce((sum, row) => sum + BigInt(row.shipment.bill), 0n);
  const usedBefore = preview ? 2400000000n : demoCreditUsed(delivery, settlement.bill, committed);
  let state = localState;
  if (!preview && shipmentId === 1041 && ["P3.2", "P3.3", "P3.4", "P3.6", "P3.9"].includes(state)) {
    if (delivery === "paid") state = "P3.4";
    else if (delivery === "reported") state = "P3.6";
    else if (delivery === "settled") state = "P3.9";
    else if (delivery === "repaid") state = "P3.5";
  }
  const go = (next: ShipperState) => {
    const href = routeFor(next, shipmentId);
    if (!preview && pathname !== href) {
      router.push(
        next === "P5.3"
          ? `${href}?invite=driver`
          : next === "P5.4"
            ? `${href}?invite=destination`
            : href,
      );
      return;
    }
    setState(next);
  };
  const open = (id: number, pay = false) => {
    if (preview) {
      go(pay ? "P4.1" : "P3.2");
      return;
    }
    router.push(`/shipper/shipments/${id}${pay ? "?pay=on" : ""}`);
  };
  const row = rows.find((r) => r.shipment.id === shipmentId);
  if (!preview && shipmentId >= 1045 && !row) {
    if (!mounted)
      return (
        <RoleShell role="shipper" current="/shipper/shipments" detail>
          <ShipmentRowSkeleton className="w-full" />
        </RoleShell>
      );
    notFound();
  }
  let shipment = { ...SHIPPER_FIXTURES[state], ...(preview ? {} : row?.shipment), id: shipmentId };
  if (!preview && shipmentId === 1036)
    shipment = { ...shipment, status: "Paid", marked_late: true };
  if (
    !preview &&
    shipmentId === 1041 &&
    (delivery === "settled" || (delivery === "repaid" && settlement.active))
  )
    shipment = { ...shipment, bill: settlement.bill, advance: settlement.amount };
  const detail = state.startsWith("P2") || state.startsWith("P3") || state.startsWith("P4");
  const current = state.startsWith("P5")
    ? "/shipper/network"
    : detail || state.startsWith("P6")
      ? "/shipper/shipments"
      : "/shipper";
  const filtered = rows
    .filter(
      (r) =>
        filter === "All" ||
        (filter === "On the road" && r.shipment.status === "PickedUp") ||
        (filter === "Bills due" && r.shipment.status === "Paid") ||
        (filter === "Done" && r.shipment.status === "Repaid"),
    )
    .filter((r) =>
      `${r.city} ${r.driver} ${r.shipment.id} ${r.cargo}`
        .toLowerCase()
        .includes(search.toLowerCase().replace(/^#/, "")),
    );
  return (
    <RoleShell role="shipper" current={current} detail={detail}>
      {detail && (
        <button
          className="press focus-ring mb-24 flex items-center gap-8 rounded-small text-label text-ds-muted"
          onClick={() => go("P6.1")}
        >
          <ArrowLeft size={18} />
          Shipments
        </button>
      )}
      {state.startsWith("P1") ? (
        <ShipperHome state={state} go={go} open={open} usedBefore={usedBefore} />
      ) : state.startsWith("P2") ? (
        <NewShipment
          usedBefore={usedBefore}
          state={state}
          go={go}
          onApproved={(draft) => {
            setRecorded("Demo shipment approval");
            if (preview) go("P3.1");
            else {
              const created = createDemoShipment(draft);
              router.push(`/shipper/shipments/${created.shipment.id}?approved=on`);
            }
          }}
        />
      ) : state.startsWith("P3") || state.startsWith("P4") ? (
        <ShipperDetail
          trip={preview ? undefined : row}
          state={state}
          shipment={shipment}
          go={go}
          preview={preview}
          recorded={recorded}
          onCancel={() => {
            if (!preview) {
              cancelDemoShipment(shipment.id);
              router.push(`/shipper/shipments?cancelled=${shipment.id}`);
            } else {
              setRecorded("Demo cancellation receipt");
              go("P6.1");
            }
          }}
        />
      ) : state.startsWith("P5") ? (
        <ShipperNetwork state={state} go={go} />
      ) : state.startsWith("P7") ? (
        <ShipperCredit state={state} go={go} usedBefore={usedBefore} />
      ) : (
        <>
          <div className="mb-24 flex flex-wrap items-end justify-between gap-16">
            <div>
              <h1 className="text-title md:text-amount">Shipments</h1>
              <p className="mt-4 text-label text-ds-muted">Everything you approved, newest first</p>
            </div>
            <Button
              icon={<Plus size={17} />}
              className="w-full justify-between md:w-auto"
              onClick={() => go("P2.1")}
            >
              New shipment
            </Button>
          </div>
          <Panel>
            <div className="flex flex-wrap gap-8">
              {["All", "On the road", "Bills due", "Done"].map((label) => (
                <button
                  key={label}
                  aria-pressed={filter === label}
                  onClick={() => {
                    setFilter(label);
                    if (state === "P6.4") go("P6.1");
                  }}
                  className={cn(
                    "press focus-ring rounded-full px-16 py-10 text-label",
                    filter === label ? "bg-ds-ink text-ds-bg" : "bg-ds-canvas",
                  )}
                >
                  {label}{" "}
                  <span className="ml-6 opacity-60">
                    {label === "All"
                      ? rows.length
                      : rows.filter(
                          (r) =>
                            r.shipment.status ===
                            (label === "On the road"
                              ? "PickedUp"
                              : label === "Bills due"
                                ? "Paid"
                                : "Repaid"),
                        ).length}
                  </span>
                </button>
              ))}
            </div>
            <Input
              label="Search shipments"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a city, a driver or a shipment number"
            />
            {state === "P6.4" ? (
              <div className="flex flex-col gap-16" aria-label="Loading shipments">
                {[1, 2, 3, 4].map((i) => (
                  <ShipmentRowSkeleton key={i} className="w-full" />
                ))}
              </div>
            ) : filtered.length ? (
              <ShipmentList rows={filtered} onOpen={open} />
            ) : (
              <div className="flex min-h-380 flex-col items-center justify-center gap-16 text-center">
                <MagnifyingGlass size={48} className="text-ds-muted" />
                <h2 className="text-heading">
                  No shipments match {search ? `“${search}”` : "your search"}
                </h2>
                <p className="text-body text-ds-muted">
                  Try a city, a driver&apos;s name, or a shipment number like #1041.
                </p>
                <Button
                  variant="quiet"
                  onClick={() => {
                    setSearch("");
                    setFilter("All");
                    go("P6.1");
                  }}
                >
                  Clear search
                </Button>
              </div>
            )}
          </Panel>
          {recorded && (
            <div className="mt-16">
              <DemoRecord title={recorded} />
            </div>
          )}
        </>
      )}
      <p className="mt-24 text-center text-caption text-ds-muted">
        This demo uses sample data. It does not move money.
      </p>
    </RoleShell>
  );
}
