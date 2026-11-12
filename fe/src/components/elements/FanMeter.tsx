"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useChanged } from "@/hooks/useChanged";

/*
 * The ruler meter from design/waybil.pen → Atom/FanMeter, drawn in the design by
 * design/shaders/ruler.glsl. Forty ticks growing up from the bottom: every 10th is full
 * height, every 5th is 78%, the rest 57%. A yellow marker line sits at the current value.
 *
 * Past 80% the filled bars turn amber, past 100% red. The marker stays yellow.
 * `tone="ink"` keeps them ink whatever the value, the way Molecule/Meter draws its ruler.
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
  /** "ink" holds the bars at ink instead of letting them turn amber and red. */
  tone,
  appearance,
  describe,
  className,
}: {
  value: number;
  label: string;
  markerLabel?: string;
  tone?: "ink";
  appearance?: "credit";
  /**
   * When given, pointing at or touching the ruler shows a small tooltip for that point, for
   * example "10,160 USDC is free.". `at` runs from 0 to 1 along the ruler.
   */
  describe?: (at: number, inUse: boolean) => string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const credit = appearance === "credit";
  const ticks = credit ? 60 : TICKS;
  const major = credit ? 20 : MAJOR;
  const mid = credit ? 10 : MID;
  const pct = Math.round(value * 100);
  const marker = Math.min(Math.max(value, 0), 1);
  const used =
    tone === "ink"
      ? "bg-ds-ink"
      : value > 1
        ? "bg-ds-danger"
        : value > 0.8
          ? "bg-ds-warning"
          : "bg-ds-ink";
  /*
   * White on the amber pill is too faint for 12 px text, so the amber pill writes in ink.
   * The ink and red pills keep white text.
   */
  const pillText = used === "bg-ds-warning" ? "text-ds-ink" : "text-ds-bg";
  /* A new value crossfades. Nothing moves on first load. */
  const changed = useChanged(value);
  /*
   * The pill is held inside the ruler by its own half width, so a long label near either end
   * stops at the edge instead of pushing the card sideways. The width is measured into a CSS
   * variable, so React never re-renders for it. Before it is measured (server render) a
   * 46 px guess is used.
   */
  const pill = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = pill.current;
    if (!el) return;
    const measure = () => el.style.setProperty("--pill-half", `${el.offsetWidth / 2}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [markerLabel]);

  const ruler = (
    <span
      role="meter"
      aria-label={label}
      aria-valuenow={Math.max(0, Math.min(100, pct))}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${pct} percent`}
      key={value}
      onPointerMove={
        describe
          ? (e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const at = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
              /* Snap to the nearest tick, so the tooltip sits on a line. */
              setHover(Math.round(at * ticks) / ticks);
            }
          : undefined
      }
      onPointerLeave={describe ? () => setHover(null) : undefined}
      className={cn(
        describe && "cursor-default touch-none",
        changed && "swap",
        "relative inline-flex h-34 w-320 max-w-full items-end justify-between",
        markerLabel && "w-full",
        className,
      )}
    >
      {Array.from({ length: ticks + 1 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            height: `${i % major === 0 ? 100 : i % mid === 0 ? 78 : 57}%`,
          }}
          className={cn("w-2 shrink-0", i / ticks <= marker ? used : "bg-ds-meter-empty")}
        />
      ))}

      {value > 0 && (
        <span
          aria-hidden
          style={{ left: `${marker * 100}%` }}
          className="absolute bottom-0 h-full w-3 -translate-x-1/2 bg-ds-brand"
        />
      )}
      {describe && hover !== null && (
        <span
          role="tooltip"
          style={{ left: `clamp(70px, ${hover * 100}%, calc(100% - 70px))` }}
          className="pointer-events-none absolute bottom-full z-10 mb-8 -translate-x-1/2 rounded-[10px] bg-ds-ink px-10 py-6 text-caption whitespace-nowrap text-ds-bg shadow-float"
        >
          {describe(hover, hover <= marker && value > 0)}
        </span>
      )}
    </span>
  );

  if (!markerLabel) return ruler;

  return (
    <span className="flex w-full flex-col gap-6">
      {/* The pill stays at zero too: P1.2 draws "Nothing used" at the left end. */}
      {markerLabel && (
        <span aria-hidden className={cn("relative block h-26 w-full", credit && "h-32")}>
          <span
            ref={pill}
            style={{
              left: `clamp(var(--pill-half, 46px), ${marker * 100}%, calc(100% - var(--pill-half, 46px)))`,
            }}
            className={cn(
              "absolute -translate-x-1/2 rounded-full px-10 py-4 text-caption whitespace-nowrap",
              used,
              pillText,
              credit &&
                "inline-flex h-26 min-w-92 items-center justify-center py-0 text-[12px] leading-[15px] font-semibold after:absolute after:top-25 after:left-1/2 after:-translate-x-1/2 after:border-x-5 after:border-t-6 after:border-x-transparent after:border-t-ds-ink",
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
  /* The same thresholds as the bars: amber past 80%, red only over the limit. */
  const used = value > 1 ? "bg-ds-danger" : value > 0.8 ? "bg-ds-warning" : "bg-ds-ink";
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
