"use client";

import { cn } from "@/lib/cn";

/*
 * Segmented tabs from design/waybil.pen → Molecule/Segmented and the States board.
 * A white pill holding the tabs. The chosen one is an ink pill with white text.
 * The highlight is allowed to slide; nothing else moves (fe/AGENTS.md "Motion").
 *
 * They filter one list rather than switch panels, so they are a group of toggle buttons
 * (`aria-pressed`) and each one is a normal Tab stop, not an ARIA tab list.
 */

export interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** What the group of tabs is for, for example "Which shipments to show". */
  label: string;
  className?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex gap-4 rounded-full border border-ds-line bg-ds-bg p-4", className)}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "focus-ring rounded-full px-16 py-8 text-label font-medium transition-colors duration-150 ease-base",
              on ? "bg-ds-ink text-ds-bg" : "text-ds-muted hover:bg-ds-canvas hover:text-ds-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
