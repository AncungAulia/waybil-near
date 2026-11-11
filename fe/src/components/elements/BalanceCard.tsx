"use client";

import { cn } from "@/lib/cn";
import { useChanged } from "@/hooks/useChanged";
import type { StatusChip } from "@/lib/status";
import { StatusPill } from "./StatusPill";

/*
 * Balance card from design/waybil.pen → Card/Balance and the States board.
 * The driver's "ready to cash out" card. The amount is the biggest thing on the screen.
 * It never counts up: a new amount crossfades (fe/AGENTS.md "Motion").
 */

export function BalanceCard({
  /** What the amount means right now, for example "Ready to cash out". */
  label,
  status,
  /** The amount, already formatted, for example "292.50". */
  amount,
  /** The line underneath, for example "97.5% of 300 USDC · Eastport to Harbor City". */
  meta,
  /** Nothing to cash out yet, so the amount is greyed. */
  empty = false,
  className,
}: {
  label: string;
  status: StatusChip;
  amount: string;
  meta: string;
  empty?: boolean;
  className?: string;
}) {
  const changed = useChanged(amount);
  return (
    <div
      className={cn(
        "flex w-420 max-w-full flex-col gap-14 rounded-card bg-ds-canvas p-24",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-12">
        <span className="text-[14px] text-ds-muted">{label}</span>
        <StatusPill status={status} />
      </div>

      <span
        key={amount}
        className={cn(
          changed && "swap",
          "text-[43px] leading-none font-medium tracking-[-0.035em]",
          empty ? "text-ds-off-ink" : "text-ds-ink",
        )}
      >
        {amount} USDC
      </span>

      <span className="text-label text-ds-muted">{meta}</span>
    </div>
  );
}
