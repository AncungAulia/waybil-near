import { formatUsdc } from "@waybil/shared";
import { cn } from "@/lib/cn";

export function Money({ amount, className }: { amount: string; className?: string }) {
  return (
    <span
      key={amount}
      className={cn("swap inline-flex items-baseline gap-6 tabular-nums", className)}
    >
      {formatUsdc(BigInt(amount))}
      {/*
       * Half the number, as the board draws the big amounts, but never under 11 px. In a list
       * row the number is already small and the unit sits at the same size the board uses.
       */}
      <span className="text-[max(0.5em,11px)] font-medium tracking-normal">USDC</span>
    </span>
  );
}
