"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDown,
  ArrowRight,
  NavigationArrow,
  Package,
  PaperPlaneTilt,
  QrCode,
  SealCheck,
  Image,
  X,
  ArrowLineDown,
  WarningCircle,
  WifiSlash,
  CircleNotch,
  ClockCountdown,
  Link as LinkIcon,
  Wrench,
  Warning,
  ChatCircle,
  Copy,
  MapPin,
} from "@phosphor-icons/react";
import { advanceFor, FEE_BPS, formatUsdc, parseUsdc } from "@waybil/shared";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { KeyValue } from "@/components/elements/KeyValue";
import { Stat } from "@/components/elements/Stat";
import { DemoMap } from "@/components/elements/DemoMap";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { DeliveryQr } from "@/components/elements/DeliveryQr";
import { ResultScreen } from "@/components/elements/ResultScreen";
import { StatusPill } from "@/components/elements/StatusPill";
import { Avatar } from "@/components/elements/Avatar";
import { Switch } from "@/components/elements/Switch";
import { useOrigin } from "@/hooks/useOrigin";
import { useDemoDelivery, useDemoReport, useDemoSettlement } from "@/hooks/useDemoDelivery";
import { DEMO_CODE, DEFAULT_REPORT } from "@/lib/demo-delivery";
import { cancelMoment, useDemoCancelled } from "@/lib/demo-cancel";
import { cn } from "@/lib/cn";
import {
  DRIVER_CANCELLED_AT,
  DRIVER_FIXTURES,
  DRIVER_TRIPS,
  type DriverState,
  type DriverTrip,
} from "../data/fixtures";

/* The Westfield trip's bill. What Sam gets comes from the shared fee split. */
const WESTFIELD_BILL = parseUsdc("210");
const WESTFIELD_ADVANCE = advanceFor(WESTFIELD_BILL).toString();
/* The driver's part of each bill, for example "97.5%". */
const DRIVER_PERCENT = `${Number(FEE_BPS.driver) / 100}%`;
const MAPS = "https://www.google.com/maps/search/?api=1&query=Harbor+Hub+9+Pier+Street";
const PAYOUTS = [
  ["1041", "Harbor City", "Nov 12", "292500000", "Northwind"],
  ["1039", "Millbrook", "Nov 11", "117000000", "Northwind"],
  ["1032", "Riverton", "Nov 8", "292500000", "Northwind"],
  ["1027", "Oakdale", "Nov 1", "195000000", "Blue Ridge"],
] as const;

