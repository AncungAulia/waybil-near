import { cn } from "@/lib/cn";
import { FanMeter } from "./FanMeter";

/*
 * Credit limit meter from design/waybil.pen → Molecule/Meter and the States board.
 * The label and the percentage on top, the ruler in the middle, what is used and what is
 * left underneath. Over the limit, the percentage and the amount left turn red.
 */

export function CreditMeter({
  label,
  /** What is owed now, already formatted, for example "1,200". */
  used,
  /** The whole limit, already formatted, for example "3,000". */
  limit,
  /** How full, from 0 to 1. Over 1 means over the limit. */
  value,
  /** What is still free, already formatted. Over the limit this is the amount over. */
  left,
  className,
}: {
  label: string;
  used: string;
  limit: string;
  value: number;
  left: string;
  className?: string;
}) {
  const over = value >= 1;

  return (
    <div className={cn("flex w-380 flex-col gap-10 rounded-[22px] bg-ds-bg p-20", className)}>
      <div className="flex items-center justify-between">
        <span className="text-label font-medium text-ds-ink">{label}</span>
        <span className={cn("text-label", over ? "text-ds-danger" : "text-ds-muted")}>
          {Math.round(value * 100)}%
        </span>
      </div>

      <FanMeter value={value} label={label} className="w-full" />

      <div className="flex items-center justify-between">
        <span className="text-caption text-ds-muted">
          {used} of {limit} USDC
        </span>
        <span className={cn("text-caption font-medium", over ? "text-ds-danger" : "text-ds-ink")}>
          {over ? `Over by ${left} USDC` : `${left} USDC left`}
        </span>
      </div>
    </div>
  );
}

/** The card's place while the limit is still loading. */
export function CreditMeterSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("flex w-380 flex-col gap-12 rounded-[22px] bg-ds-canvas p-20", className)}
    >
      <span className="h-10 w-160 rounded-full bg-ds-surface-3" />
      <span className="h-18 w-full rounded-full bg-ds-surface-3" />
      <span className="h-10 w-120 rounded-full bg-ds-surface-3" />
    </div>
  );
}
