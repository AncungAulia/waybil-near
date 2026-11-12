"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { advanceFor, formatUsdc, parseUsdc, type TripCreate } from "@waybil/shared";
import { MapPin, UserPlus } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Money } from "@/components/elements/Money";
import { FillEmpty } from "@/components/elements/EmptyState";
import { RouteMap } from "@/components/elements/RouteMap";
import { api } from "@/lib/api";
import { km } from "@/lib/route";
import { usePlaces } from "@/hooks/useTrips";
import { WAYBIL_CONTRACT } from "@/lib/env";
import { listShipmentsByShipper } from "@/lib/near";
import { callContract } from "@/lib/wallet";
import { creditUsed, dueAt, names, type LiveShipperData } from "../../data/live";
import { Alert, failure, GAS, Meter } from "./shared";

/* P2. */
export function NewLiveShipment({ data, refresh }: { data: LiveShipperData; refresh: () => void }) {
  const router = useRouter();
  const { people, places } = names(data.invites);
  const shipper = data.shipper!;
  const [driver, setDriver] = useState(data.network.drivers[0] ?? "");
  const [destination, setDestination] = useState(
    data.network.destinations[0] ? String(data.network.destinations[0].id) : "",
  );
  const { data: placeList } = usePlaces();
  const pickups = (placeList?.places ?? []).filter((p) => p.kind === "pickup");
  const [pickupChoice, setPickup] = useState("");
  const pickupId = pickupChoice || pickups[0]?.id || "";
  const pickup = pickups.find((p) => p.id === pickupId);
  /* The destination's pin is the place on the warehouse invite this destination came from. */
  const chosen = data.network.destinations.find((d) => String(d.id) === destination);
  const destPlaceId = data.invites.find(
    (i) => i.type === "warehouse" && i.acceptedBy === chosen?.warehouse && i.placeId,
  )?.placeId;
  const destPlace = (placeList?.places ?? []).find((p) => p.id === destPlaceId);
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("crates");
  const [fee, setFee] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = (offset: number) =>
    new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  let bill = 0n;
  try {
    bill = /^\d+(\.\d{1,2})?$/.test(fee.trim()) ? parseUsdc(fee.trim()) : 0n;
  } catch {
    bill = 0n;
  }
  const free = BigInt(shipper.limit) - creditUsed(shipper);
  const over = bill > free;
  const qtyOk = /^\d+$/.test(qty) && Number(qty) > 0 && Number(qty) <= 0xffffffff;
  const unitOk = /^[a-z]{1,20}$/i.test(unit.trim());
  const dueOk = !!due && due > day(0) && due <= day(60);
  const ready =
    !!driver &&
    !!destination &&
    !!pickup &&
    qtyOk &&
    unitOk &&
    bill > 0n &&
    !over &&
    dueOk &&
    !shipper.paused;
  const empty = data.network.drivers.length === 0 || data.network.destinations.length === 0;

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const tx = await callContract(
        WAYBIL_CONTRACT,
        "create_shipment",
        {
          driver,
          destination: Number(destination),
          qty: Number(qty),
          unit: unit.trim(),
          bill: String(bill),
          due_at: dueAt(due),
        },
        { gas: GAS },
      );
      /* The wallet gives only the hash, so the new id is the newest shipment now. */
      const [newest] = (
        await listShipmentsByShipper(data.account, {
          from: Math.max(0, data.shipments.length - 5),
          limit: 50,
        })
      ).sort((a, b) => b.id - a.id);
      /* Join the pickup point and the destination into the trip the map shows. */
      if (newest && pickup)
        await api(`/trips/${newest.id}`, {
          method: "PUT",
          body: { pickupPlaceId: pickup.id } satisfies TripCreate,
        }).catch(() => undefined);
      refresh();
      router.push(newest ? `/shipper/shipments/${newest.id}?tx=${tx}` : "/shipper/shipments");
    } catch (e) {
      setError(failure(e));
      setBusy(false);
    }
  }

  return (
    <>
      <header>
        <h1 className="text-title">New shipment</h1>
        <p className="mt-6 text-label text-ds-muted">
          You approve it now and pay the bill by the due date. The driver gets paid on arrival.
        </p>
      </header>
      {empty ? (
        <FillEmpty
          image="/illustrations/network/empty-driver.svg"
          title="Add a driver and a destination first"
          body="A shipment goes from a driver in your network to one of your destinations."
          action={
            <ButtonLink href="/shipper/network" icon={<UserPlus size={17} />}>
              Open your network
            </ButtonLink>
          }
          className="min-h-[calc(100dvh-338px)] md:min-h-[calc(100dvh-284px)] lg:min-h-[calc(100dvh-292px)]"
        />
      ) : (
        <div className="grid items-start gap-24 lg:grid-cols-[minmax(0,1fr)_400px]">
          <Panel title="Trip">
            <label className="flex flex-col gap-8 text-label">
              Driver
              <select
                className="focus-ring h-48 rounded-[14px] bg-ds-canvas px-12"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
              >
                {data.network.drivers.map((d) => (
                  <option key={d} value={d}>
                    {people[d] ?? d}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-8 text-label">
              Pickup from
              {pickups.length ? (
                <select
                  className="focus-ring h-48 rounded-[14px] bg-ds-canvas px-12"
                  value={pickupId}
                  onChange={(e) => setPickup(e.target.value)}
                >
                  {pickups.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <ButtonLink
                  href="/shipper/network"
                  variant="secondary"
                  icon={<MapPin size={17} />}
                  className="w-full justify-between"
                >
                  Add a pickup point first
                </ButtonLink>
              )}
            </label>
            <label className="flex flex-col gap-8 text-label">
              Destination
              <select
                className="focus-ring h-48 rounded-[14px] bg-ds-canvas px-12"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                {data.network.destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {places[d.warehouse]?.name ?? d.warehouse}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-12">
              <Input
                label="Quantity"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                error={qty && !qtyOk ? "Enter a whole number above zero." : undefined}
              />
              <Input
                label="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                error={!unitOk ? "Use one word, like crates." : undefined}
              />
            </div>
            <Input
              label="Bill"
              suffix="USDC"
              inputMode="decimal"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              error={
                over
                  ? `That is over your limit. You have ${formatUsdc(free > 0n ? free : 0n)} USDC left.`
                  : undefined
              }
            />
            <Input
              label="Due date"
              type="date"
              min={day(1)}
              max={day(60)}
              value={due}
              onChange={(e) => setDue(e.target.value)}
              hint="Up to 60 days from today."
            />
          </Panel>
          <Panel title="Summary">
            {pickup && destPlace ? (
              <>
                <RouteMap
                  className="h-200 w-full"
                  chip="Route preview"
                  trips={[
                    {
                      id: "preview",
                      pickup,
                      destination: destPlace,
                      route: [
                        [pickup.lng, pickup.lat],
                        [destPlace.lng, destPlace.lat],
                      ],
                    },
                  ]}
                />
                <p className="text-caption text-ds-muted">
                  {pickup.name} to {destPlace.name} is about{" "}
                  {Math.round(km([pickup.lng, pickup.lat], [destPlace.lng, destPlace.lat]))} km in a
                  straight line. The road route is drawn once you approve.
                </p>
              </>
            ) : (
              pickup &&
              chosen && (
                <p className="text-caption text-ds-muted">
                  This destination has no pin on the map yet, so the trip will have no map.
                </p>
              )
            )}
            <div className="flex justify-between gap-12 text-label">
              <span className="text-ds-muted">The driver gets on arrival</span>
              <Money amount={String(advanceFor(bill))} />
            </div>
            <div className="flex justify-between gap-12 text-label">
              <span className="text-ds-muted">You pay by the due date</span>
              <Money amount={String(bill)} />
            </div>
            <Meter data={data} />
            {shipper.paused && <Alert>The team paused new shipments for your company.</Alert>}
            {error && <Alert>{error}</Alert>}
            <Button
              className="h-52 w-full justify-between"
              disabled={!ready}
              loading={busy}
              loadingLabel="Waiting for wallet"
              onClick={() => void approve()}
            >
              Approve shipment
            </Button>
          </Panel>
        </div>
      )}
    </>
  );
}
