"use client";
import { useState } from "react";
import {
  billForDriverAmount,
  driverAmountForGoodUnits,
  formatUsdc,
  parseUsdc,
  type Shipment,
} from "@waybil/shared";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Money } from "@/components/elements/Money";
import { DemoMap } from "@/components/elements/DemoMap";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { TimelineStep } from "@/components/elements/TimelineStep";
import { KeyValue } from "@/components/elements/KeyValue";
import { ShipperPayment } from "./ShipperPayment";
import { StatusPill } from "@/components/elements/StatusPill";
import {
  Check,
  Pause,
  ArrowRight,
  ArrowUUpLeft,
  Info,
  Wallet,
  ChatCircle,
  FileText,
  Image as ImageIcon,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useDemoReport, useDemoSettlement } from "@/hooks/useDemoDelivery";
import { DEFAULT_REPORT, settleDemoReport } from "@/lib/demo-delivery";
import { cn } from "@/lib/cn";
import type { DemoShipmentRow, ShipperState } from "../data/fixtures";
export function ShipperDetail({
  state,
  shipment,
  go,
  preview,
  recorded,
  onCancel,
  trip,
}: {
  state: ShipperState;
  shipment: Shipment;
  go: (s: ShipperState) => void;
  preview: boolean;
  recorded?: string;
  onCancel: () => void;
  trip?: DemoShipmentRow;
}) {
  const savedReport = useDemoReport(),
    settlement = useDemoSettlement();
  const report = preview ? DEFAULT_REPORT : savedReport;
  const city = trip?.city ?? (shipment.id === 1036 ? "Riverton" : "Harbor City");
  const driver = trip?.driver ?? "Sam";
  const [choice, setChoice] = useState(state === "P3.10" ? "different" : "arrived");
  const [amount, setAmount] = useState("250.00");
  const [reason, setReason] = useState(
    "Agreed with Sam on the phone. The wet crates can still be sold at a lower price.",
  );
  const [error, setError] = useState("");
  const [back, setBack] = useState<ShipperState>("P3.6");
  const approved = ["P3.1", "P3.11"].includes(state),
    road = ["P3.2", "P3.3"].includes(state),
    repaid = state === "P3.5";
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
              : `Northwind paid for the ${report.goodQty} good crates.`,
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
        shipmentId={shipment.id}
        city={city}
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
          status={
            approved
              ? "approved"
              : road
                ? "inTransit"
                : held
                  ? "disputed"
                  : repaid
                    ? "repaid"
                    : "paidEarly"
          }
          label={held ? "Problem reported" : settled ? "Settled" : undefined}
        />
      </div>
      {held && (
        <Panel className="mb-24 gap-12 rounded-[22px] bg-ds-danger-result px-20 py-18">
          <h2 className="flex items-center gap-10 text-body font-medium">
            <WarningCircle size={20} className="shrink-0 text-ds-danger" />
            Harbor Hub reported a problem
          </h2>
          <p className="text-[14px] leading-[1.45] text-ds-ink-2">
            &ldquo;
            {preview && state !== "P3.7" ? "8 crates arrived wet, 4 torn open." : report.note}
            &rdquo;{" "}
            {state === "P3.7"
              ? "Sam can't be paid early until this is settled."
              : "Sam gets paid after you choose what to pay."}
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
            {`${preview ? `You paid for the ${report.goodQty} good crates.` : settlement.reason} Sam got ${formatUsdc(BigInt(preview ? "273000000" : settlement.amount))} USDC and your bill is now ${formatUsdc(BigInt(bill))} USDC.`}
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
        </Panel>
      )}
      <div className="grid items-start gap-16 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-16">
          <DemoMap
            controls
            paused={state === "P3.3"}
            truckLabel={
              state === "P3.2" ? { shipmentId: shipment.id, distance: "42 km to go" } : undefined
            }
            phase={approved ? "pickup" : road ? "road" : "arrived"}
            className="h-340 md:h-420 xl:h-560"
            appearance="shipment"
            label={
              approved
                ? "Waiting for pickup"
                : state === "P3.3"
                  ? "Driver's location is paused"
                  : road
                    ? "Live · updated 30 s ago"
                    : "Trip finished"
            }
          />
          {state === "P3.3" && (
            <p className="flex items-start gap-10 rounded-[16px] bg-ds-canvas px-16 py-14 text-[13.5px] leading-[1.45] text-ds-ink">
              <Info size={18} className="mt-1 shrink-0" />
              <span>
                Sam&apos;s phone stopped sharing location. The trip is still on.
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
            {!approved && !road && (
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
                  {held ? "Bill on hold" : repaid ? "Repaid on Dec 10" : "Your bill"}
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
                      ? "One day early. Your on-time record went up."
                      : settled
                        ? `Due Dec 11. It covers the ${report.goodQty} good crates.`
                        : "Due Dec 11, 2026 · in 29 days"}
                </p>
                {repaid ? (
                  <DemoRecord
                    title="Bill paid"
                    className="bg-ds-canvas rounded-[18px] px-16 py-12 [&>span:first-child]:size-32 [&>span:first-child>svg]:size-16 [&>span:nth-child(2)>span:first-child]:font-semibold"
                  />
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
            <Panel title="Progress" gap={4} titleClassName="text-[18px] leading-[1.2]">
              {[
                "Approved by you",
                "Picked up by Sam",
                "Arrived at Harbor Hub",
                settled
                  ? `Sam got ${formatUsdc(BigInt(preview ? "273000000" : settlement.amount))} USDC`
                  : "Sam paid early",
                "You repaid",
              ].map((title, i) => {
                const completed = repaid ? 5 : approved ? 1 : road ? 2 : held ? 3 : 4;
                const step =
                  settled && i === 4
                    ? "next"
                    : i < completed
                      ? "done"
                      : i === completed
                        ? held
                          ? "failed"
                          : "current"
                        : "next";
                const times = [
                  "Nov 12 · 08:02",
                  approved ? "Waiting for pickup" : "Nov 12 · 09:14",
                  road ? "About 1 h 20 min to go" : "Nov 12 · 15:36",
                  held
                    ? "On hold"
                    : settled
                      ? "Nov 13 · 10:20"
                      : `Nov 12 · 15:37 · ${formatUsdc(BigInt(shipment.advance))} USDC`,
                  repaid ? `Dec 10 · ${formatUsdc(BigInt(bill))} USDC` : "Due Dec 11",
                ];
                return (
                  <div
                    key={title}
                    /* The board joins the dots with a 2 px line, ink once the step is done. */
                    className={cn(
                      "relative py-10 after:absolute after:top-38 after:left-11 after:w-2 after:rounded-[1px]",
                      i === 4 ? "after:hidden" : i <= completed ? "after:h-27" : "after:h-16",
                      step === "done" && !(settled && i === 3)
                        ? "after:bg-ds-ink"
                        : "after:bg-ds-line-strong",
                    )}
                  >
                    {settled && i === 3 ? (
                      <div className="flex items-start gap-14">
                        <span className="grid size-24 shrink-0 place-items-center rounded-full bg-ds-check-soft text-ds-check-ink">
                          <Pause size={12} weight="bold" />
                        </span>
                        <span className="flex min-w-0 flex-col gap-2">
                          <span className="text-[14.5px] leading-[1.2] font-medium">{title}</span>
                          <span className="text-[12.5px] leading-[1.2] text-ds-check-ink">
                            {times[i]}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <TimelineStep
                        className={cn(
                          "w-full items-start [&>span:last-child>span]:leading-[1.2] [&>span:last-child>span:empty]:hidden",
                          step === "next" && "[&>span:last-child>span:first-child]:font-normal",
                          step === "failed" &&
                            "[&>span:first-child]:bg-ds-danger-result [&>span:last-child>span:last-child]:text-ds-danger",
                        )}
                        state={step}
                        title={title}
                        time={i <= completed && !(settled && i === 4) ? (times[i] ?? "") : ""}
                      />
                    )}
                  </div>
                );
              })}
              {approved && state !== "P3.11" && (
                <button
                  type="button"
                  className="focus-ring flex items-center gap-6 self-start pt-6 text-[13px] font-semibold text-ds-danger"
                  onClick={() => go("P3.11")}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="m18 6-12 12M6 6l12 12" />
                  </svg>
                  Cancel shipment
                </button>
              )}
            </Panel>
          </div>
          <Panel title="Trip" titleClassName="text-[18px] leading-[1.2]" className="gap-6">
            <div className="divide-y divide-ds-line [&>div>span]:leading-[1.2]">
              <KeyValue
                label="Driver"
                value={`${driver} · ${driver === "Jordan Lee" ? "JLE-118" : "NWF-204"}`}
              />
              <KeyValue label="Cargo" value={trip?.cargo ?? "120 crates of coffee"} />
              <KeyValue label="From" value="Main warehouse, Eastport" />
              <KeyValue label="To" value={city === "Harbor City" ? "Harbor Hub" : city} />
              <KeyValue
                label="Shipping fee"
                value={<Money amount={trip?.shipment.bill ?? "300000000"} />}
              />
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
        <ActionSheet
          title="Problem report"
          subtitle="From Lena at Harbor Hub · Nov 12, 15:31"
          appearance="shipment"
          wide
          className="gap-18 [&_h2]:text-[22px]"
          onClose={() => go(back)}
        >
          <div className="grid grid-cols-3 gap-8">
            {report.photos.length
              ? report.photos.map((p, i) => (
                  <img
                    key={p.name + i}
                    src={p.src}
                    alt={p.name}
                    className="h-120 w-full rounded-small object-cover"
                  />
                ))
              : [1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="grid h-120 place-items-center rounded-[16px] bg-ds-canvas"
                  >
                    <ImageIcon size={24} className="text-ds-muted" />
                  </span>
                ))}
          </div>
          <div className="grid grid-cols-3 gap-8">
            {[
              ["Expected", shipment.qty],
              ["In good shape", report.goodQty],
              ["Damaged", shipment.qty - report.goodQty],
            ].map(([label, count]) => (
              <div key={label} className="rounded-[14px] bg-ds-canvas px-14 py-12">
                <p className="text-caption text-ds-muted">{label}</p>
                <p
                  className={cn(
                    "mt-2 text-[16px] font-semibold",
                    label === "Damaged" && "text-ds-danger",
                  )}
                >
                  {count} {shipment.unit}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-6">
            <p className="text-[13px] text-ds-muted">Lena&apos;s note</p>
            <p className="text-body">&ldquo;{report.note}&rdquo;</p>
          </div>
          <DemoRecord
            title="Report recorded"
            className="rounded-[18px] px-16 py-12 [&>span:first-child]:size-32 [&>span:first-child>svg]:size-16 [&>span:nth-child(2)>span:first-child]:font-semibold"
          />
          <div className="flex flex-wrap justify-end gap-10 [&_button]:text-[15px]">
            <Button variant="quiet" onClick={() => go(back)}>
              Close
            </Button>
            {back !== "P3.9" && (
              <Button icon={<ArrowRight size={17} />} onClick={() => go("P3.8")}>
                Choose what to pay
              </Button>
            )}
          </div>
        </ActionSheet>
      )}
      {(state === "P3.8" || state === "P3.10") && (
        <ActionSheet
          title="How much should Sam get?"
          appearance="shipment"
          className={cn(
            "md:w-520",
            state === "P3.10" && "max-h-[calc(100dvh-16px)] gap-10 p-16 md:w-560",
          )}
          onClose={() => go("P3.6")}
          subtitle={
            state === "P3.10"
              ? "Agree on the amount with Sam first."
              : `Harbor Hub counted ${report.goodQty} good crates out of ${shipment.qty}.`
          }
        >
          <div className={cn("flex flex-col gap-10", state === "P3.10" && "gap-8")}>
            {[
              {
                id: "arrived",
                title: "Pay for what arrived",
                body: `Sam gets ${formatUsdc(arrivedAmount)} USDC for ${report.goodQty} of ${shipment.qty} crates. Your bill becomes ${formatUsdc(billForDriverAmount(arrivedAmount))} USDC.`,
              },
              {
                id: "full",
                title: "Pay in full",
                body: `Sam gets ${formatUsdc(BigInt(shipment.advance))} USDC. Your bill stays ${formatUsdc(BigInt(shipment.bill))} USDC.`,
              },
              {
                id: "different",
                title: "Pay a different amount",
                body: "Agree on it with Sam first and add a short reason.",
              },
            ].map((o) => (
              <div
                key={o.id}
                className={cn(
                  "rounded-[16px] border-[1.5px] p-16",
                  state === "P3.10" && "p-10",
                  choice === o.id
                    ? "border-ds-ink bg-ds-brand-soft"
                    : "border-transparent bg-ds-canvas",
                )}
              >
                <label className="flex cursor-pointer items-start gap-12">
                  <input
                    type="radio"
                    name="settlement"
                    checked={choice === o.id}
                    className="peer sr-only"
                    onChange={() => {
                      setChoice(o.id);
                      go(o.id === "different" ? "P3.10" : "P3.8");
                    }}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1 grid size-20 shrink-0 place-items-center rounded-full border-[1.5px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ds-ink",
                      choice === o.id
                        ? "border-ds-ink bg-ds-ink"
                        : "border-ds-line-strong bg-ds-bg",
                    )}
                  >
                    {choice === o.id && <span className="size-8 rounded-full bg-ds-brand" />}
                  </span>
                  <span>
                    <span className="block text-[15px] leading-[1.2] font-semibold">{o.title}</span>
                    {!(o.id === "different" && choice === o.id) && (
                      <span className="mt-3 block text-[13px] leading-[1.2] text-ds-ink-2">
                        {o.body}
                      </span>
                    )}
                  </span>
                </label>
                {o.id === "different" && choice === o.id && (
                  <div className="mt-9 flex flex-col gap-6">
                    <Input
                      label="Sam gets"
                      value={amount}
                      inputMode="decimal"
                      suffix="USDC"
                      className="gap-6 [&>div]:h-44 [&>label]:font-normal [&>label]:text-ds-ink-2 [&>div]:rounded-[12px] [&>div]:border-ds-ink [&>div]:bg-ds-bg [&>div]:px-14 [&>p]:text-ds-ink-2 [&_input]:text-[18px] [&_input]:font-semibold"
                      onChange={(e) => setAmount(e.target.value)}
                      error={
                        !validCustom || custom > BigInt(shipment.advance)
                          ? `Enter no more than ${formatUsdc(BigInt(shipment.advance))} USDC.`
                          : undefined
                      }
                      hint={`Your bill becomes ${formatUsdc(billForDriverAmount(custom))} USDC. It can't be more than ${formatUsdc(BigInt(shipment.advance))}.`}
                    />
                    <label className="flex flex-col gap-6 text-[13px] text-ds-ink-2">
                      Reason
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="h-72 w-full resize-none md:h-64 rounded-[12px] border-[1.5px] border-transparent bg-ds-bg p-12 text-[13px] leading-[1.2] font-normal outline-none focus:border-ds-ink focus-visible:outline-none"
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="flex items-start gap-10 rounded-[14px] bg-ds-canvas p-14 text-[13px] leading-[1.2] font-normal text-ds-ink-2">
            <Info size={18} className="mt-1 shrink-0" />
            <span>
              Sam and the investors see your choice. The {shipment.qty - report.goodQty} wet crates
              stay at Harbor Hub for you to collect.
            </span>
          </p>
          {error && (
            <p role="alert" className="text-label text-ds-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-10 [&_button]:text-[15px]">
            <Button variant="quiet" onClick={() => go("P3.6")}>
              Cancel
            </Button>
            <Button
              icon={<Check size={17} weight="bold" />}
              disabled={choice === "different" && !customValid}
              onClick={acceptSettlement}
            >
              Confirm
            </Button>
          </div>
        </ActionSheet>
      )}
      {state === "P3.11" && (
        <ActionSheet
          title={`Cancel shipment #${shipment.id}?`}
          subtitle="Sam hasn't picked it up yet."
          appearance="shipment"
          onClose={() => go("P3.1")}
        >
          <div className="flex flex-col gap-10 rounded-[14px] bg-ds-canvas p-16">
            <p className="flex items-start gap-10 text-[13px] leading-[1.2] font-normal text-ds-ink-2">
              <Wallet size={16} className="shrink-0 text-ds-ink-2" />
              The {formatUsdc(BigInt(shipment.bill))} USDC goes back to your limit.
            </p>
            <p className="flex items-start gap-10 text-[13px] leading-[1.2] font-normal text-ds-ink-2">
              <ChatCircle size={16} className="shrink-0 text-ds-ink-2" />
              Sam gets a WhatsApp message.
            </p>
            <p className="flex items-start gap-10 text-[13px] leading-[1.2] font-normal text-ds-ink-2">
              <ArrowUUpLeft size={16} className="shrink-0 text-ds-ink-2" />
              You can&apos;t undo this. You can make a new shipment anytime.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-10 [&_button]:text-[15px]">
            <Button variant="quiet" onClick={() => go("P3.1")}>
              Keep it
            </Button>
            <Button variant="danger" icon={<X size={17} />} onClick={onCancel}>
              Cancel shipment
            </Button>
          </div>
        </ActionSheet>
      )}
    </>
  );
}
