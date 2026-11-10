"use client";

import { cn } from "@/lib/cn";
import { useChanged } from "@/hooks/useChanged";
import type { StatusChip } from "@/lib/status";

/*
 * Status chips from design/waybil.pen → Section Status and the States board.
 * The board's rule: "Neutral chip, coloured dot, plain words. Never colour alone."
 * Every chip is the same grey pill, so the words carry the meaning and the dot only helps.
 */

const CHIP: Record<StatusChip, { label: string; dot: string }> = {
  approved: { label: "Approved", dot: "bg-ds-muted" },
  inTransit: { label: "In transit", dot: "bg-ds-info" },
  // Yellow needs a ring to stay visible on the grey pill.
  delivered: { label: "Delivered", dot: "bg-ds-brand ring-1 ring-ds-brand-ring ring-inset" },
  paidEarly: { label: "Paid early", dot: "bg-ds-success" },
  repaid: { label: "Repaid", dot: "bg-ds-ink" },
  disputed: { label: "Disputed", dot: "bg-ds-danger" },
  cancelled: { label: "Cancelled", dot: "bg-ds-muted" },
  coveredByReserve: { label: "Paid from the reserve", dot: "bg-ds-warning" },
};

export function StatusPill({
  status,
  className,
  label: roleLabel,
}: {
  status: StatusChip;
  className?: string;
  label?: string;
}) {
  const { label, dot } = CHIP[status];
  const changed = useChanged(status);

  return (
    /*
     * Status pills are frequent. Their values crossfade without movement, as fe/AGENTS.md
     * requires, rather than following the older rise and pop note on the board. Only a
     * real change crossfades. The first render shows the chip at once.
     */
    <span
      key={status}
      className={cn(
        changed && "status-in",
        "inline-flex items-center gap-7 rounded-full bg-ds-canvas py-7 pr-14 pl-11 text-label font-medium text-ds-ink",
        className,
      )}
    >
      <span className={cn("size-8 shrink-0 rounded-full", dot)} />
      {roleLabel ?? label}
    </span>
  );
}

/** The chip's place while the shipment is still loading. */
export function StatusPillSkeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center gap-7 rounded-full bg-ds-canvas py-7 pr-14 pl-11",
        className,
      )}
    >
      <span className="size-8 shrink-0 rounded-full bg-ds-surface-3" />
      <span className="h-8 w-56 rounded-full bg-ds-surface-3" />
    </span>
  );
}
