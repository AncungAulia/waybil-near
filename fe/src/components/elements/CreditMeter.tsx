import { cn } from "@/lib/cn";
import { FanMeter } from "./FanMeter";

/*
 * Credit limit meter from design/waybil.pen → Molecule/Meter and the States board.
 * The label and the percentage on top, the ruler in the middle, what is used and what is
 * left underneath. Past 80% the percentage turns amber (in the darker warning ink), over the limit it and the amount
 * left turn red, the way the board draws 80, 90 and 120 percent.
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
  rulerTone = "ink",
  describe,
}: {
  label: string;
  used: string;
  limit: string;
  value: number;
  left: string;
  className?: string;
  rulerTone?: "ink" | "auto";
  /** A tooltip for the point under the pointer, passed on to FanMeter. */
  describe?: (at: number, inUse: boolean) => string;
}) {
  const over = value > 1;
  /*
   * Text follows the threshold. The ruler can keep ink or follow the same colors. Amber text
   * uses the darker warning ink, because the bright amber is too light for small text.
   */
  const tone = over ? "text-ds-danger" : value > 0.8 ? "text-ds-warning-ink" : undefined;

  return (
    <div
      className={cn(
        "flex w-380 max-w-full flex-col gap-10 rounded-[22px] bg-ds-bg p-20",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-label font-medium text-ds-ink">{label}</span>
        <span className={cn("text-label", tone ?? "text-ds-muted")}>
          {Math.round(value * 100)}%
        </span>
      </div>

      <FanMeter
        value={value}
        label={label}
        tone={rulerTone === "ink" ? "ink" : undefined}
        describe={describe}
        className="h-18 w-full"
      />

      <div className="flex items-center justify-between">
        <span className="text-caption text-ds-muted">
          {over ? `${left} USDC over your ${limit} USDC limit` : `${used} of ${limit} USDC`}
        </span>
        <span className={cn("text-caption font-medium", tone ?? "text-ds-ink")}>
          {over ? `${left} USDC over` : `${left} USDC left`}
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
      className={cn(
        "flex w-380 max-w-full flex-col gap-12 rounded-[22px] bg-ds-canvas p-20",
        className,
      )}
    >
      <span className="h-10 w-160 rounded-full bg-ds-surface-3" />
      <span className="h-18 w-full rounded-full bg-ds-surface-3" />
      <span className="h-10 w-120 rounded-full bg-ds-surface-3" />
    </div>
  );
}
