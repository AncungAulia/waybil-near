"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  advanceFor,
  formatUsdc,
  parseUsdc,
  type RoutePreview,
  type TripCreate,
} from "@waybil/shared";
import { MapPin, MapTrifold, UserPlus } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchPicker } from "@/components/ui/SearchPicker";
import { DatePicker } from "@/components/ui/DatePicker";
import { Money } from "@/components/elements/Money";
import { FillEmpty } from "@/components/elements/EmptyState";
import { RouteMap } from "@/components/elements/RouteMap";
import { api } from "@/lib/api";
import { duration, km } from "@/lib/route";
import { usePlaces } from "@/hooks/useTrips";
import { useLive } from "@/hooks/useLive";
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
  /* Nothing is chosen for the shipper. Every field starts empty. */
  const [driver, setDriver] = useState("");
  const [destination, setDestination] = useState("");
  const { data: placeList } = usePlaces();
  const pickups = (placeList?.places ?? []).filter((p) => p.kind === "pickup");
  const [pickupChoice, setPickup] = useState("");
  const pickupId = pickupChoice;
  const pickup = pickups.find((p) => p.id === pickupId);
  /* The destination's pin is the place on the warehouse invite this destination came from. */
  const chosen = data.network.destinations.find((d) => String(d.id) === destination);
  const destPlaceId = data.invites.find(
    (i) => i.type === "warehouse" && i.acceptedBy === chosen?.warehouse && i.placeId,
  )?.placeId;
  const destPlace = (placeList?.places ?? []).find((p) => p.id === destPlaceId);
  /* The road between the two, worked out by the server before anything is approved. */
  const preview = useLive(
    () => api<RoutePreview>(`/places/route?from=${pickup!.id}&to=${destPlace!.id}`),
    pickup && destPlace ? `${pickup.id}-${destPlace.id}` : null,
  );
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [fee, setFee] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* A local calendar day, the same way the date picker counts them. */
  const day = (offset: number) => {
    const d = new Date(Date.now() + offset * 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
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
            <SearchPicker
              label="Driver"
              appearance="company"
              placeholder="Choose a driver"
              value={driver}
              options={data.network.drivers.map((d) => ({
                value: d,
                label: people[d] ?? d,
                detail: d,
              }))}
              onChange={setDriver}
            />
            {pickups.length || !placeList ? (
              <SearchPicker
                label="Pickup from"
                appearance="company"
                placeholder="Choose a pickup point"
                value={pickupId}
                options={pickups.map((p) => ({ value: p.id, label: p.name, detail: p.address }))}
                emptyText="Loading your pickup points."
                onChange={setPickup}
              />
            ) : (
              <div className="flex flex-col gap-8">
                <p className="text-label font-medium">Pickup from</p>
                <ButtonLink
                  href="/shipper/network"
                  variant="secondary"
                  icon={<MapPin size={17} />}
                  className="w-full justify-between"
                >
                  Add a pickup point first
                </ButtonLink>
              </div>
            )}
            <SearchPicker
              label="Destination"
              appearance="company"
              placeholder="Choose a destination"
              value={destination}
              options={data.network.destinations.map((d) => ({
                value: String(d.id),
                label: places[d.warehouse]?.name ?? d.warehouse,
                detail: places[d.warehouse]?.address || undefined,
              }))}
              onChange={setDestination}
            />
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
                placeholder="crates"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                error={unit && !unitOk ? "Use one word, like crates." : undefined}
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
            <DatePicker
              label="Due date"
              min={day(1)}
              max={day(60)}
              value={due}
              onChange={setDue}
              hint="Up to 60 days from today."
            />
          </Panel>
          <Panel title="Summary">
            {pickup && destPlace ? (
              <>
                <RouteMap
                  /* A new pair starts a new map, so it fits the new route. */
                  key={`${pickup.id}-${destPlace.id}`}
                  className="h-220 w-full"
                  chip={
                    preview.data?.routeSource === "road"
                      ? "Route preview"
                      : preview.data
                        ? "Direct route preview"
                        : "Finding the road"
                  }
                  trips={[
                    {
                      id: "preview",
                      pickup,
                      destination: destPlace,
                      route: preview.data?.route.coordinates ?? [
                        [pickup.lng, pickup.lat],
                        [destPlace.lng, destPlace.lat],
                      ],
                    },
                  ]}
                />
                <p className="text-caption text-ds-muted">
                  {preview.data?.routeSource === "road"
                    ? `${pickup.name} to ${destPlace.name} is ${Math.round(preview.data.distanceKm)} km by road${preview.data.durationMin != null ? `, about ${duration(preview.data.durationMin)} of driving` : ""}.`
                    : `${pickup.name} to ${destPlace.name} is about ${Math.round(km([pickup.lng, pickup.lat], [destPlace.lng, destPlace.lat]))} km in a straight line.`}
                </p>
              </>
            ) : (
              /* Keeps the map's place, so the shipper sees a route will show here. */
              <div className="flex h-220 flex-col items-center justify-center gap-10 rounded-row bg-ds-canvas p-24 text-center">
                <MapTrifold size={28} className="text-ds-muted" aria-hidden />
                <p className="max-w-260 text-label text-ds-muted">
                  {pickup && chosen
                    ? "This destination has no pin on the map, so the trip will have no map."
                    : "Choose a pickup point and a destination to see the route here."}
                </p>
              </div>
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
