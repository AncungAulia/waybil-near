import { billForDriverAmount, formatUsdc, type Shipment } from "@waybil/shared";
import { Check, Info } from "@phosphor-icons/react";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { DEFAULT_REPORT } from "@/lib/demo-delivery";
import type { ShipperState } from "../../data/fixtures";

/* Choose what the driver gets after a problem report (P3.8, and P3.10 for a custom amount). */
export function SettleSheet({
  state,
  shipment,
  report,
  driver,
  place,
  unit,
  arrivedAmount,
  choice,
  setChoice,
  amount,
  setAmount,
  reason,
  setReason,
  custom,
  validCustom,
  customValid,
  error,
  acceptSettlement,
  go,
}: {
  state: ShipperState;
  shipment: Shipment;
  report: typeof DEFAULT_REPORT;
  driver: string;
  place: string;
  unit: string;
  arrivedAmount: bigint;
  choice: string;
  setChoice: (choice: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
  reason: string;
  setReason: (reason: string) => void;
  custom: bigint;
  validCustom: boolean;
  customValid: boolean;
  error: string;
  acceptSettlement: () => void;
  go: (s: ShipperState) => void;
}) {
  return (
    <ActionSheet
      title={`How much should ${driver} get?`}
      appearance="shipment"
      className={cn(
        "md:w-520",
        state === "P3.10" && "max-h-[calc(100dvh-16px)] gap-10 p-16 md:w-560",
      )}
      onClose={() => go("P3.6")}
      subtitle={
        state === "P3.10"
          ? `Agree on the amount with ${driver} first.`
          : `${place} counted ${report.goodQty} good ${unit} out of ${shipment.qty}.`
      }
    >
      <div
        role="radiogroup"
        aria-label="How do you want to settle it?"
        className={cn("flex flex-col gap-10", state === "P3.10" && "gap-8")}
      >
        {[
          {
            id: "arrived",
            title: "Pay for what arrived",
            body: `${driver} gets ${formatUsdc(arrivedAmount)} USDC for ${report.goodQty} of ${shipment.qty} ${unit}. Your bill becomes ${formatUsdc(billForDriverAmount(arrivedAmount))} USDC.`,
          },
          {
            id: "full",
            title: "Pay in full",
            body: `${driver} gets ${formatUsdc(BigInt(shipment.advance))} USDC. Your bill stays ${formatUsdc(BigInt(shipment.bill))} USDC.`,
          },
          {
            id: "different",
            title: "Pay a different amount",
            body: `Agree on it with ${driver} first and add a short reason.`,
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
                  choice === o.id ? "border-ds-ink bg-ds-ink" : "border-ds-line-strong bg-ds-bg",
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
                  label={`${driver} gets`}
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
                  hint={`${validCustom && custom <= BigInt(shipment.advance) ? `Your bill becomes ${formatUsdc(billForDriverAmount(custom))} USDC. ` : ""}It can't be more than ${formatUsdc(BigInt(shipment.advance))} USDC.`}
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
          {driver} and the investors see your choice. The {shipment.qty - report.goodQty} wet {unit}{" "}
          stay at {place} for you to collect.
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
  );
}
