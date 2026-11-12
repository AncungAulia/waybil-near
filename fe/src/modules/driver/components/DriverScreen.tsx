"use client";

import { greeting } from "@/components/elements/Greeting";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiSlash } from "@phosphor-icons/react";
import { RoleShell } from "@/components/layout/RoleShell";
import { BackLink } from "@/components/elements/BackLink";
import { StatusPill } from "@/components/elements/StatusPill";
import { useDemoDelivery, useDemoReport, useDemoSettlement } from "@/hooks/useDemoDelivery";
import { DEFAULT_REPORT } from "@/lib/demo-delivery";
import { cancelMoment, useDemoCancelled } from "@/lib/demo-cancel";
import {
  DEFAULT_PROBLEM,
  DEFAULT_PROBLEM_NOTE,
  DRIVER_CANCELLED_AT,
  DRIVER_FIXTURES,
  DRIVER_TRIPS,
  MAIN_TRIP_ID,
  MAIN_TRIP_PAYOUT,
  MONTH_PAID_BEFORE,
  WESTFIELD_ADVANCE,
  WESTFIELD_BILL,
  WESTFIELD_TRIP_ID,
  type DriverState,
} from "../data/fixtures";
import { Companies } from "./Companies";
import { Payouts } from "./Payouts";
import { TripDetail } from "./TripDetail";
import { PaidScreen, ShowQr } from "./TripFullScreens";
import { TripSheet } from "./TripSheet";
import { NoTrips, TripsList } from "./TripsList";

export function DriverScreen({
  initialState = "K1.1",
  preview = false,
  shipmentId = MAIN_TRIP_ID,
}: {
  initialState?: DriverState;
  preview?: boolean;
  shipmentId?: number;
}) {
  const [localState, setState] = useState<DriverState>(initialState);
  const [loaded, setLoaded] = useState(true);
  const [shareLocation, setShareLocation] = useState(true);
  const [offline, setOffline] = useState(false);
  const [reason, setReason] = useState(DEFAULT_PROBLEM);
  const [note, setNote] = useState(DEFAULT_PROBLEM_NOTE);
  const [accepted, setAccepted] = useState(false);
  const [reportBack, setReportBack] = useState<DriverState>("K2.9");
  const delivery = useDemoDelivery();
  const savedReport = useDemoReport();
  const settlement = useDemoSettlement();
  /* Trips the shipper cancelled before pickup. The gallery never reads the demo store. */
  const cancelled = useDemoCancelled();
  const westfieldCancelled = !preview && cancelled.has(WESTFIELD_TRIP_ID);
  const report = preview ? DEFAULT_REPORT : savedReport;
  const settlementPaid = !preview && ["settled", "repaid"].includes(delivery) && settlement.active;
  const latest = settlementPaid ? settlement.amount : MAIN_TRIP_PAYOUT;
  /* In the gallery #1041 is shown paid. Live, it counts only after the warehouse confirmed it. */
  const paid1041 = preview || ["paid", "settled", "repaid"].includes(delivery);
  const latestPaid = paid1041 ? BigInt(latest) : 0n;
  const monthTotal = (MONTH_PAID_BEFORE + latestPaid).toString();
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
  if (!preview && shipmentId === MAIN_TRIP_ID) {
    if (state === "K1.1" && ["paid", "settled", "repaid"].includes(delivery)) state = "K1.2";
    if (["K2.4", "K2.5", "K2.6", "K2.7", "K2.9", "K2.10", "K2.13"].includes(state)) {
      if (delivery === "settled" || (delivery === "repaid" && settlement.active)) state = "K2.11";
      else if (delivery === "paid" || delivery === "repaid") state = "K2.8";
      else if (delivery === "reported") state = "K2.9";
      else if (offline && state !== "K2.5") state = "K2.13";
    }
  }
  const shipment = DRIVER_FIXTURES[state];
  const westfield = shipmentId === WESTFIELD_TRIP_ID;
  const trip = DRIVER_TRIPS[shipmentId] ?? DRIVER_TRIPS[MAIN_TRIP_ID]!;
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
  const openTrip = (s: DriverState, id = MAIN_TRIP_ID) => {
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
        ? `${greeting()}, Sam`
        : state.startsWith("K3")
          ? ["K3.1", "K3.2"].includes(state)
            ? "Payouts"
            : "Companies"
          : `${trip.from} to ${trip.to}`;
  const amount = westfield ? WESTFIELD_ADVANCE : shipment.advance;
  const bill = westfield ? WESTFIELD_BILL : BigInt(shipment.bill);
  const sheet = ["K2.2", "K2.3", "K2.10", "K2.12"].includes(state);

  if (state === "K2.5")
    return <ShowQr westfield={westfield} shipmentId={shipmentId} onClose={() => go("K2.4")} />;
  if (state === "K2.8")
    return (
      <PaidScreen
        amount={amount}
        onBack={trips}
        onPayouts={() => (preview ? go("K3.1") : router.push("/driver/payouts"))}
      />
    );

  return (
    <RoleShell role="driver" current={current} detail={detail}>
      {detail && (
        <BackLink onClick={trips} className="mb-20">
          Trips
        </BackLink>
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
          <h1 suppressHydrationWarning className="text-title break-words md:text-amount">
            {title}
          </h1>
          <p className="mt-4 text-label text-ds-muted">
            {detail
              ? `#${shipmentId} for ${trip.company}`
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
        <NoTrips />
      ) : state.startsWith("K1") ? (
        <TripsList
          state={state}
          preview={preview}
          shipment={shipment}
          settlement={settlement}
          latest={latest}
          monthTotal={monthTotal}
          onHold={onHold}
          westfieldCancelled={westfieldCancelled}
          openTrip={openTrip}
        />
      ) : current === "/driver/payouts" ? (
        <Payouts
          state={state}
          latest={latest}
          latestPaid={latestPaid}
          monthTotal={monthTotal}
          paid1041={paid1041}
        />
      ) : current === "/driver/companies" ? (
        <Companies state={state} accepted={accepted} onAccept={() => setAccepted(true)} go={go} />
      ) : (
        <TripDetail
          state={state}
          preview={preview}
          trip={trip}
          shipment={shipment}
          amount={amount}
          bill={bill}
          report={report}
          settlement={settlement}
          cancelledWhen={cancelledWhen}
          go={go}
          openReport={openReport}
        />
      )}

      {sheet && (
        <TripSheet
          state={state}
          preview={preview}
          westfield={westfield}
          shipmentId={shipmentId}
          report={report}
          reportBack={reportBack}
          go={go}
          pickup={pickup}
          loaded={loaded}
          setLoaded={setLoaded}
          shareLocation={shareLocation}
          setShareLocation={setShareLocation}
          reason={reason}
          setReason={setReason}
          note={note}
          setNote={setNote}
        />
      )}
      <p className="mt-24 text-center text-caption text-ds-muted">
        This demo uses sample data. It does not move money.
      </p>
    </RoleShell>
  );
}
