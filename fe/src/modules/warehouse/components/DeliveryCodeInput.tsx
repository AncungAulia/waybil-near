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
  return (
    <label
      className={cn(
        "warehouse-code relative block w-full rounded-small",
        compact && "warehouse-code-compact",
      )}
    >
      <span className="sr-only">Delivery code</span>
      <input
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={8}
        value={value}
        aria-invalid={invalid}
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
      <span aria-hidden className="grid grid-cols-8 gap-8">
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "grid h-60 min-w-0 place-items-center rounded-[16px] border-[1.5px] bg-ds-canvas font-mono text-[22px]",
              invalid
                ? "border-ds-danger"
                : i === Math.min(cursor, 7)
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
