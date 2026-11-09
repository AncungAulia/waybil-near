"use client";
import { useEffect, useRef, useState } from "react";
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
import { ResultScreen } from "@/components/elements/ResultScreen";
import { StatusPill } from "@/components/elements/StatusPill";
import {
  Package,
  Check,
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
import { DEFAULT_REPORT, repayDemoBill, settleDemoReport } from "@/lib/demo-delivery";
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
  const [funded, setFunded] = useState(false);
  const [back, setBack] = useState<ShipperState>("P3.6");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
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
  const pay = () => {
    setError("");
    if (!preview && shipment.id === 1041 && !repayDemoBill()) {
      setError("This bill is not ready to be paid. Open the trip again.");
      return;
    }
    go("P4.2");
    timer.current = setTimeout(() => go("P4.4"), 600);
  };
  const inPay = state.startsWith("P4");
  if (state === "P4.4")
    return (
      <>
        <div className="mb-24">
          <h1 className="text-title md:text-amount">Eastport to {city}</h1>
          <p className="mt-4 text-label text-ds-muted">Shipment #{shipment.id}</p>
        </div>
        <ResultScreen
          title="Bill paid"
          description={`You paid ${formatUsdc(BigInt(bill))} USDC one day early. Your on-time record went up.`}
          recorded="Payment sent"
          action="Done"
          onAction={() => go("P3.5")}
        >
          <Panel className="text-left">
            <KeyValue label="Credit limit left" value="900 of 3,000 USDC" />
            <KeyValue label="Paid on time" value="100% · 10 of 10 bills" />
          </Panel>
        </ResultScreen>
      </>
    );

  return (
    <>
      <div className="mb-24 flex flex-wrap items-end justify-between gap-12">
        <div>
          <h1 className="text-title md:text-amount">Eastport to {city}</h1>
          <p className="mt-4 text-label text-ds-muted">Shipment #{shipment.id}</p>
        </div>
        {!inPay && (
          <StatusPill
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
        )}
      </div>
      {inPay ? (
        <Panel
          className="mx-auto w-full max-w-480 gap-20 p-24 md:p-32"
          title="Pay this bill"
          action={
            <button aria-label="Close" className="focus-ring p-4" onClick={() => go("P3.4")}>
              <X size={18} />
            </button>
          }
        >
          <p className="text-label text-ds-muted">Shipment #{shipment.id} · due Dec 11</p>
          <Money amount={bill} className="text-[36px] font-medium tracking-[-0.035em]" />
          <p className="text-caption text-ds-success">Paying 1 day early</p>
          <div className="flex items-center gap-12 rounded-row bg-ds-canvas p-16">
            <Wallet size={20} className="shrink-0 text-ds-muted" />
            <span>
              <span className="block text-[14px] font-medium">From your wallet</span>
              <span className="mt-4 block text-caption text-ds-muted">
                {`${formatUsdc(BigInt(state === "P4.3" && !funded ? "120000000" : "1250000000"))} USDC available`}
              </span>
            </span>
          </div>
          {state === "P4.2" && (
            <div className="flex flex-col gap-12">
              <TimelineStep
                className="w-full"
                state="done"
                title="Allow the payment"
                time="Done in your wallet"
              />
              <TimelineStep
                className="w-full"
                state="waiting"
                title={`Send ${formatUsdc(BigInt(bill))} USDC`}
                time="Approve it in your wallet"
              />
            </div>
          )}
          {state === "P4.3" && !funded && (
            <p className="flex items-start gap-10 text-[13.5px] text-ds-danger">
              <WarningCircle size={18} className="mt-1 shrink-0" />
              <span>You need 180.00 USDC more. Add USDC to your wallet, then try again.</span>
            </p>
          )}
          <Button
            className="w-full justify-between"
            disabled={state === "P4.3" && !funded}
            loading={state === "P4.2"}
            loadingLabel="Waiting for wallet"
            onClick={pay}
          >
            Pay {formatUsdc(BigInt(bill))} USDC
          </Button>
          {state === "P4.3" && !funded ? (
            <Button variant="quiet" onClick={() => setFunded(true)}>
              Get test USDC
            </Button>
          ) : (
            <p className="text-caption text-ds-muted">
              {state === "P4.2"
                ? "Two quick approvals. The first one only happens once."
                : "Investors get paid back, and your limit frees up right away."}
            </p>
          )}
          {error && (
            <p role="alert" className="text-label text-ds-danger">
              {error}
            </p>
          )}
        </Panel>
      ) : (
        <>
          <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div className="flex min-w-0 flex-col gap-16">
              {held && (
                <Panel className="bg-ds-danger-soft">
                  <h2 className="flex items-center gap-10 text-body font-medium">
                    <WarningCircle size={20} className="shrink-0 text-ds-danger" />
                    Harbor Hub reported a problem
                  </h2>
                  <p className="text-body text-ds-ink-2">
                    &ldquo;{report.note}&rdquo;{" "}
                    {state === "P3.7"
                      ? "Sam can't be paid early until this is settled."
                      : "Sam gets paid after you choose what to pay."}
                  </p>
                  <div className="flex flex-wrap gap-12 self-start">
                    {state === "P3.7" ? (
                      <Button
                        variant="secondary"
                        icon={<ImageIcon size={17} />}
                        onClick={openReport}
                      >
                        Read the report
                      </Button>
                    ) : (
                      <>
                        <Button icon={<ArrowRight size={17} />} onClick={() => go("P3.8")}>
                          Choose what to pay
                        </Button>
                        <Button
                          variant="secondary"
                          icon={<FileText size={17} />}
                          onClick={openReport}
                        >
                          Read report
                        </Button>
                      </>
                    )}
                  </div>
                </Panel>
              )}
              {settled && (
                <Panel className="bg-ds-success-soft">
                  <h2 className="flex items-center gap-10 text-body font-medium">
                    <WarningCircle size={20} className="shrink-0 text-ds-success" />
                    You chose what to pay
                  </h2>
                  <p className="text-body text-ds-ink-2">
                    {`${preview ? `You paid for the ${report.goodQty} good crates.` : settlement.reason} Sam got ${formatUsdc(BigInt(preview ? "273000000" : settlement.amount))} USDC and your bill is now ${formatUsdc(BigInt(bill))} USDC.`}
                  </p>
                  <Button
                    variant="secondary"
                    icon={<ImageIcon size={17} />}
                    className="self-start"
                    onClick={openReport}
                  >
                    Read the report
                  </Button>
                </Panel>
              )}
              <DemoMap
                controls
                phase={approved ? "pickup" : road ? "road" : "arrived"}
                className="h-340 md:h-460 lg:h-560"
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
                <p className="flex items-start gap-12 rounded-row bg-ds-bg p-16 text-[13.5px] text-ds-muted">
                  <Info size={18} className="mt-1 shrink-0" />
                  <span>
                    Sam&apos;s phone stopped sharing location. The trip is still on. You&apos;ll see
                    the next update when the app opens again.
                  </span>
                </p>
              )}
              {!approved && !road && (
                /* An open bill is the ink card with the brand glow, a held one the soft red card. */
                <Panel className={held ? "bg-ds-danger-soft" : repaid ? "" : "bill-card bg-ds-ink"}>
                  <p
                    className={cn(
                      "text-label",
                      held ? "text-ds-danger" : repaid ? "text-ds-muted" : "text-ds-brand",
                    )}
                  >
                    {held ? "Bill on hold" : repaid ? "Repaid on Dec 10" : "Your bill"}
                  </p>
                  <Money
                    amount={bill}
                    className={cn(
                      "text-[34px] font-medium tracking-[-0.03em]",
                      !held && !repaid && "text-ds-bg",
                    )}
                  />
                  <p
                    className={cn(
                      "text-label",
                      !held && !repaid ? "text-ds-on-night" : "text-ds-ink-2",
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
                    <DemoRecord title="Bill paid" />
                  ) : (
                    !held &&
                    !settled && (
                      <Button
                        variant="moment"
                        className="w-full justify-between md:w-fit"
                        onClick={() => go("P4.1")}
                      >
                        Pay early
                      </Button>
                    )
                  )}
                </Panel>
              )}
              {recorded && <DemoRecord title={recorded} />}
            </div>
            <div className="flex min-w-0 flex-col gap-16">
              <Panel title="Progress">
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
                    i < completed
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
                        "relative pb-20 after:absolute after:top-30 after:-bottom-6 after:left-11 after:w-2 after:rounded-full last:pb-0 last:after:hidden",
                        step === "done" ? "after:bg-ds-ink" : "after:bg-ds-line-strong",
                      )}
                    >
                      <TimelineStep
                        className="w-full"
                        state={step}
                        title={title}
                        time={i <= completed && !(settled && i === 4) ? (times[i] ?? "") : ""}
                      />
                    </div>
                  );
                })}
                {approved && state !== "P3.11" && (
                  <Button
                    variant="danger"
                    icon={<X size={17} />}
                    className="self-start"
                    onClick={() => go("P3.11")}
                  >
                    Cancel shipment
                  </Button>
                )}
              </Panel>
              <Panel title="Trip">
                <div>
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
                  className="justify-between"
                  href="https://wa.me/?text=Hello%20Sam%2C%20about%20our%20Waybil%20shipment."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chat with Sam
                </ButtonLink>
              </Panel>
            </div>
          </div>
          {state === "P3.7" && (
            <ActionSheet title="Problem report" wide onClose={() => go(back)}>
              <p className="text-caption text-ds-muted">From Lena at Harbor Hub · Nov 12, 15:31</p>
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
                        className="grid h-120 place-items-center rounded-small bg-ds-canvas"
                      >
                        <Package size={28} className="text-ds-muted" />
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
                    <p className={cn("mt-4 text-[16px]", label === "Damaged" && "text-ds-danger")}>
                      {count} boxes
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-caption text-ds-muted">Lena&apos;s note</p>
              <p className="text-body">&ldquo;{report.note}&rdquo;</p>
              <DemoRecord title="Report recorded on NEAR" />
              <div className="flex justify-end gap-12">
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
            <ActionSheet title="How much should Sam get?" wide onClose={() => go("P3.6")}>
              <p className="text-label text-ds-muted">
                {state === "P3.10"
                  ? "Agree on the amount with Sam first."
                  : `Harbor Hub counted ${report.goodQty} good crates out of 120.`}
              </p>
              {[
                {
                  id: "arrived",
                  title: "Pay for what arrived",
                  body: `Sam gets ${formatUsdc(arrivedAmount)} USDC for ${report.goodQty} of 120 crates. Your bill becomes ${formatUsdc(billForDriverAmount(arrivedAmount))} USDC.`,
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
                <label
                  key={o.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-12 rounded-row border p-16",
                    choice === o.id
                      ? "border-ds-ink bg-ds-brand-soft"
                      : "border-transparent bg-ds-canvas",
                  )}
                >
                  <input
                    type="radio"
                    name="settlement"
                    checked={choice === o.id}
                    className="mt-2 size-20 shrink-0 accent-ds-ink"
                    onChange={() => {
                      setChoice(o.id);
                      if (o.id === "different") go("P3.10");
                    }}
                  />
                  <span>
                    <span className="block text-label">{o.title}</span>
                    <span className="mt-4 block text-caption text-ds-muted">{o.body}</span>
                  </span>
                </label>
              ))}
              {choice === "different" && (
                <>
                  <Input
                    label="Sam gets"
                    value={amount}
                    inputMode="decimal"
                    suffix="USDC"
                    onChange={(e) => setAmount(e.target.value)}
                    error={
                      !validCustom || custom > BigInt(shipment.advance)
                        ? `Enter no more than ${formatUsdc(BigInt(shipment.advance))} USDC.`
                        : undefined
                    }
                    hint={`Your bill becomes ${formatUsdc(billForDriverAmount(custom))} USDC. It can't be more than ${formatUsdc(BigInt(shipment.advance))}.`}
                  />
                  <Input
                    label="Reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </>
              )}
              <p className="flex items-start gap-10 text-label font-normal text-ds-muted">
                <Info size={18} className="mt-1 shrink-0" />
                <span>
                  Sam and the investors see your choice. The {120 - report.goodQty} wet crates stay
                  at Harbor Hub for you to collect.
                </span>
              </p>
              {error && (
                <p role="alert" className="text-label text-ds-danger">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-12">
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
            <ActionSheet title={`Cancel shipment #${shipment.id}?`} onClose={() => go("P3.1")}>
              <p className="text-label text-ds-muted">Sam hasn&apos;t picked it up yet.</p>
              <p className="flex items-center gap-10 text-label font-normal">
                <Wallet size={18} className="shrink-0 text-ds-muted" />
                The {formatUsdc(BigInt(shipment.bill))} USDC goes back to your limit.
              </p>
              <p className="flex items-center gap-10 text-label font-normal">
                <ChatCircle size={18} className="shrink-0 text-ds-muted" />
                Sam gets a WhatsApp message.
              </p>
              <p className="flex items-center gap-10 text-label font-normal">
                <ArrowUUpLeft size={18} className="shrink-0 text-ds-muted" />
                You can&apos;t undo this. You can make a new shipment anytime.
              </p>
              <div className="flex justify-end gap-12">
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
      )}
    </>
  );
}
