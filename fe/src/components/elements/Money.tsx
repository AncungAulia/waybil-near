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
       * The board writes the amount and its unit at one size, so the unit only drops the
       * number's tighter tracking. The amount field keeps its own smaller suffix.
       */}
      <span className="font-medium tracking-normal">USDC</span>
    </span>
  );
}