function ShareLink({ row = false }: { row?: boolean }) {
  const url = `${useOrigin()}/c/sam`;
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    /* The companies screen sets the link and the button side by side, the empty state stacks them. */
    <div className={cn("flex flex-col gap-12", row && "md:flex-row md:items-center")}>
      <div
        className={cn(
          "flex items-center gap-10 rounded-full bg-ds-canvas py-6 pr-6 pl-16",
          row && "md:flex-1",
        )}
      >
        <LinkIcon size={16} className="shrink-0 text-ds-muted" />
        <span className="min-w-0 flex-1 truncate text-label">{url}</span>
        <button
          type="button"
          className="press focus-ring grid size-34 shrink-0 place-items-center rounded-full bg-ds-bg"
          aria-label="Copy your link"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setFailed(false);
            } catch {
              setFailed(true);
            }
          }}
        >
          <Copy size={15} />
        </button>
      </div>
      {copied && (
        <p role="status" className="text-caption text-ds-success">
          Your link is copied.
        </p>
      )}
      {failed && (
        <p role="status" className="text-caption text-ds-muted">
          Select the link above to copy it.
        </p>
      )}
      <ButtonLink
        className="justify-between"
        icon={<PaperPlaneTilt size={17} />}
        href={`https://wa.me/?text=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Share my link on WhatsApp
      </ButtonLink>
    </div>
  );
}

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

function PayoutRows({
  recent = false,
  latest = "292500000",
  /* #1041 is only listed once Harbor Hub has confirmed it and Sam was paid. */
  paid1041 = true,
}: {
  recent?: boolean;
  latest?: string;
  paid1041?: boolean;
}) {
  const rows = PAYOUTS.filter(([id]) => paid1041 || id !== "1041");
  return (
    <div className="flex flex-col gap-20">
      {(recent ? PAYOUTS.slice(1, 3) : rows).map(([id, city, date, amount, company]) => (
        <div key={id} className="flex flex-wrap items-center gap-12">
          <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-success-soft text-ds-success">
            <ArrowLineDown size={18} />
          </span>
          <div className="min-w-120 flex-1">
            <p className="text-label">Eastport to {city}</p>
            <p className="text-caption text-ds-muted">
              #{id} · {company} · {date}
            </p>
          </div>
          <span className="text-label text-ds-success">
            +<Money amount={id === "1041" ? latest : amount} />
          </span>
        </div>
      ))}
      {/* Sample payouts have no transactions, so one demo receipt stands in for them. */}
      {!recent && <DemoRecord title="Demo payout records" className="bg-ds-canvas" />}
    </div>
  );
}

export function DriverScreen({
  initialState = "K1.1",
  preview = false,
  shipmentId = 1041,
}: {
  initialState?: DriverState;
  preview?: boolean;
  shipmentId?: number;
}) {
  const [localState, setState] = useState<DriverState>(initialState);
  const [loaded, setLoaded] = useState(true);
  const [shareLocation, setShareLocation] = useState(true);
  const [offline, setOffline] = useState(false);
  const [reason, setReason] = useState("Running late");
  const [note, setNote] = useState("Traffic jam near Pine Ridge. About 1 hour late.");
  const [accepted, setAccepted] = useState(false);
  const [reportBack, setReportBack] = useState<DriverState>("K2.9");
  const delivery = useDemoDelivery();
  const savedReport = useDemoReport();
  const settlement = useDemoSettlement();
  /* Trips the shipper cancelled before pickup. The gallery never reads the demo store. */
  const cancelled = useDemoCancelled();
  const westfieldCancelled = !preview && cancelled.has(1044);
  const report = preview ? DEFAULT_REPORT : savedReport;
  const settlementPaid = !preview && ["settled", "repaid"].includes(delivery) && settlement.active;
  const latest = settlementPaid ? settlement.amount : "292500000";
  /* In the gallery #1041 is shown paid. Live, it counts only after the warehouse confirmed it. */
  const paid1041 = preview || ["paid", "settled", "repaid"].includes(delivery);
  const latestPaid = paid1041 ? BigInt(latest) : 0n;
  const monthTotal = (604500000n + latestPaid).toString();
  const onHold = !preview && delivery === "reported";
  const router = useRouter();
  useEffect(() => {
    if (preview) return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [preview]);
  let state = localState;
  /* A cancelled trip can no longer be picked up, so every trip screen shows K2.14. */
  if (!preview && cancelled.has(shipmentId) && state.startsWith("K2")) state = "K2.14";
  if (!preview && shipmentId === 1041) {
    if (state === "K1.1" && ["paid", "settled", "repaid"].includes(delivery)) state = "K1.2";
    if (["K2.4", "K2.5", "K2.6", "K2.7", "K2.9", "K2.10", "K2.13"].includes(state)) {
      if (delivery === "settled" || (delivery === "repaid" && settlement.active)) state = "K2.11";
      else if (delivery === "paid" || delivery === "repaid") state = "K2.8";
      else if (delivery === "reported") state = "K2.9";
      else if (offline && state !== "K2.5") state = "K2.13";
    }
  }
  const shipment = DRIVER_FIXTURES[state];
  const westfield = shipmentId === 1044;
  const trip = DRIVER_TRIPS[shipmentId] ?? DRIVER_TRIPS[1041]!;
  const westfieldTrip = DRIVER_TRIPS[1044]!;
  /* Live, the shipper's own clock time. The board and an unknown time show 09:40 UTC. */
  const liveCancelledAt = preview ? null : (cancelled.get(shipmentId) ?? null);
  const cancelledWhen =
    liveCancelledAt === null
      ? cancelMoment(DRIVER_CANCELLED_AT, "UTC")
      : cancelMoment(liveCancelledAt);
  const go = (s: DriverState) => setState(s);
  const openReport = () => {
    setReportBack(state === "K2.11" ? "K2.11" : "K2.9");
    go("K2.10");
  };
  const trips = () => {
    if (preview) go("K1.1");
    else router.push("/driver");
  };
  const openTrip = (s: DriverState, id = 1041) => {
    if (preview) go(s);
    else router.push(`/driver/trips/${id}${s === "K2.5" ? "?qr=on" : ""}`);
  };
  const pickup = () => {
    if (shareLocation) go("K2.3");
    else go("K2.4");
  };
  const detail = state.startsWith("K2");
  const current = state.startsWith("K3")
    ? ["K3.1", "K3.2"].includes(state)
      ? "/driver/payouts"
      : "/driver/companies"
    : "/driver";
  const title =
    state === "K1.2"
      ? "You got paid"
      : state.startsWith("K1")
        ? "Hi, Sam"
        : state.startsWith("K3")
          ? ["K3.1", "K3.2"].includes(state)
            ? "Payouts"
            : "Companies"
          : `${trip.from} to ${trip.to}`;
  const amount = westfield ? WESTFIELD_ADVANCE : shipment.advance;
  const bill = westfield ? WESTFIELD_BILL : BigInt(shipment.bill);
  const sheet = ["K2.2", "K2.3", "K2.10", "K2.12"].includes(state);

  if (state === "K2.5")
    return (
      <div className="flex min-h-dvh flex-col gap-24 bg-ds-bg px-16 py-12 md:px-32">
        <button
          type="button"
          className="press focus-ring flex w-fit items-center gap-8 rounded-full p-8 text-body"
          onClick={() => go("K2.4")}
        >
          <X size={22} />
          Close
        </button>
        <div className="my-auto flex w-full flex-col items-center gap-20 text-center">
          <h1 className="text-title md:text-[30px]">Show this to Harbor Hub</h1>
          <p className="text-label text-ds-muted">They scan it to confirm the goods arrived.</p>
          <div className="w-full max-w-340">
            <DeliveryQr code={westfield ? "WSTF1044" : DEMO_CODE} />
          </div>
          <div className="flex items-center gap-10 rounded-small bg-ds-canvas px-20 py-10">
            <span className="text-title tracking-[0.08em]">
              {westfield ? "WSTF 1044" : "7K2Q 9F4M"}
            </span>
            <button
              type="button"
              aria-label="Copy the code"
              className="press focus-ring rounded-small p-4 text-ds-muted"
              onClick={() => navigator.clipboard?.writeText(westfield ? "WSTF1044" : DEMO_CODE)}
            >
              <Copy size={18} />
            </button>
          </div>
          <p className="text-label">
            Shipment #{shipmentId} · {westfield ? "60 boxes of oil" : "120 crates of coffee"}
          </p>
          <p
            role="status"
            className="flex items-center gap-8 rounded-full bg-ds-canvas px-14 py-8 text-label"
          >
            <CircleNotch size={15} className="animate-spin motion-reduce:animate-none" />
            Waiting for them to scan
          </p>
          <p className="text-caption text-ds-muted">
            Turn your screen brightness up if the scan is slow.
          </p>
        </div>
      </div>
    );
  if (state === "K2.8")
    return (
      <div className="min-h-dvh bg-ds-canvas px-24">
        <ResultScreen
          fullScreen
          title="You got paid"
          description="Sent to your account seconds after Lena confirmed."
          recorded="Demo payment receipt"
          action="Back to trips"
          onAction={trips}
        >
          {/* Scales with the screen so "USDC" never runs off a 320 px phone. */}
          <div className="@container w-full text-center">
            <Money
              amount={amount}
              className="text-[clamp(32px,15.5cqw,56px)] leading-[1.07] font-medium tracking-[-0.03em]"
            />
          </div>
        </ResultScreen>
      </div>
    );

  return (
    <RoleShell role="driver" current={current} detail={detail}>
      {detail && (
        <button
          className="press focus-ring mb-20 flex items-center gap-8 rounded-small text-label text-ds-muted"
          onClick={trips}
        >
          <ArrowLeft size={18} />
          Trips
        </button>
      )}
      {state === "K2.13" && (
        <p
          role="status"
          className="mb-16 flex gap-10 rounded-small bg-ds-ink p-16 text-label text-ds-bg"
        >
          <WifiSlash size={18} className="shrink-0 text-ds-brand" />
          No signal. Your QR still works, and Waybil sends updates when you are back online.
        </p>
      )}
      <div className="mb-20 flex flex-wrap items-end justify-between gap-12 md:mb-24">
        <div>
          <h1 className="text-title md:text-amount">{title}</h1>
          <p className="mt-4 text-label text-ds-muted">
            {detail
              ? `#${shipmentId} · ${trip.company}`
              : state.startsWith("K1")
                ? state === "K1.2"
                  ? "The money is already in your account"
                  : state === "K1.3"
                    ? "Let us get your first trip"
                    : "2 trips this week"
                : current === "/driver/payouts"
                  ? "Money paid to you when goods arrive"
                  : "Shipping companies that can send you trips"}
          </p>
        </div>
        {detail && (
          <StatusPill
            label={
              state === "K2.11" ? "Paid" : ["K2.9", "K2.10"].includes(state) ? "On hold" : undefined
            }
            status={
              state === "K2.14"
                ? "cancelled"
                : state === "K2.11"
                  ? "paidEarly"
                  : ["K2.9", "K2.10"].includes(state)
                    ? "disputed"
                    : ["K2.6", "K2.7"].includes(state)
                      ? "delivered"
                      : ["K2.1", "K2.2", "K2.3"].includes(state)
                        ? "approved"
                        : "inTransit"
            }
          />
        )}
      </div>

      {state === "K1.3" ? (
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
      ) : state.startsWith("K1") ? (
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
              <Panel title="On hold · #1041" className="bg-ds-danger-soft">
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
                title="On the road · #1041"
                action={
                  <button className="link focus-ring text-caption" onClick={() => openTrip("K2.4")}>
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
                    href={MAPS}
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
              <p className="text-caption text-ds-muted">#1044 · {westfieldTrip.company}</p>
              {westfieldCancelled ? (
                <>
                  <p className="text-label text-ds-muted">
                    {westfieldTrip.company} cancelled this trip. You don&apos;t need to pick it up.
                  </p>
                  <Button
                    variant="secondary"
                    icon={<ArrowRight size={17} />}
                    className="w-full justify-between md:w-fit"
                    onClick={() => openTrip("K2.14", 1044)}
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
                    onClick={() => openTrip("K2.1", 1044)}
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
              value={<Money amount={state === "K1.2" ? monthTotal : "604500000"} />}
              context={
                state === "K1.2"
                  ? "You were paid on arrival for four trips."
                  : "You were paid on arrival for three trips."
              }
            />
            <Panel
              title="Recent payouts"
              action={
                <Link className="link focus-ring text-caption" href="/driver/payouts">
                  See all
                </Link>
              }
            >
              <PayoutRows recent />
            </Panel>
          </div>
        </div>
      ) : current === "/driver/payouts" ? (
        <div className="flex flex-col gap-16">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
            <Stat
              className="w-full"
              tone="dark"
              label="This month"
              value={<Money amount={state === "K3.2" ? "0" : monthTotal} />}
              context={
                state === "K3.2"
                  ? "Your first payout shows up here."
                  : `${paid1041 ? 4 : 3} trips, each paid seconds after arrival.`
              }
            />
            <Stat
              className="w-full"
              label="In your wallet"
              value={
                <Money amount={state === "K3.2" ? "0" : (992100000n + latestPaid).toString()} />
              }
              context="The account you signed up with"
            />
          </div>
          <Panel>
            {state === "K3.2" ? (
              <div className="flex min-h-360 flex-col items-center justify-center gap-12 text-center">
                <ArrowDown size={56} />
                <h2 className="text-heading">No payouts yet</h2>
                <p className="text-body text-ds-muted">
                  Finish a trip and you will be paid the moment the warehouse confirms.
                </p>
              </div>
            ) : (
              <PayoutRows latest={latest} paid1041={paid1041} />
            )}
          </Panel>
        </div>
      ) : current === "/driver/companies" ? (
        <div className="flex flex-col gap-16">
          <>
            {state === "K3.4" && !accepted && (
              <Panel className="bg-ds-brand-soft">
                <div className="flex items-center gap-12">
                  <Avatar name="Atlas Cargo" />
                  <span className="min-w-0">
                    <span className="block text-body">Atlas Cargo wants to work with you</span>
                    <span className="block text-caption text-ds-muted">
                      Verified · paid on time 100%
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-10">
                  <Button onClick={() => setAccepted(true)}>Accept</Button>
                  <Button variant="secondary" icon={<X size={17} />} onClick={() => go("K3.3")}>
                    Not now
                  </Button>
                </div>
              </Panel>
            )}
            <Panel title="Connected">
              {["Northwind Freight Co.", "Blue Ridge", ...(accepted ? ["Atlas Cargo"] : [])].map(
                (name, i) => (
                  <div
                    key={name}
                    className="flex items-center gap-12 border-b border-ds-line py-16 last:border-0"
                  >
                    <Avatar name={name} />
                    <div className="flex-1">
                      <h3 className="text-body">{name}</h3>
                      <p className="text-caption text-ds-muted">
                        {i === 0 ? "Eastport · 3 trips with you" : "Millbrook · 1 trip with you"}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-6 rounded-full bg-ds-canvas py-6 pr-14 pl-11 text-caption">
                      <span
                        className={cn(
                          "size-7 rounded-full",
                          i === 0 ? "bg-ds-info" : "bg-ds-line-strong",
                        )}
                      />
                      {i === 0 ? "1 trip now" : "No trips now"}
                    </span>
                  </div>
                ),
              )}
            </Panel>
          </>
          <Panel title="Work with a new company" gap={12}>
            <p className="text-label text-ds-muted">
              Send them your link. When they connect, their trips show up here.
            </p>
            <ShareLink row />
          </Panel>
        </div>
      ) : (
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
                    They cancelled on {cancelledWhen}, before you picked up the goods. You
                    don&apos;t need to go to {trip.pickupPlace}.
                  </p>
                  <Button
                    icon={<ArrowLeft size={17} />}
                    className="w-full justify-between"
                    onClick={trips}
                  >
                    Back to trips
                  </Button>
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
                    href={MAPS}
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
      )}

      {sheet && (
        <ActionSheet
          wide={state === "K2.10"}
          stamp={state === "K2.3" ? <MapPin size={34} /> : undefined}
          title={
            state === "K2.2"
              ? "Confirm pickup"
              : state === "K2.3"
                ? "Allow location while driving"
                : state === "K2.10"
                  ? "Problem report"
                  : "What happened?"
          }
          onClose={() => go(state === "K2.10" ? reportBack : state === "K2.12" ? "K2.4" : "K2.1")}
          preview={preview}
        >
          {state === "K2.2" ? (
            <>
              <label className="flex items-center gap-12 rounded-row bg-ds-canvas p-16 text-label">
                <input
                  type="checkbox"
                  checked={loaded}
                  onChange={(e) => setLoaded(e.target.checked)}
                  className="size-20 shrink-0 accent-ds-ink"
                />
                All {westfield ? "60 boxes of oil" : "120 crates of coffee"} are loaded
              </label>
              <div className="flex items-center gap-12 rounded-row bg-ds-canvas p-16">
                <span className="text-label">
                  Share my location during this trip
                  <span className="mt-4 block text-caption text-ds-muted">
                    Northwind sees where the truck is. Stops when you arrive.
                  </span>
                </span>
                <Switch
                  checked={shareLocation}
                  onChange={setShareLocation}
                  label="Share my location during this trip"
                  className="ml-auto"
                />
              </div>
              <Button
                icon={<Package size={17} />}
                className="w-full justify-between"
                disabled={!loaded}
                onClick={pickup}
              >
                Confirm pickup
              </Button>
            </>
          ) : state === "K2.3" ? (
            <>
              <p className="text-body text-ds-muted">
                Your phone will ask next. Waybil only uses your location while a trip is on the
                road, and only Northwind can see it.
              </p>
              <Button
                className="w-full justify-between"
                onClick={() => {
                  if (preview) {
                    go("K2.4");
                    return;
                  }
                  navigator.geolocation?.getCurrentPosition(
                    () => go("K2.4"),
                    () => go("K2.4"),
                    { timeout: 10000 },
                  );
                  if (!navigator.geolocation) go("K2.4");
                }}
              >
                Continue
              </Button>
              <Button variant="quiet" className="w-full justify-center" onClick={() => go("K2.4")}>
                Not now
              </Button>
            </>
          ) : state === "K2.10" ? (
            <>
              <p className="text-caption text-ds-muted">From Lena at Harbor Hub · Nov 12, 15:31</p>
              <div className="grid grid-cols-3 gap-8">
                {report.photos.length
                  ? report.photos.map((photo, i) => (
                      <img
                        key={photo.name + i}
                        src={photo.src}
                        alt={photo.name}
                        className="h-120 w-full rounded-small object-cover"
                      />
                    ))
                  : [1, 2, 3].map((n) => (
                      <span
                        key={n}
                        aria-label={`Demo report photo ${n}`}
                        className="grid h-120 place-items-center rounded-small bg-ds-canvas"
                      >
                        <Package size={32} className="text-ds-muted" />
                      </span>
                    ))}
              </div>
              <div className="grid grid-cols-3 gap-8">
                {[
                  ["Expected", 120],
                  ["In good shape", report.goodQty],
                  ["Damaged", 120 - report.goodQty],
                ].map(([label, count]) => (
                  <div key={label} className="rounded-small bg-ds-canvas p-12">
                    <p className="text-caption text-ds-muted">{label}</p>
                    <p className={cn("mt-4 text-label", label === "Damaged" && "text-ds-danger")}>
                      {count} crates
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-label">Lena&apos;s note</p>
              <p className="text-body">{report.note}</p>
              <DemoRecord title="Demo report receipt" />
              <Button variant="quiet" onClick={() => go(reportBack)}>
                Close
              </Button>
            </>
          ) : (
            <>
              <p className="text-caption text-ds-muted">Northwind gets a message right away.</p>
              {/* One reason at a time, so these are radios: arrows move and pick, Tab leaves. */}
              <fieldset className="flex flex-col gap-8">
                <legend className="sr-only">What is the problem?</legend>
                {[
                  { label: "Running late", icon: <ClockCountdown size={18} /> },
                  { label: "Truck broke down", icon: <Wrench size={18} /> },
                  { label: "Accident", icon: <Warning size={18} /> },
                  { label: "Something else", icon: <ChatCircle size={18} /> },
                ].map((r) => (
                  <label
                    key={r.label}
                    className={cn(
                      "press relative flex cursor-pointer items-center gap-12 rounded-small p-14 text-left text-body has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ds-ink",
                      r.label === reason ? "bg-ds-brand-soft" : "bg-ds-canvas",
                    )}
                  >
                    <input
                      type="radio"
                      name="problem"
                      className="sr-only"
                      checked={r.label === reason}
                      onChange={() => setReason(r.label)}
                    />
                    <span className="shrink-0">{r.icon}</span>
                    {r.label}
                  </label>
                ))}
              </fieldset>
              <label className="text-label">
                What happened
                <textarea
                  className="focus-ring mt-8 min-h-100 w-full resize-y rounded-small bg-ds-canvas p-16 text-body"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <ButtonLink
                icon={<PaperPlaneTilt size={17} />}
                className="justify-between"
                href={`https://wa.me/?text=${encodeURIComponent(`Shipment #${shipmentId}. ${reason}. ${note}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Send to Northwind
              </ButtonLink>
            </>
          )}
        </ActionSheet>
      )}
      <p className="mt-24 text-center text-caption text-ds-muted">
        This demo uses sample data. It does not move money.
      </p>
    </RoleShell>
  );
}
