"use client";
import { useState } from "react";
import { driverAmountForGoodUnits, formatUsdc, parseUsdc, type Shipment } from "@waybil/shared";
import { Panel } from "@/components/layout/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { DemoMap } from "@/components/elements/DemoMap";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { KeyValue } from "@/components/elements/KeyValue";
import { ShipperPayment } from "./ShipperPayment";
import { StatusPill } from "@/components/elements/StatusPill";
import {
  Check,
  ArrowRight,
  Info,
  Wallet,
  ChatCircle,
  FileText,
  Image as ImageIcon,
  WarningCircle,
} from "@phosphor-icons/react";
import { useDemoReport, useDemoSettlement } from "@/hooks/useDemoDelivery";
import { DEFAULT_REPORT, settleDemoReport } from "@/lib/demo-delivery";
import { cn } from "@/lib/cn";
import { statusChip } from "@/lib/status";
import {
  COVERED_TODAY,
  SHIPMENTS,
  type DemoShipmentRow,
  type ShipperState,
} from "../data/fixtures";
import { DEMO_NOW, dueSummary, millis, shortDate, timing } from "../data/dates";
import { ShipperProgress } from "./detail/ShipperProgress";
import { SettleSheet } from "./detail/SettleSheet";
import { CancelSheet, ReportSheet, TalkSheet } from "./detail/DetailSheets";

