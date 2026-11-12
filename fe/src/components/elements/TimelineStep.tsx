import { Check, Pause, CircleNotch, X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

/*
 * Timeline step from design/waybil.pen → Molecule/Step and the progress cards on P3.
 * A 24 px round marker and two lines. Done is an ink dot with a tick, the step happening
 * now a plain brand dot, a step still to come an outlined white dot, a paused one (a held
 * delivery, "On hold") a soft red dot with a pause glyph, and a failed one a soft red dot
 * with a cross. Only done, paused and failed carry a glyph.
 *
 * "waiting" is the wallet row P4.2 draws: a soft brand card with a turning spinner.
 */

type Step = "done" | "current" | "next" | "paused" | "failed" | "waiting";

const STEP: Record<Step, { marker: string; icon: typeof Check | null; title: string }> = {
  done: { marker: "size-24 bg-ds-ink text-ds-bg", icon: Check, title: "text-ds-ink" },
  current: { marker: "size-24 bg-ds-brand", icon: null, title: "text-ds-ink" },
  next: {
    marker: "size-24 bg-ds-bg border-[1.5px] border-ds-line-strong",
    icon: null,
    title: "text-ds-muted",
  },
  paused: { marker: "size-24 bg-ds-danger-soft text-ds-danger", icon: Pause, title: "text-ds-ink" },
  failed: { marker: "size-24 bg-ds-danger-soft text-ds-danger", icon: X, title: "text-ds-ink" },
  waiting: { marker: "size-26 bg-ds-brand text-ds-ink", icon: CircleNotch, title: "text-ds-ink" },
};

export function TimelineStep({
  state,
  title,
  /** When it happened, or when it is due, for example "Nov 13, 08:14". */
  time,
  className,
}: {
  state: Step;
  title: string;
  time: string;
  className?: string;
}) {
  const { marker, icon: Icon, title: titleTone } = STEP[state];

  return (
    <div
      className={cn(
        "flex w-380 max-w-full items-center gap-14",
        state === "waiting" && "gap-12 rounded-[16px] bg-ds-brand-soft px-14 py-12",
        className,
      )}
    >
      <span className={cn("relative z-[1] grid shrink-0 place-items-center rounded-full", marker)}>
        {Icon && (
          <Icon
            size={state === "failed" || state === "paused" ? 12 : 14}
            weight="bold"
            className={cn(state === "waiting" && "animate-spin motion-reduce:animate-none")}
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className={cn("truncate text-[14.5px] font-medium", titleTone)}>{title}</span>
        <span className="truncate text-[12.5px] text-ds-muted">{time}</span>
      </span>
    </div>
  );
}

/**
 * A column of TimelineSteps joined by a thin line through their markers, from the first to
 * the last. `spread` spaces the steps over the full height of their card.
 */
export function TimelineRail({
  children,
  spread = false,
  className,
}: {
  children: React.ReactNode;
  spread?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("relative flex flex-col gap-16", spread && "flex-1 justify-between", className)}
    >
      <span
        aria-hidden
        className="absolute top-12 bottom-12 left-[11.25px] w-[1.5px] rounded-full bg-ds-line-strong"
      />
      {children}
    </div>
  );
}
