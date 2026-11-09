import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * The white card every organism sits in: design/waybil.pen draws Create shipment,
 * Shipment list, Timeline and Cash out as the same 28 px card with 24 px padding.
 * Only the gap between the children changes, so that is the one knob.
 */

export function Panel({
  title,
  /** Shown next to the title, for example the segmented tabs. */
  action,
  gap = 16,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  gap?: 4 | 12 | 16 | 18;
  children: ReactNode;
  className?: string;
}) {
  const gaps = { 4: "gap-4", 12: "gap-12", 16: "gap-16", 18: "gap-18" } as const;

  return (
    <section
      className={cn("flex w-full flex-col rounded-card bg-ds-bg p-24", gaps[gap], className)}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-16">
          {title && <h2 className="text-heading">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
