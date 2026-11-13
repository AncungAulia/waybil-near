"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function DeliveryCodeInput({
  value,
  onChange,
  invalid = false,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  compact?: boolean;
}) {
  const [cursor, setCursor] = useState(value.length);
  /* The box for the next character is outlined only while the field has focus. */
  const [focused, setFocused] = useState(false);
  return (
    <label
      className={cn(
        "warehouse-code relative mx-auto block w-full max-w-488 rounded-small",
        compact && "warehouse-code-compact",
      )}
    >
      <span className="sr-only">Delivery code</span>
      <input
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        /* No maxLength. A pasted "7K2Q 9F4M" has 9 characters, and onChange trims it to 8. */
        value={value}
        aria-invalid={invalid}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSelect={(event) => setCursor(event.currentTarget.selectionStart ?? value.length)}
        onChange={(event) => {
          const next = event.target.value
            .replace(/[^a-zA-Z0-9]/g, "")
            .toUpperCase()
            .slice(0, 8);
          onChange(next);
          setCursor(next.length);
        }}
        className="absolute inset-0 z-10 w-full cursor-text opacity-0"
      />
      <span aria-hidden className="grid grid-cols-8 gap-6 md:gap-8">
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className={cn(
              /* Square boxes on every width, never taller than 60 px. */
              "grid aspect-square max-h-60 min-w-0 place-items-center rounded-[12px] border-[1.5px] bg-ds-canvas font-mono text-[20px] md:rounded-[16px] md:text-[22px]",
              invalid
                ? "border-ds-danger"
                : focused && i === Math.min(cursor, 7)
                  ? "border-ds-ink"
                  : "border-transparent",
            )}
          >
            {value[i] ?? ""}
          </span>
        ))}
      </span>
    </label>
  );
}
