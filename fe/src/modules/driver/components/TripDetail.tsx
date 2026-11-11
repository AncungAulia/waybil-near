import {
  Image,
  NavigationArrow,
  Package,
  QrCode,
  SealCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { formatUsdc, type Shipment } from "@waybil/shared";
import { Panel } from "@/components/layout/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { KeyValue } from "@/components/elements/KeyValue";
import { DemoMap } from "@/components/elements/DemoMap";
import { DemoRecord } from "@/components/elements/DemoRecord";
import type { DemoReport, DemoSettlement } from "@/lib/demo-delivery";
import { cn } from "@/lib/cn";
import {
  DRIVER_PERCENT,
  HARBOR_HUB_MAPS,
  type DriverState,
  type DriverTrip,
} from "../data/fixtures";

function TripFacts({ trip }: { trip: DriverTrip }) {
  return (
    <Panel title="Trip" gap={12}>
      <div>
        <KeyValue label="Shipping company" value={trip.companyName} />
        <KeyValue label="Pickup" value={`${trip.pickupPlace}, ${trip.pickupAddress}`} />
        <KeyValue label="Drop-off" value={trip.dropOff} />
        <KeyValue label="Cargo" value={trip.cargo} />
        <KeyValue label="Shipping fee" value={<Money amount={trip.fee} />} />
      </div>
    </Panel>
  );
}

/** K2.1–K2.14 on the trip screen, the map, the trip's current step and its facts. */
export function TripDetail({
  state,
  preview,
  trip,
  shipment,
  amount,
  bill,
  report,
  settlement,
  cancelledWhen,
  go,
  openReport,
}: {
  state: DriverState;
  preview: boolean;
  trip: DriverTrip;
  shipment: Shipment;
  amount: string;
  bill: bigint;
  report: DemoReport;
  settlement: DemoSettlement;
  cancelledWhen: string;
  go: (s: DriverState) => void;
  openReport: () => void;
}) {
  return (
    <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_420px]">
      <DemoMap
        origin={trip.from}
        destination={trip.dropOff.split(",")[0]}
        phase={
          state === "K2.14"
            ? "cancelled"
            : ["K2.1", "K2.2", "K2.3"].includes(state)
              ? "pickup"
              : ["K2.6", "K2.7", "K2.9", "K2.10", "K2.11"].includes(state)
                ? "arrived"
                : "road"
        }
        className="h-290 md:h-400 lg:h-520"
        label={
          state === "K2.14"
            ? "No pickup needed"
            : state === "K2.13"
              ? "Last seen 5 min ago"
              : ["K2.1", "K2.2", "K2.3"].includes(state)
                ? "Pickup at Main warehouse"
                : ["K2.6", "K2.7", "K2.9", "K2.10", "K2.11"].includes(state)
                  ? "At Harbor Hub"
                  : "Sharing location"
        }
      />
      <div className="flex min-w-0 flex-col gap-16">
        <Panel
          className={cn(
            ["K2.6", "K2.7"].includes(state) && "ready-card bg-ds-brand",
            ["K2.9", "K2.10"].includes(state) && "bg-ds-danger-soft",
            state === "K2.11" && "bg-ds-success-soft",
          )}
        >
          {state === "K2.14" ? (
            <>
              <p className="text-label text-ds-muted">{trip.company} cancelled this trip</p>
              <p className="text-amount">No pickup needed</p>
              <p className="text-label text-ds-muted">
                They cancelled on {cancelledWhen}, before you picked up the goods. You don&apos;t
                need to go to {trip.pickupPlace}.
              </p>
            </>
          ) : ["K2.1", "K2.2", "K2.3"].includes(state) ? (
            <>
              <p className="text-label text-ds-muted">You get on arrival</p>
              <Money amount={amount} className="text-amount" />
              <p className="text-label text-ds-muted">
                You receive {DRIVER_PERCENT} of the fee, paid the moment Harbor Hub confirms.
              </p>
              <Button
                icon={<Package size={17} />}
                className="w-full justify-between"
                onClick={() => go("K2.2")}
              >
                Confirm pickup
              </Button>
            </>
          ) : ["K2.6", "K2.7"].includes(state) ? (
            <>
              <p className="flex items-center gap-8 text-label">
                <SealCheck size={18} className="shrink-0" />
                Lena confirmed all 120 crates
              </p>
              <Money amount={amount} className="text-amount" />
              <p className="text-label text-ds-ink-2">
                {state === "K2.6"
                  ? `It is on its way to your account. The ${formatUsdc(bill - BigInt(amount))} USDC fee pays for getting paid early.`
                  : "The network is slow right now. Your money is safe."}
              </p>
              <Button
                loading
                className="w-full justify-between"
                loadingLabel={state === "K2.6" ? "Sending" : "Still sending"}
              >
                Sending
              </Button>
              {state === "K2.7" && (
                <p className="text-caption text-ds-ink-2">
                  It is taking longer than usual. It will arrive soon.
                </p>
              )}
            </>
          ) : ["K2.9", "K2.10"].includes(state) ? (
            <>
              <h2 className="flex items-center gap-10 text-body font-medium">
                <WarningCircle size={20} className="shrink-0 text-ds-danger" />
                Harbor Hub reported a problem
              </h2>
              <p className="text-body text-ds-ink-2">
                {report.note} You get paid after Northwind chooses what to pay.
              </p>
              <Button
                variant="secondary"
                icon={<Image size={17} />}
                className="self-start"
                onClick={openReport}
              >
                Read the report
              </Button>
            </>
          ) : state === "K2.11" ? (
            <>
              <h2 className="flex items-center gap-10 text-body font-medium">
                <WarningCircle size={20} className="shrink-0 text-ds-success" />
                Northwind chose what to pay
              </h2>
              <p className="text-body text-ds-ink-2">
                {preview ? "They paid for the 112 good crates." : settlement.reason} You got{" "}
                <Money amount={preview ? shipment.advance : settlement.amount} />.
              </p>
              <DemoRecord title="Demo settlement receipt" />
              <Button
                variant="secondary"
                icon={<Image size={17} />}
                className="self-start"
                onClick={openReport}
              >
                Read the report
              </Button>
            </>
          ) : (
            <>
              <div className="flex justify-between gap-20">
                <div>
                  <p className="text-label text-ds-muted">Arriving around</p>
                  <p className="text-title">15:40</p>
                </div>
                <div>
                  <p className="text-label text-ds-muted">Left to go</p>
                  <p className="text-title">42 km</p>
                </div>
              </div>
              <Button
                icon={<QrCode size={17} />}
                className="w-full justify-between"
                onClick={() => go("K2.5")}
              >
                Show QR at arrival
              </Button>
              <ButtonLink
                variant="secondary"
                icon={<NavigationArrow size={17} />}
                className="justify-between"
                href={HARBOR_HUB_MAPS}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps
              </ButtonLink>
              <Button variant="quiet" className="text-ds-danger" onClick={() => go("K2.12")}>
                Report a problem
              </Button>
            </>
          )}
        </Panel>
        <TripFacts trip={trip} />
      </div>
    </div>
  );
}
