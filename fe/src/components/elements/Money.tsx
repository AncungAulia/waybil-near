import { formatUsdc } from "@waybil/shared";
import { cn } from "@/lib/cn";

export function Money({ amount, className }: { amount: string; className?: string }) {
  return (
    <span
      key={amount}
      className={cn("swap inline-flex items-baseline gap-6 tabular-nums", className)}
    >
      {formatUsdc(BigInt(amount))}
      <span className="text-[0.5em] font-medium tracking-normal">USDC</span>
    </span>
  );
}
