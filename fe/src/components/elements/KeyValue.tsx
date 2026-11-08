import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Key and value row from design/waybil.pen → Molecule/KeyValue.
 * The plain fact on the left, the number on the right.
 */

export function KeyValue({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full items-center justify-between gap-16 py-9", className)}>
      <span className="text-[14px] text-ds-muted">{label}</span>
      <span className="text-[14px] font-medium text-ds-ink">{value}</span>
    </div>
  );
}
