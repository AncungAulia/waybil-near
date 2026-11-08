import { cn } from "@/lib/cn";

/*
 * The ruler meter from design/waybil.pen → Atom/FanMeter, drawn in the design by
 * design/shaders/ruler.glsl. Forty ticks growing up from the bottom: every 10th is full
 * height, every 5th is 78%, the rest 57%. A yellow marker line sits at the current value.
 *
 * Past 80% the filled bars turn amber, past 100% red. The marker stays yellow.
 * Values crossfade together. fe/AGENTS.md overrides the board's older stagger note.
 */

const TICKS = 40;
const MAJOR = 10;
const MID = 5;

export function FanMeter({
  /** How full, from 0 to 1. Over 1 is allowed and shows as over the limit. */
  value,
  /** What the meter means, for example "Credit limit used". Spoken, not drawn. */
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const pct = Math.round(value * 100);
  const marker = Math.min(Math.max(value, 0), 1);
  const used = value >= 1 ? "bg-ds-danger" : value > 0.8 ? "bg-ds-warning" : "bg-ds-ink";

  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuenow={Math.max(0, Math.min(100, pct))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${pct} percent`}
      key={value}
      className={cn("swap relative inline-flex h-18 w-320 items-end justify-between", className)}
    >
      {Array.from({ length: TICKS + 1 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            height: `${i % MAJOR === 0 ? 100 : i % MID === 0 ? 78 : 57}%`,
          }}
          className={cn("w-2 shrink-0", i / TICKS <= marker ? used : "bg-ds-meter-empty")}
        />
      ))}

      {value > 0 && (
        <span
          aria-hidden
          style={{ left: `${marker * 100}%` }}
          className="absolute bottom-0 h-full w-3 -translate-x-1/2 bg-ds-brand"
        />
      )}
    </span>
  );
}
