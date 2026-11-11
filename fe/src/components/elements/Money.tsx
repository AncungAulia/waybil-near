"use client";

import { formatUsdc } from "@waybil/shared";
import { cn } from "@/lib/cn";
import { useChanged } from "@/hooks/useChanged";

export function Money({
  amount,
  className,
  /** A few lists on the board write the bare number, with the unit given once above. */
  unit = true,
}: {
  amount: string;
  className?: string;
  /**
   * @deprecated No longer does anything. Money always shows two decimals (fe/AGENTS.md).
   * Kept so older call sites still compile.
   */
  hideZeroDecimals?: boolean;
  unit?: boolean;
}) {
  /* A new amount crossfades, but nothing moves on first load (fe/AGENTS.md "Motion"). */
  const changed = useChanged(amount);
  return (
    <span
      key={amount}
      className={cn("whitespace-nowrap tabular-nums", changed && "swap", className)}
    >
      {formatUsdc(BigInt(amount))}
      {/*
       * The board writes the amount and its unit as one line of text at one size, so the
       * unit stays in the same run and only drops the number's tighter tracking. A flex
       * row would turn it into its own block. The amount field keeps its own smaller suffix.
       */}
      {unit && <span className="font-medium tracking-normal"> USDC</span>}
    </span>
  );
}
