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

/*
 * A live list or page with nothing in it yet. It fills the window under whatever sits above
 * it (pass one of the FILL_* heights), with an icon in a soft circle or an illustration, a
 * short title, one sentence and at most one action.
 */

/** The height under the navbar alone. */
export const FILL_PAGE =
  "min-h-[calc(100dvh-184px)] md:min-h-[calc(100dvh-148px)] lg:min-h-[calc(100dvh-156px)]";
/** The height under a page title and the line under it. */
export const FILL_UNDER_HEADER =
  "min-h-[calc(100dvh-266px)] md:min-h-[calc(100dvh-230px)] lg:min-h-[calc(100dvh-238px)]";
/** The same, when the header's action drops below the title on a phone. */
export const FILL_UNDER_HEADER_ACTION =
  "min-h-[calc(100dvh-326px)] md:min-h-[calc(100dvh-230px)] lg:min-h-[calc(100dvh-238px)]";

export function FillEmpty({
  icon,
  image,
  title,
  body,
  action,
  as: Tag = "h2",
  className,
}: {
  /** A 26 px icon, drawn in a soft circle. */
  icon?: ReactNode;
  /** An illustration from /public/illustrations, used instead of the icon. */
  image?: string;
  title: string;
  body: string;
  action?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col items-center justify-center gap-10 rounded-card bg-ds-bg px-24 py-48 text-center",
        className,
      )}
    >
      {image ? (
        <img src={image} alt="" className="h-102 w-136" />
      ) : (
        <span className="grid size-56 place-items-center rounded-full bg-ds-canvas text-ds-muted">
          {icon}
        </span>
      )}
      <Tag className="text-[16px] leading-[20px] font-medium">{title}</Tag>
      <p className="max-w-360 text-[13.5px] leading-[1.4] text-ds-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}