/* The board names each destination by its place, and the receiver who works there. */
const PLACES: Record<string, { name: string; receiver?: string }> = {
  "Harbor City": { name: "Harbor Hub", receiver: "Lena" },
  Millbrook: { name: "Millbrook depot", receiver: "Chris" },
  Riverton: { name: "Riverton branch" },
};
const PLATES: Record<string, string> = { Sam: "NWF-204", "Jordan Lee": "JLE-118" };
export function ShipperDetail({
  state,
  shipment,
  go,
  preview,
  recorded,
  onCancel,
  trip,
  usedBefore,
  record,
  cancelledAt,
}: {
  state: ShipperState;
  shipment: Shipment;
  go: (s: ShipperState) => void;
  preview: boolean;
  recorded?: string;
  onCancel: () => void;
  trip?: DemoShipmentRow;
  usedBefore: bigint;
  record: { onTime: number; total: number };
  /** When the shipper cancelled it, in milliseconds. Only known in the browser. */
  cancelledAt?: number;
}) {
  const savedReport = useDemoReport(),
    settlement = useDemoSettlement();
  const report = preview ? DEFAULT_REPORT : savedReport;
  const city = trip?.city ?? "Harbor City";
  const driver = trip?.driver ?? "Sam";
  const place = PLACES[city]?.name ?? city;
  const receiver = PLACES[city]?.receiver;
  const unit = shipment.unit;
  const due = millis(shipment.due_at)!;
  const repaidAt = millis(shipment.repaid_at);
  /* The fee stays what was approved, even after a settled report lowers the bill. */
  const fee =
    SHIPMENTS.find((r) => r.shipment.id === shipment.id)?.shipment.bill ??
    trip?.shipment.bill ??
    shipment.bill;
  const [choice, setChoice] = useState(state === "P3.10" ? "different" : "arrived");
  const [amount, setAmount] = useState("250.00");
  const [reason, setReason] = useState(
    `Agreed with ${driver} on the phone. The wet ${unit} can still be sold at a lower price.`,
  );
  const [error, setError] = useState("");
  const [talk, setTalk] = useState(false);
  const [back, setBack] = useState<ShipperState>("P3.6");
  const approved = ["P3.1", "P3.11"].includes(state),
    road = ["P3.2", "P3.3"].includes(state),
    repaid = state === "P3.5",
    cancelled = state === "P3.12",
    covered = state === "P3.13";
  /* The gallery's covered bill keeps its own "today", the day the reserve paid it. */
  const coveredAt = millis(trip?.covered) ?? DEMO_NOW;
  const now = preview && covered ? COVERED_TODAY : DEMO_NOW;
  const held = ["P3.6", "P3.7", "P3.8", "P3.10"].includes(state),
    settled = state === "P3.9";
  const bill = settled ? (preview ? "280000000" : settlement.bill) : shipment.bill;
  const openReport = () => {
    setBack(settled ? "P3.9" : "P3.6");
    go("P3.7");
  };
  const arrivedAmount = held
    ? driverAmountForGoodUnits(BigInt(shipment.bill), report.goodQty, shipment.qty)
    : 0n;
  let custom = 0n,
    validCustom = true;
  try {
    custom = parseUsdc(amount);
  } catch {
    validCustom = false;
  }
  const chosen =
    choice === "arrived" ? arrivedAmount : choice === "full" ? BigInt(shipment.advance) : custom;
  const customValid = validCustom && custom <= BigInt(shipment.advance) && !!reason.trim();
  const acceptSettlement = () => {
    setError("");
    try {
      if (
        !preview &&
        !settleDemoReport(
          chosen.toString(),
          choice === "different"
            ? reason
            : choice === "full"
              ? "Northwind paid the full fee."
              : `Northwind paid for the ${report.goodQty} good ${unit}.`,
        )
      ) {
        setError("This report has changed. Open the trip again.");
        return;
      }
      go("P3.9");
    } catch {
      setError("Your choice was not saved. Please try again.");
    }
  };
  if (state.startsWith("P4")) {
    return (
      <ShipperPayment
        state={state}
        bill={bill}
        shipment={shipment}
        city={city}
        usedBefore={usedBefore}
        record={record}
        preview={preview}
        go={go}
      />
    );
  }
  return (
    <>
      <div className="mb-24 flex flex-col items-start justify-between gap-12 md:flex-row md:items-end">
        <div>
          <h1 className="text-[30px] leading-[32px] tracking-[-0.03em] md:text-[40px] md:leading-[42px]">
            Eastport to {city}
          </h1>
          <p className="mt-6 text-label text-ds-muted">Shipment #{shipment.id}</p>
        </div>
        <StatusPill
          className="bg-ds-bg px-12"
          status={statusChip(shipment)}
          label={held ? "Problem reported" : settled ? "Settled" : undefined}
        />
      </div>
      {held && (
        <Panel className="mb-24 gap-12 rounded-[22px] bg-ds-danger-result px-20 py-18">
          <h2 className="flex items-center gap-10 text-body font-medium">
            <WarningCircle size={20} className="shrink-0 text-ds-danger" />
            {place} reported a problem
          </h2>
          <p className="text-[14px] leading-[1.45] text-ds-ink-2">
            &ldquo;
            {preview && state !== "P3.7" ? "8 crates arrived wet, 4 torn open." : report.note}
            &rdquo;{" "}
            {state === "P3.7"
              ? `${driver} can't be paid early until this is settled.`
              : `${driver} gets paid after you choose what to pay.`}
          </p>
          <div className="flex flex-wrap gap-10 self-start [&_button]:h-44 [&_button]:gap-32">
            {state === "P3.7" ? (
              <Button variant="secondary" icon={<ImageIcon size={17} />} onClick={openReport}>
                Read the report
              </Button>
            ) : (
              <>
                <Button icon={<ArrowRight size={17} />} onClick={() => go("P3.8")}>
                  Choose what to pay
                </Button>
                <Button variant="secondary" icon={<FileText size={17} />} onClick={openReport}>
                  Read report
                </Button>
              </>
            )}
          </div>
        </Panel>
      )}
      {settled && (
        <Panel className="mb-24 gap-12 rounded-[22px] bg-ds-check-soft px-20 py-18">
          <h2 className="flex items-center gap-10 text-body font-medium">
            <Check size={20} className="shrink-0 text-ds-success" />
            You chose what to pay
          </h2>
          <p className="text-[14px] leading-[1.45] text-ds-ink-2">
            {`${preview ? `You paid for the ${report.goodQty} good ${unit}.` : settlement.reason} ${driver} got ${formatUsdc(BigInt(preview ? "273000000" : settlement.amount))} USDC and your bill is now ${formatUsdc(BigInt(bill))} USDC.`}
          </p>
          <Button
            variant="secondary"
            icon={
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            }
            className="h-44 gap-32 self-start"
            onClick={openReport}
          >
            Read the report
          </Button>
          <DemoRecord
            title="Choice recorded"
            className="rounded-[18px] px-16 py-12 [&>span:first-child]:size-32 [&>span:first-child>svg]:size-16 [&>span:nth-child(2)>span:first-child]:font-semibold"
          />
        </Panel>
      )}
      <div className="grid items-start gap-16 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-16">
          <DemoMap
            controls
            destination={place}
            paused={state === "P3.3"}
            truckLabel={
              state === "P3.2" ? { shipmentId: shipment.id, distance: "42 km to go" } : undefined
            }
            phase={cancelled ? "cancelled" : approved ? "pickup" : road ? "road" : "arrived"}
            className="h-340 md:h-420 xl:h-560"
            appearance="shipment"
            label={
              cancelled
                ? "Cancelled before pickup"
                : approved
                  ? "Waiting for pickup"
                  : state === "P3.3"
                    ? "Driver's location is paused"
                    : road
                      ? "Live location, updated 30 s ago"
                      : "Trip finished"
            }
          />
          {state === "P3.3" && (
            <p className="flex items-start gap-10 rounded-[16px] bg-ds-canvas px-16 py-14 text-[13.5px] leading-[1.45] text-ds-ink">
              <Info size={18} className="mt-1 shrink-0" />
              <span>
                {driver}&apos;s phone stopped sharing location. The trip is still on.
                <span className="hidden xl:inline">
                  {" "}
                  You&apos;ll see the next update when the app opens again.
                </span>
              </span>
            </p>
          )}
          {recorded && <DemoRecord title={recorded} />}
        </div>
        <div className="grid min-w-0 items-start gap-16 md:grid-cols-2 xl:flex xl:flex-col">
          <div className="flex w-full min-w-0 flex-col gap-16">
            {cancelled && (
              <Panel gap={12}>
                <h2 className="flex items-center gap-10 text-body font-medium">
                  <Wallet size={20} className="shrink-0" />
                  {formatUsdc(BigInt(shipment.bill))} USDC is back in your limit
                </h2>
                <p className="text-[13.5px] leading-[1.45] text-ds-ink-2">
                  {driver} got a WhatsApp message that the trip is off. Nothing was paid out.
                </p>
              </Panel>
            )}
            {!approved && !road && !cancelled && (
              /* Only an open bill uses the dark card. */
              <Panel
                gap={12}
                className={
                  held ? "bg-ds-danger-result" : repaid || settled ? "" : "bill-card bg-ds-ink"
                }
              >
                <p
                  className={cn(
                    "text-label",
                    held
                      ? "text-ds-danger"
                      : repaid || settled
                        ? settled
                          ? "text-ds-check-ink"
                          : "text-ds-success"
                        : "text-ds-brand",
                  )}
                >
                  {held
                    ? "Bill on hold"
                    : covered
                      ? "You still owe"
                      : repaid
                        ? `Repaid on ${shortDate(repaidAt ?? due)}`
                        : "Your bill"}
                </p>
                <Money
                  amount={bill}
                  className={cn(
                    "text-[34px] leading-[1.2] font-medium tracking-[-0.03em]",
                    !held && !repaid && !settled && "text-ds-bg",
                  )}
                />
                <p
                  className={cn(
                    "text-[13.5px] leading-[1.45] font-normal",
                    !held && !repaid && !settled ? "text-ds-on-night" : "text-ds-ink-2",
                  )}
                >
                  {held
                    ? "Nothing is due while the problem is open."
                    : repaid
                      ? repaidNote(shipment.due_at, repaidAt)
                      : settled
                        ? `Due ${shortDate(due)}. It covers the ${report.goodQty} good ${unit}.`
                        : covered
                          ? `Due ${dueSummary(shipment.due_at, now)}`
                          : dueSummary(shipment.due_at)}
                </p>
                {repaid ? (
                  <DemoRecord
                    title="Bill paid"
                    className="bg-ds-canvas rounded-[18px] px-16 py-12 [&>span:first-child]:size-32 [&>span:first-child>svg]:size-16 [&>span:nth-child(2)>span:first-child]:font-semibold"
                  />
                ) : covered ? (
                  /* A covered bill can't be paid in the app. The team settles it with you. */
                  <Button
                    variant="moment"
                    icon={<ChatCircle size={17} />}
                    className="h-52 w-full justify-between"
                    onClick={() => setTalk(true)}
                  >
                    Talk to the Waybil team
                  </Button>
                ) : (
                  !held &&
                  !settled && (
                    <Button
                      variant="moment"
                      className="h-52 w-full justify-between"
                      onClick={() => go("P4.1")}
                    >
                      Pay early
                    </Button>
                  )
                )}
              </Panel>
            )}
            <ShipperProgress
              state={state}
              shipment={shipment}
              go={go}
              driver={driver}
              place={place}
              bill={bill}
              driverGot={preview ? "273000000" : settlement.amount}
              due={due}
              repaidAt={repaidAt}
              coveredAt={coveredAt}
              cancelledAt={cancelledAt}
              approved={approved}
              road={road}
              held={held}
              settled={settled}
              repaid={repaid}
              cancelled={cancelled}
              covered={covered}
            />
            {covered && (
              <div className="flex flex-col gap-4 rounded-[14px] bg-ds-canvas px-16 py-14">
                <h2 className="text-[14.5px] font-medium">New shipments are paused</h2>
                <p className="text-[13.5px] leading-[1.45] text-ds-ink-2">
                  {driver} was paid and the pool is whole. Settle the {formatUsdc(BigInt(bill))}{" "}
                  USDC with our team to ship again.
                </p>
              </div>
            )}
          </div>
          <Panel title="Trip" titleClassName="text-[18px] leading-[1.2]" className="gap-6">
            <div className="divide-y divide-ds-line [&>div>span]:leading-[1.2]">
              <KeyValue
                label="Driver"
                value={PLATES[driver] ? `${driver}, truck ${PLATES[driver]}` : driver}
              />
              <KeyValue label="Cargo" value={trip?.cargo ?? "120 crates of coffee"} />
              <KeyValue label="From" value="Main warehouse, Eastport" />
              <KeyValue label="To" value={place} />
              <KeyValue label="Shipping fee" value={<Money amount={fee} />} />
            </div>
            <ButtonLink
              variant="secondary"
              icon={<ChatCircle size={17} />}
              className="mt-10 h-52 justify-between"
              href={`https://wa.me/?text=${encodeURIComponent(`Hello ${driver}, about our Waybil shipment.`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat with {driver}
            </ButtonLink>
          </Panel>
        </div>
      </div>
      {state === "P3.7" && (
        <ReportSheet
          shipment={shipment}
          report={report}
          place={place}
          receiver={receiver}
          back={back}
          go={go}
        />
      )}
      {(state === "P3.8" || state === "P3.10") && (
        <SettleSheet
          state={state}
          shipment={shipment}
          report={report}
          driver={driver}
          place={place}
          unit={unit}
          arrivedAmount={arrivedAmount}
          choice={choice}
          setChoice={setChoice}
          amount={amount}
          setAmount={setAmount}
          reason={reason}
          setReason={setReason}
          custom={custom}
          validCustom={validCustom}
          customValid={customValid}
          error={error}
          acceptSettlement={acceptSettlement}
          go={go}
        />
      )}
      {covered && talk && (
        <TalkSheet shipment={shipment} bill={bill} onClose={() => setTalk(false)} />
      )}
      {state === "P3.11" && (
        <CancelSheet shipment={shipment} driver={driver} go={go} onCancel={onCancel} />
      )}
    </>
  );
}

/** What the repaid card says under the amount, from the due date and the day it was paid. */
function repaidNote(dueAt: string, repaidAt?: number) {
  const when = timing(dueAt, repaidAt);
  return when.endsWith("late") ? `Paid ${when}.` : `Paid ${when}. Your on-time record went up.`;
}
