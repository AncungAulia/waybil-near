import { formatUsdc } from "@waybil/shared";
import { cn } from "@/lib/cn";

export function Money({
  amount,
  className,
  hideZeroDecimals = false,
  /** A few lists on the board write the bare number, with the unit given once above. */
  unit = true,
}: {
  amount: string;
  className?: string;
  hideZeroDecimals?: boolean;
  unit?: boolean;
}) {
  const formatted = formatUsdc(BigInt(amount));
  return (
    <span key={amount} className={cn("swap whitespace-nowrap tabular-nums", className)}>
      {hideZeroDecimals ? formatted.replace(/\.00$/, "") : formatted}
      {/*
       * The board writes the amount and its unit as one line of text at one size, so the
       * unit stays in the same run and only drops the number's tighter tracking. A flex
       * row would turn it into its own block. The amount field keeps its own smaller suffix.
       */}
      {unit && <span className="font-medium tracking-normal"> USDC</span>}
    </span>
  );
}
