import { cn } from "@/lib/cn";

/*
 * The ruler meter from design/waybil.pen → Atom/FanMeter, drawn in the design by
 * design/shaders/ruler.glsl. Forty ticks growing up from the bottom: every 10th is full
 * height, every 5th is 78%, the rest 57%. A yellow marker line sits at the current value.
 *
 * Past 80% the filled bars turn amber, past 100% red. The marker stays yellow.
 * Values crossfade together. fe/AGENTS.md overrides the board's older stagger note.
 *
 * The "Big fan" on the credit cards adds the value pill above the ruler and the legend
 * underneath, so those two are opt in.
 */

const TICKS = 40;
const MAJOR = 10;
const MID = 5;

export function FanMeter({
  /** How full, from 0 to 1. Over 1 is allowed and shows as over the limit. */
  value,
  /** What the meter means, for example "Credit limit used". Spoken, not drawn. */
  label,
  /** The pill above the ruler at the current value, for example "2,400 used". */
  markerLabel,
  className,
}: {
  value: number;
  label: string;
  markerLabel?: string;
  className?: string;
}) {
  const pct = Math.round(value * 100);
  const marker = Math.min(Math.max(value, 0), 1);
  const used = value >= 1 ? "bg-ds-danger" : value > 0.8 ? "bg-ds-warning" : "bg-ds-ink";

  const ruler = (
    <span
      role="meter"
      aria-label={label}
      aria-valuenow={Math.max(0, Math.min(100, pct))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${pct} percent`}
      key={value}
      className={cn(
        "swap relative inline-flex h-18 w-320 items-end justify-between",
        markerLabel && "w-full",
        className,
      )}
    >
      {Array.from({ length: TICKS + 1 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            height: `${i % MAJOR === 0 ? 100 : i % MID === 0 ? 78 : 57}%`,
          }}
          className={cn("w-3 shrink-0", i / TICKS <= marker ? used : "bg-ds-meter-empty")}
        />
      ))}

      {value > 0 && (
        <span
          aria-hidden
          style={{ left: `${marker * 100}%` }}
          className="absolute bottom-0 h-full w-4 -translate-x-1/2 bg-ds-brand"
        />
      )}
    </span>
  );

  if (!markerLabel) return ruler;

  return (
    <span className="flex w-full flex-col gap-6">
      {markerLabel && value > 0 && (
        <span aria-hidden className="relative block h-26 w-full">
          {/* Held a little away from both ends so the pill never pushes the card sideways. */}
          <span
            style={{ left: `${Math.min(Math.max(marker, 0.08), 0.92) * 100}%` }}
            className={cn(
              "absolute -translate-x-1/2 rounded-full px-10 py-4 text-caption whitespace-nowrap text-ds-bg",
              used,
            )}
          >
            {markerLabel}
          </span>
        </span>
      )}
      {ruler}
    </span>
  );
}

/** The two keys the credit cards draw under the ruler. */
export function MeterLegend({ value, className }: { value: number; className?: string }) {
  const used = value >= 1 ? "bg-ds-danger" : value > 0.8 ? "bg-ds-warning" : "bg-ds-ink";
  return (
    <span aria-hidden className={cn("flex gap-16 text-caption text-ds-muted", className)}>
      <span className="flex items-center gap-6">
        <span className={cn("size-10 rounded-full", used)} />
        In use
      </span>
      <span className="flex items-center gap-6">
        <span className="size-10 rounded-full bg-ds-line-strong" />
        Free
      </span>
    </span>
  );
}
