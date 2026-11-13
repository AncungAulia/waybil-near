import { formatUsdc, type Shipment } from "@waybil/shared";
import { Pause, ShieldCheck } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { TimelineStep } from "@/components/elements/TimelineStep";
import { cn } from "@/lib/cn";
import type { ShipperState } from "../../data/fixtures";
import { demoMoment, shortDate } from "../../data/dates";

/* The P3 progress card: every step of the trip and the cancel link before pickup. */
export function ShipperProgress({
  state,
  shipment,
  go,
  driver,
  place,
  bill,
  driverGot,
  due,
  repaidAt,
  coveredAt,
  cancelledAt,
  approved,
  road,
  held,
  settled,
  repaid,
  cancelled,
  covered,
}: {
  state: ShipperState;
  shipment: Shipment;
  go: (s: ShipperState) => void;
  driver: string;
  place: string;
  bill: string;
  /** What the driver got after a settled report. */
  driverGot: string;
  due: number;
  repaidAt?: number;
  coveredAt: number;
  cancelledAt?: number;
  approved: boolean;
  road: boolean;
  held: boolean;
  settled: boolean;
  repaid: boolean;
  cancelled: boolean;
  covered: boolean;
}) {
  return (
    <Panel title="Progress" gap={4} titleClassName="text-[18px] leading-[1.2]">
      {(cancelled
        ? ["Approved by you", "Cancelled by you"]
        : [
            "Approved by you",
            `Picked up by ${driver}`,
            `Arrived at ${place}`,
            settled
              ? `${driver} got ${formatUsdc(BigInt(driverGot))} USDC`
              : `${driver} paid early`,
            covered ? "Covered by the reserve" : "You repaid",
          ]
      ).map((title, i, steps) => {
        const completed =
          repaid || cancelled || covered ? steps.length : approved ? 1 : road ? 2 : held ? 3 : 4;
        const step =
          settled && i === 4
            ? "next"
            : i < completed
              ? "done"
              : i === completed
                ? held
                  ? "paused"
                  : "current"
                : "next";
        const times = cancelled
          ? ["Nov 12, 08:02", cancelledAt ? demoMoment(cancelledAt) : "Nov 12, 09:40"]
          : [
              "Nov 12, 08:02",
              approved ? "Waiting for pickup" : "Nov 12, 09:14",
              road ? "About 1 h 20 min to go" : "Nov 12, 15:36",
              held
                ? "On hold"
                : settled
                  ? "Nov 13, 10:20"
                  : `Sent ${formatUsdc(BigInt(shipment.advance))} USDC on Nov 12, 15:37`,
              covered
                ? `Team approval on ${shortDate(coveredAt)}`
                : repaid
                  ? `Paid ${formatUsdc(BigInt(bill))} USDC on ${shortDate(repaidAt ?? due)}`
                  : `Due ${shortDate(due)}`,
            ];
        return (
          <div
            key={title}
            /* The board joins the dots with a 2 px line, ink once the step is done. */
            className={cn(
              "relative py-10 after:absolute after:top-38 after:left-11 after:w-2 after:rounded-[1px]",
              i === steps.length - 1
                ? "after:hidden"
                : i <= completed
                  ? "after:h-27"
                  : "after:h-16",
              step === "done" && !(settled && i === 3)
                ? "after:bg-ds-ink"
                : "after:bg-ds-line-strong",
            )}
          >
            {covered && i === 4 ? (
              /* The reserve paid the pool back, so the step is done but marked in warning. */
              <div className="flex items-start gap-14">
                <span className="grid size-24 shrink-0 place-items-center rounded-full bg-ds-warning text-white">
                  <ShieldCheck size={13} weight="bold" />
                </span>
                <span className="flex min-w-0 flex-col gap-2">
                  <span className="text-[14.5px] leading-[1.2] font-medium">{title}</span>
                  <span className="text-[12.5px] leading-[1.2] text-ds-muted">{times[i]}</span>
                </span>
              </div>
            ) : settled && i === 3 ? (
              <div className="flex items-start gap-14">
                <span className="grid size-24 shrink-0 place-items-center rounded-full bg-ds-check-soft text-ds-check-ink">
                  <Pause size={12} weight="bold" />
                </span>
                <span className="flex min-w-0 flex-col gap-2">
                  <span className="text-[14.5px] leading-[1.2] font-medium">{title}</span>
                  <span className="text-[12.5px] leading-[1.2] text-ds-check-ink">{times[i]}</span>
                </span>
              </div>
            ) : (
              <TimelineStep
                className={cn(
                  "w-full items-start [&>span:last-child>span]:leading-[1.2] [&>span:last-child>span:empty]:hidden",
                  step === "next" && "[&>span:last-child>span:first-child]:font-normal",
                  step === "paused" &&
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
          className="link focus-ring -mt-6 -mb-12 flex items-center gap-6 self-start rounded-small py-12 text-[13px] font-semibold text-ds-danger hover:text-ds-ink"
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
  );
}
