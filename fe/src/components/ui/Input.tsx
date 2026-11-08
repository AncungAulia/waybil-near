"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Input from design/waybil.pen → Atom "Input" and the States board.
 * A 13/500 label, a 52 px field with a 1.5 px border, and a 12 px hint underneath.
 * Focus lifts the field to white with an ink border. An error turns it red and the hint
 * says the reason and what is left. A locked field says why it cannot change.
 */

const FIELD = cn(
  "flex h-52 items-center gap-8 rounded-[16px] border-[1.5px] px-18 transition-colors duration-150 ease-base",
  "bg-ds-canvas border-ds-canvas",
  "hover:border-ds-line-strong",
  // Focus lives on the field, not the input, so the whole box lifts to white together.
  "has-[:focus]:bg-ds-bg has-[:focus]:border-ds-ink has-[:focus]:hover:border-ds-ink",
);

export interface InputProps extends Omit<ComponentProps<"input">, "id"> {
  label: string;
  /** The unit after the value, for example "USDC". */
  suffix?: ReactNode;
  /** The line under the field. Replaced by `error` when something is wrong. */
  hint?: ReactNode;
  /** Why the value is not accepted. Turns the whole field red. */
  error?: ReactNode;
  /** The value was agreed earlier and cannot change. Says so next to the unit. */
  locked?: boolean;
}

export function Input({
  label,
  suffix,
  hint,
  error,
  locked = false,
  className,
  disabled,
  ...rest
}: InputProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      <label htmlFor={id} className="text-label font-medium text-ds-ink">
        {label}
      </label>

      <div
        className={cn(
          FIELD,
          error && "border-ds-danger bg-ds-danger-soft hover:border-ds-danger",
          (disabled || locked) && "hover:border-ds-canvas",
        )}
      >
        <input
          {...rest}
          id={id}
          disabled={disabled}
          readOnly={locked || rest.readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={cn(
            // The field around it shows the focus, so the input itself must not draw
            // the global focus outline on top.
            "min-w-0 flex-1 bg-transparent text-[16px] text-ds-ink outline-none focus-visible:outline-none",
            "placeholder:text-ds-off-ink",
          )}
        />
        {(suffix || locked) && (
          <span className="shrink-0 text-label text-ds-muted">
            {suffix}
            {locked && (suffix ? " · locked" : "locked")}
          </span>
        )}
      </div>

      {note && (
        <p id={noteId} className={cn("text-caption", error ? "text-ds-danger" : "text-ds-muted")}>
          {note}
        </p>
      )}
    </div>
  );
}
