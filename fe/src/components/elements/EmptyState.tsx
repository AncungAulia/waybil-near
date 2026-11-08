import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Nothing to show yet, or something went wrong. On a phone it fills the width and the
 * height (fe/AGENTS.md), so it reads as the whole screen rather than a small note.
 */

export function EmptyState({
  title,
  /** One plain sentence saying what happens next. */
  body,
  /** The one thing to do about it, usually a Button. */
  action,
  className,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-240 w-full flex-col items-center justify-center gap-10 px-24 py-40 text-center",
        className,
      )}
    >
      <p className="text-heading text-ds-ink">{title}</p>
      <p className="max-w-360 text-body text-ds-muted">{body}</p>
      {action && <div className="mt-10">{action}</div>}
    </div>
  );
}
