import { cn } from "@/lib/cn";

/*
 * Toggle from design/waybil.pen → K2.2. A 44 by 26 track with a 20 pixel knob.
 * On the knob is brand yellow on the ink track, off it is white on a grey track.
 */

export function Switch({
  checked,
  onChange,
  /** What the toggle controls, read out by screen readers. */
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "press focus-ring h-26 w-44 shrink-0 rounded-full p-3 transition-colors duration-150 ease-base",
        checked ? "bg-ds-ink" : "bg-ds-line-strong",
        className,
      )}
    >
      <span
        className={cn(
          "block size-20 rounded-full transition-transform duration-150 ease-out motion-reduce:transition-none",
          checked ? "translate-x-18 bg-ds-brand" : "bg-ds-bg",
        )}
      />
    </button>
  );
}
