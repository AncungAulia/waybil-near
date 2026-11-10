"use client";

import { useEffect, useRef, useState } from "react";
import { formatUsdc } from "@waybil/shared";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { KeyValue } from "@/components/elements/KeyValue";
import { repayDemoBill } from "@/lib/demo-delivery";
import { cn } from "@/lib/cn";
import type { ShipperState } from "../data/fixtures";

export function ShipperPayment({
  state,
  bill,
  shipmentId,
  city,
  preview,
  go,
}: {
  state: ShipperState;
  bill: string;
  shipmentId: number;
  city: string;
  preview: boolean;
  go: (state: ShipperState) => void;
}) {
  const [funded, setFunded] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const waiting = state === "P4.2";
  const paid = state === "P4.4";
  const available = state === "P4.3" && !funded ? 120000000n : 1250000000n;
  const shortfall = BigInt(bill) > available ? BigInt(bill) - available : 0n;
  const insufficient = shortfall > 0n;
  const close = () => go(paid ? "P3.5" : "P3.4");

  const pay = () => {
    if (waiting || insufficient) return;
    setError("");
    go("P4.2");
    timer.current = setTimeout(() => {
      if (!preview && shipmentId === 1041 && !repayDemoBill()) {
        setError("This bill is not ready to be paid. Open the trip again.");
        go("P4.1");
        return;
      }
      go("P4.4");
    }, 600);
  };

  return (
    <>
      <div className="mb-24">
        <h1 className="text-[30px] leading-[32px] font-medium tracking-[-0.03em] md:text-[40px] md:leading-[42px]">
          Eastport to {city}
        </h1>
        <p className="mt-6 text-[14px] leading-[17px] text-ds-muted">Shipment #{shipmentId}</p>
      </div>
      <div aria-hidden className="grid h-520 gap-16 xl:h-560 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="rounded-card bg-ds-bg" />
        <div className="hidden rounded-card bg-ds-bg xl:block" />
      </div>
      <ActionSheet
        title={paid ? "Bill paid" : "Pay this bill"}
        appearance="payment"
        className="md:w-440"
        onClose={close}
        stamp={
          paid ? (
            <img src="/illustrations/payment/bill-paid.svg" alt="" className="size-34" />
          ) : undefined
        }
        stampTone="brand"
      >
        {paid ? (
          <>
            <p className="w-full text-[14px] leading-[20px] text-ds-muted">
              You paid {formatUsdc(BigInt(bill))} USDC one day early. Your on-time record went up.
            </p>
            <div className="w-full rounded-[18px] bg-ds-canvas px-16 py-4 text-left [&>div>span]:leading-[17px]">
              <KeyValue label="Credit limit left" value="900 of 3,000 USDC" />
              <KeyValue label="Paid on time" value="100% · 10 of 10 bills" />
            </div>
            <DemoRecord
              title="Payment sent"
              icon={
                <img src="/illustrations/payment/payment-recorded.svg" alt="" className="size-16" />
              }
              className="rounded-[18px] bg-ds-canvas px-16 py-12 [&>span:first-child]:size-32 [&>span:first-child>svg]:size-16 [&>span:nth-child(2)]:flex [&>span:nth-child(2)]:flex-col [&>span:nth-child(2)]:gap-2 [&>span:nth-child(2)>span:first-child]:font-semibold [&>span:nth-child(2)>span:first-child]:leading-[16px] [&>span:nth-child(2)>span:last-child]:leading-[15px]"
            />
            <Button
              className="h-52 w-full text-[15px]"
              icon={<PaymentGlyph kind="arrow" size={17} />}
              onClick={close}
            >
              Done
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-4 rounded-[20px] bg-ds-canvas px-20 py-18">
              <p className="text-[13px] leading-[16px] text-ds-muted">
                Shipment #{shipmentId} · due Dec 11
              </p>
              <Money
                amount={bill}
                className="text-[36px] leading-[44px] font-medium tracking-[-1.2px]"
              />
              <p className="text-[12.5px] leading-[15px] font-medium text-ds-success">
                Paying 1 day early
              </p>
            </div>
            <div
              className={cn(
                "flex h-58 shrink-0 items-center gap-12 rounded-[16px] border px-14",
                insufficient ? "border-ds-danger" : "border-ds-line",
              )}
            >
              <PaymentGlyph kind="wallet" />
              <div className="flex flex-col gap-2">
                <p className="text-[14px] leading-[17px] font-medium">From your wallet</p>
                <p
                  className={cn(
                    "text-[12.5px] leading-[15px]",
                    insufficient ? "text-ds-danger" : "text-ds-muted",
                  )}
                >
                  {formatUsdc(available)} USDC available
                </p>
              </div>
            </div>
            {waiting && (
              <div className="flex flex-col gap-10" aria-live="polite">
                <PaymentStep done title="Allow the payment" description="Done in your wallet" />
                <PaymentStep
                  title={`Send ${formatUsdc(BigInt(bill))} USDC`}
                  description="Approve it in your wallet"
                />
              </div>
            )}
            {insufficient && (
              <div className="flex min-h-68 items-start gap-10 rounded-[16px] bg-ds-danger-result px-16 py-14">
                <PaymentGlyph kind="alert" className="shrink-0 text-ds-danger" />
                <p className="text-[13.5px] leading-[1.45]">
                  You need {formatUsdc(shortfall)} USDC more. Add USDC to your wallet, then try
                  again.
                </p>
              </div>
            )}
            {error && (
              <p role="alert" className="text-[13px] text-ds-danger">
                {error}
              </p>
            )}
            <Button
              className="h-52 w-full text-[15px] disabled:text-ds-muted [&>span:last-child]:group-disabled:bg-ds-line-strong [&>span:last-child]:group-disabled:text-ds-bg"
              disabled={insufficient}
              loading={waiting}
              loadingLabel="Waiting for wallet"
              icon={<PaymentGlyph kind="arrow" size={17} />}
              onClick={pay}
            >
              Pay {formatUsdc(BigInt(bill))} USDC
            </Button>
            {insufficient ? (
              <button
                type="button"
                className="focus-ring self-start rounded-small text-[13px] leading-[16px] font-semibold text-ds-brand-deep"
                onClick={() => setFunded(true)}
              >
                Get test USDC
              </button>
            ) : (
              <p className="text-center text-[12.5px] leading-[15px] text-ds-muted md:text-left">
                {waiting
                  ? "Two quick approvals. The first one only happens once."
                  : "Investors get paid back, and your limit frees up right away."}
              </p>
            )}
          </>
        )}
      </ActionSheet>
    </>
  );
}

