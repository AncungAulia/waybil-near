import Link from "next/link";
import {
  ArrowRight,
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
import { Stat } from "@/components/elements/Stat";
import { DemoMap } from "@/components/elements/DemoMap";
import { StatusPill } from "@/components/elements/StatusPill";
import type { DemoSettlement } from "@/lib/demo-delivery";
import {
  DRIVER_PERCENT,
  DRIVER_TRIPS,
  HARBOR_HUB_MAPS,
  MONTH_PAID_BEFORE,
  WESTFIELD_ADVANCE,
  WESTFIELD_TRIP_ID,
  type DriverState,
} from "../data/fixtures";
import { PayoutRows } from "./PayoutRows";
import { ShareLink } from "./ShareLink";

/** K1.3, the empty trips screen. */
export function NoTrips() {
  return (
    <Panel className="min-h-[60dvh] items-center justify-center text-center">
      <img src="/illustrations/driver.svg" alt="" className="h-140 w-180 object-contain" />
      <h2 className="text-heading">No trips yet</h2>
      <p className="max-w-400 text-body text-ds-muted">
        Trips appear here once a shipping company you work with approves one for you.
      </p>
      <div className="w-full max-w-380">
        <ShareLink />
      </div>
    </Panel>
  );
}

/** K1.1 and K1.2, the trips board with the current trip, the Westfield trip and payouts. */
export function TripsList({
  state,
  preview,
  shipment,
  settlement,
  latest,
  monthTotal,
  onHold,
  westfieldCancelled,
  openTrip,
}: {
  state: DriverState;
  preview: boolean;
  shipment: Shipment;
  settlement: DemoSettlement;
  latest: string;
  monthTotal: string;
  onHold: boolean;
  westfieldCancelled: boolean;
  openTrip: (s: DriverState, id?: number) => void;
}) {
  const westfieldTrip = DRIVER_TRIPS[WESTFIELD_TRIP_ID]!;
  return (
    <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex min-w-0 flex-col gap-16">
        {state === "K1.2" ? (
          <Panel className="ready-card bg-ds-brand">
            <p className="flex items-center gap-8 text-label">
              <SealCheck size={18} className="shrink-0" />
              {!preview && settlement.active
                ? "Northwind chose what to pay"
                : "Harbor Hub confirmed your delivery"}
            </p>
            {/* Scales with the card so the amount and "USDC" always fit, up to the board's 56 px. */}
            <div className="@container">
              <Money
                amount={latest}
                className="text-[clamp(32px,15.5cqw,56px)] leading-[1.07] font-medium tracking-[-0.03em]"
              />
            </div>
            <p className="text-label text-ds-ink-2">
              {!preview && settlement.active
                ? settlement.reason
                : `You received ${DRIVER_PERCENT} of the ${formatUsdc(BigInt(shipment.bill))} USDC fee for shipment #1041.`}
            </p>
            <Button
              icon={<ArrowRight size={17} />}
              className="w-full justify-between md:w-fit"
              onClick={() => openTrip("K2.8")}
            >
              See the payment
            </Button>
          </Panel>
        ) : onHold ? (
          <Panel title="Trip #1041 is on hold" className="bg-ds-danger-soft">
            <p className="flex items-center gap-8 text-label">
              <WarningCircle size={18} className="shrink-0 text-ds-danger" />
              Harbor Hub reported a problem
            </p>
            <p className="text-body text-ds-ink-2">
              You get paid after Northwind chooses what to pay.
            </p>
            <Button
              icon={<ArrowRight size={17} />}
              className="w-full justify-between md:w-fit"
              onClick={() => openTrip("K2.9")}
            >
              See the trip
            </Button>
          </Panel>
        ) : (
          <Panel
            title="Trip #1041 is on the road"
            action={
              <button
                className="link focus-ring relative text-caption before:absolute before:-inset-x-8 before:-inset-y-12"
                onClick={() => openTrip("K2.4")}
              >
                Details
              </button>
            }
            className="p-18"
          >
            {/* Short phones get a shorter map, so the QR button stays above the bottom nav. */}
            <DemoMap className="h-[clamp(160px,calc(100dvh-400px),300px)] md:h-300" />
            <div className="flex flex-col gap-12 md:flex-row">
              <Button icon={<QrCode size={17} />} onClick={() => openTrip("K2.5")}>
                Show QR at arrival
              </Button>
              <ButtonLink
                variant="secondary"
                icon={<NavigationArrow size={17} />}
                href={HARBOR_HUB_MAPS}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps
              </ButtonLink>
            </div>
          </Panel>
        )}
        <Panel
          title={`${westfieldTrip.from} to ${westfieldTrip.to}`}
          action={<StatusPill status={westfieldCancelled ? "cancelled" : "approved"} />}
        >
          <p className="text-caption text-ds-muted">#1044 for {westfieldTrip.company}</p>
          {westfieldCancelled ? (
            <>
              <p className="text-label text-ds-muted">
                {westfieldTrip.company} cancelled this trip. You don&apos;t need to pick it up.
              </p>
              <Button
                variant="secondary"
                icon={<ArrowRight size={17} />}
                className="w-full justify-between md:w-fit"
                onClick={() => openTrip("K2.14", WESTFIELD_TRIP_ID)}
              >
                See the trip
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-end justify-between gap-12">
                <div>
                  <p className="text-label text-ds-muted">You get on arrival</p>
                  <Money amount={WESTFIELD_ADVANCE} className="text-title" />
                </div>
                <p className="text-caption text-ds-muted">Pickup today</p>
              </div>
              <Button
                variant="secondary"
                icon={<Package size={17} />}
                className="w-full justify-between md:w-fit"
                onClick={() => openTrip("K2.1", WESTFIELD_TRIP_ID)}
              >
                Confirm pickup
              </Button>
            </>
          )}
        </Panel>
      </div>
      <div className="flex min-w-0 flex-col gap-16">
        <Stat
          className="hidden w-full rounded-card p-24 lg:flex"
          label="Paid to you this month"
          value={<Money amount={state === "K1.2" ? monthTotal : MONTH_PAID_BEFORE.toString()} />}
          context={
            state === "K1.2"
              ? "You were paid on arrival for four trips."
              : "You were paid on arrival for three trips."
          }
        />
        <Panel
          title="Recent payouts"
          action={
            <Link
              className="link focus-ring relative text-caption before:absolute before:-inset-x-8 before:-inset-y-12"
              href="/driver/payouts"
            >
              See all
            </Link>
          }
        >
          <PayoutRows recent />
        </Panel>
      </div>
    </div>
  );
}
