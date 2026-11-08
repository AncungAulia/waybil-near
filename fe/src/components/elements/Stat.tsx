import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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
  className,
}: {
  label: string;
  value: ReactNode;
  context?: ReactNode;
  justChanged?: boolean;
  empty?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex w-280 flex-col gap-6 rounded-[22px] bg-ds-bg p-20", className)}>
      <span className="text-label text-ds-muted">{label}</span>
      <span
        key={String(value)}
        className={cn("swap text-[32px] font-medium", empty ? "text-ds-off-ink" : "text-ds-ink")}
      >
        {value}
      </span>
      {context && (
        <span className={cn("text-caption", justChanged ? "text-ds-success" : "text-ds-muted")}>
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
      className={cn("flex w-280 flex-col gap-10 rounded-[22px] bg-ds-canvas p-20", className)}
    >
      <span className="h-10 w-96 rounded-full bg-ds-surface-3" />
      <span className="h-24 w-160 rounded-full bg-ds-surface-3" />
    </div>
  );
}