function PaymentStep({
  done = false,
  title,
  description,
}: {
  done?: boolean;
  title: string;
  description: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-12 rounded-[16px] px-14 py-12",
        done ? "bg-ds-canvas" : "bg-ds-brand-soft",
      )}
    >
      <span
        className={cn(
          "grid size-26 shrink-0 place-items-center rounded-full",
          done ? "bg-ds-ink text-ds-bg" : "bg-ds-brand text-ds-ink",
        )}
      >
        <PaymentGlyph
          kind={done ? "check" : "spinner"}
          size={14}
          className={done ? undefined : "animate-spin motion-reduce:animate-none"}
        />
      </span>
      <span className="flex min-w-0 flex-col gap-2">
        <span className="text-[14.5px] leading-[18px] font-medium">{title}</span>
        <span className="text-[12.5px] leading-[15px] text-ds-muted">{description}</span>
      </span>
    </div>
  );
}

function PaymentGlyph({
  kind,
  size = 18,
  className,
}: {
  kind: "wallet" | "arrow" | "check" | "spinner" | "alert";
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {kind === "wallet" && (
        <>
          <path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v11H5a3 3 0 0 1-3-3V6" />
          <path d="M20 12h-4a2 2 0 0 0 0 4h4z" />
        </>
      )}
      {kind === "arrow" && (
        <>
          <path d="M7 17 17 7M7 7h10v10" />
        </>
      )}
      {kind === "check" && <path d="m20 6-11 11-5-5" />}
      {kind === "spinner" && <path d="M12 3a9 9 0 1 0 9 9" />}
      {kind === "alert" && (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </>
      )}
    </svg>
  );
}
