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
  /** A small count the board draws right after the title, for example "3". */
  badge,
  gap = 16,
  /** The board draws the card title at 15, 17, 18 or 20 px, depending on the card. */
  titleClassName = "text-heading",
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  badge?: ReactNode;
  gap?: 4 | 10 | 12 | 16 | 18;
  titleClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  const gaps = { 4: "gap-4", 10: "gap-10", 12: "gap-12", 16: "gap-16", 18: "gap-18" } as const;

  return (
    <section
      className={cn("flex w-full flex-col rounded-card bg-ds-bg p-24", gaps[gap], className)}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-16">
          <span className="flex items-center gap-8">
            {title && <h2 className={cn("font-medium", titleClassName)}>{title}</h2>}
            {/* A zero is a real count, so only an absent badge is dropped. */}
            {badge !== undefined && <span className="text-caption text-ds-muted">{badge}</span>}
          </span>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
