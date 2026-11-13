"use client";
import { useEffect, useId, useRef } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/* The field and search pieces the P2 form draws for its pickers. */
export function FieldButton({
  label,
  value,
  hint,
  onClick,
  children,
  disabled = false,
  /** Nothing picked yet, so the board writes the prompt in grey. */
  empty = false,
  /** The list under it is open, so the board lifts the field to white with an ink border. */
  open = false,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
  empty?: boolean;
  open?: boolean;
}) {
  const field = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!field.current?.contains(event.target as Node)) onClick?.();
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open, onClick]);
  return (
    <div
      ref={field}
      data-field
      className="relative flex min-w-0 flex-col gap-8"
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.stopPropagation();
          onClick?.();
          field.current?.querySelector("button")?.focus();
        }
      }}
    >
      <span id={`${id}-label`} className="text-label">
        {label}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        /* Read as the label and the chosen value, for example "Driver, Sam, truck NWF-204". */
        aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        aria-expanded={onClick ? open : undefined}
        className={cn(
          "tap focus-ring flex h-52 w-full items-center justify-between gap-10 rounded-[16px] border-[1.5px] px-16 text-left text-[16px]",
          open
            ? "border-ds-ink bg-ds-bg"
            : "border-ds-canvas bg-ds-canvas hover:border-ds-canvas-hover hover:bg-ds-canvas-hover",
        )}
      >
        <span id={`${id}-value`} className={cn("min-w-0 truncate", empty && "text-ds-muted")}>
          {value}
        </span>
        <svg
          aria-hidden
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-ds-muted"
        >
          <path d="m7 9 5-5 5 5M7 15l5 5 5-5" />
        </svg>
      </button>
      {hint && (
        <p id={`${id}-hint`} className="text-caption text-ds-muted">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

/** The search line the board draws at the top of the driver and destination lists. */
export function SearchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <label className="flex h-38 shrink-0 items-center gap-10 px-10">
        <MagnifyingGlass size={16} className="shrink-0 text-ds-muted" />
        <span className="sr-only">{label}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={label}
          className="min-w-0 flex-1 bg-transparent text-[14.5px] text-ds-ink outline-none placeholder:text-ds-muted focus-visible:outline-none"
        />
      </label>
      <span aria-hidden className="h-1 shrink-0 bg-ds-line" />
    </>
  );
}
