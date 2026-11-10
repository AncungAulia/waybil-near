"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useChanged } from "@/hooks/useChanged";

/*
 * Stat card from design/waybil.pen → Molecule/Stat and the States board.
 * A label, one big number and a line of context. Money never counts up: a new amount
 * crossfades (fe/AGENTS.md "Motion").
 */

export function Stat({
  label,
  value,
  context,
  /** The context line turns green when the number just moved. */
  justChanged = false,
  /** Nothing has happened yet, so the number is greyed. */
  empty = false,
  /**
   * The card's colour. "dark" is the ink card with the brand glow the boards use for a
   * running total, "brand" the yellow one on the pool board.
   */
  tone = "plain",
  /** A glyph in a soft circle above the label, drawn on the brand cards. */
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  context?: ReactNode;
  justChanged?: boolean;
  empty?: boolean;
  tone?: "plain" | "dark" | "brand";
  icon?: ReactNode;
  className?: string;
}) {
  const dark = tone === "dark";
  const brand = tone === "brand";
  const changed = useChanged(String(value));
  return (
    <div
      className={cn(
        "flex w-280 max-w-full flex-col gap-6 rounded-[22px] p-20",
        dark ? "bill-card bg-ds-ink" : brand ? "ready-card bg-ds-brand" : "bg-ds-bg",
        className,
      )}
    >
      {icon && (
        <span className="mb-4 grid size-32 place-items-center rounded-full bg-ds-bg/50 text-ds-ink-2">
          {icon}
        </span>
      )}
      <span
        className={cn(
          "text-label",
          dark ? "text-ds-on-night" : brand ? "text-ds-brand-deep" : "text-ds-muted",
        )}
      >
        {label}
      </span>
      <span
        key={String(value)}
        className={cn(
          changed && "swap",
          "text-[32px] font-medium",
          dark ? "text-ds-bg" : empty && !brand ? "text-ds-off-ink" : "text-ds-ink",
        )}
      >
        {value}
      </span>
      {context && (
        <span
          className={cn(
            "text-caption",
            dark
              ? "text-ds-brand"
              : brand
                ? "text-ds-brand-deep"
                : justChanged
                  ? "text-ds-success"
                  : "text-ds-muted",
          )}
        >
          {context}
        </span>
      )}
    </div>
  );
}

/** The card's place while the numbers are still loading. */
export function StatSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex w-280 max-w-full flex-col gap-10 rounded-[22px] bg-ds-canvas p-20",
        className,
      )}
    >
      <span className="h-10 w-96 rounded-full bg-ds-surface-3" />
      <span className="h-24 w-160 rounded-full bg-ds-surface-3" />
    </div>
  );
}
