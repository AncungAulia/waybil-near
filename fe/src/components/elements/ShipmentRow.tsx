import { Truck } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";
import type { StatusChip } from "@/lib/status";
import { StatusPill } from "./StatusPill";

/*
 * Shipment row from design/waybil.pen → Row/Shipment and the States board.
 * The route, the facts underneath, then the bill and the status on the right.
 * The meta line holds short facts in a sentence.
 */

export function ShipmentRow({
  /** Where it goes, for example "Eastport to Harbor City". */
  route,
  /** Short facts, for example "Sam drives #1042. Due Dec 11." */
  meta,
  /** The bill, already formatted, for example "300.00". */
  amount,
  status,
  selected = false,
  className,
  ...rest
}: {
  route: string;
  meta: string;
  amount: string;
  status: StatusChip;
  selected?: boolean;
  className?: string;
} & React.ComponentProps<"button">) {
  return (
    <button
      {...rest}
      type="button"
      aria-current={selected || undefined}
      className={cn(
        "press focus-ring flex w-640 max-w-full items-center gap-14 rounded-[16px] border px-16 py-14 text-left",
        /* Not `transition-colors`, which would drop the press scale's transform transition. */
        "transition-[color,background-color,border-color,transform] duration-150 ease-base",
        selected ? "border-ds-ink" : "border-ds-line hover:border-ds-line-strong",
        className,
      )}
    >
      <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-canvas">
        <Truck size={18} className="text-ds-ink" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="truncate text-body font-medium text-ds-ink">{route}</span>
        <span className="truncate text-caption text-ds-muted">{meta}</span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-6">
        <span className="text-body font-semibold text-ds-ink">{amount} USDC</span>
        <StatusPill status={status} />
      </span>
    </button>
  );
}

/** The row's place while the list is still loading. */
export function ShipmentRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex w-640 max-w-full items-center gap-14 rounded-[16px] bg-ds-canvas px-16 py-14",
        className,
      )}
    >
      <span className="size-40 shrink-0 rounded-full bg-ds-surface-3" />
      <span className="flex min-w-0 flex-1 flex-col gap-8">
        <span className="h-12 w-240 rounded-full bg-ds-surface-3" />
        <span className="h-10 w-160 rounded-full bg-ds-surface-3" />
      </span>
      <span className="h-12 w-96 shrink-0 rounded-full bg-ds-surface-3" />
    </div>
  );
}
