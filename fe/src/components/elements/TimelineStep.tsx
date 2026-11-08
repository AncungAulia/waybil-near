import { Check, Clock, Warning, DotOutline } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

/*
 * Timeline step from design/waybil.pen → Molecule/Step and the States board.
 * A round marker and two lines. Done is ink, the step happening now is brand yellow,
 * a step still to come is grey, and a failed one is red.
 */

type Step = "done" | "current" | "next" | "failed";

const STEP: Record<Step, { marker: string; icon: typeof Check; title: string }> = {
  done: { marker: "bg-ds-ink text-ds-bg", icon: Check, title: "text-ds-ink" },
  current: { marker: "bg-ds-brand text-ds-ink", icon: Clock, title: "text-ds-ink" },
  next: { marker: "bg-ds-surface-3 text-ds-muted", icon: DotOutline, title: "text-ds-muted" },
  failed: { marker: "bg-ds-danger text-ds-bg", icon: Warning, title: "text-ds-danger" },
};

export function TimelineStep({
  state,
  title,
  /** When it happened, or when it is due, for example "Nov 13 · 08:14". */
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
    <div className={cn("flex w-380 items-center gap-14", className)}>
      <span className={cn("grid size-28 shrink-0 place-items-center rounded-full", marker)}>
        <Icon size={15} weight={state === "next" ? "fill" : "bold"} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className={cn("truncate text-[14px] font-medium", titleTone)}>{title}</span>
        <span className="truncate text-caption text-ds-muted">{time}</span>
      </span>
    </div>
  );
}
