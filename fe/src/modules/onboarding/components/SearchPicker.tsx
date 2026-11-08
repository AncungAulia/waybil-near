"use client";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CaretDown, Check } from "@phosphor-icons/react";
export function SearchPicker({
  label,
  className,
  value,
  options,
  onChange,
  placeholder = "Choose one",
  disabled = false,
  initialOpen = false,
  initialQuery = "",
}: {
  label: string;
  className?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  initialOpen?: boolean;
  initialQuery?: string;
}) {
  const [open, setOpen] = useState(initialOpen),
    [query, setQuery] = useState(initialQuery);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <div ref={ref} className={cn("relative flex flex-col gap-8", className)}>
      <span id={id} className="text-label font-medium">
        {label}
      </span>
      <button
        aria-labelledby={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        className="press focus-ring flex h-52 w-full items-center justify-between gap-8 rounded-row border border-transparent bg-ds-canvas px-18 text-left text-label disabled:text-ds-off-ink"
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
      >
        <span className="min-w-0 truncate">
          {label === "Phone code"
            ? value
            : (options.find((o) => o.value === value)?.label ?? placeholder)}
        </span>
        <CaretDown size={16} />
      </button>
      {open && (
        <div
          className={`absolute top-full left-0 z-30 mt-4 rounded-row border border-ds-line bg-ds-bg p-8 shadow-lg ${label === "Phone code" ? "w-280 max-w-[calc(100vw-64px)] md:left-1/2 md:-translate-x-1/2" : "right-0"}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              ref.current?.querySelector("button")?.focus();
            }
          }}
        >
          <input
            aria-label={`Search ${label.toLowerCase()}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="focus-ring mb-8 h-40 w-full rounded-small bg-ds-canvas px-12 text-label"
            placeholder={`Search ${label.toLowerCase()}`}
          />
          <div role="listbox" aria-label={label} className="max-h-220 overflow-y-auto">
            {filtered.length ? (
              filtered.map((o) => (
                <button
                  key={o.value}
                  role="option"
                  aria-selected={value === o.value}
                  type="button"
                  className="focus-ring flex w-full items-center justify-between rounded-small p-12 text-left text-label hover:bg-ds-canvas"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    ref.current?.querySelector("button")?.focus();
                  }}
                >
                  {o.label}
                  {value === o.value && <Check size={16} />}
                </button>
              ))
            ) : (
              <p className="p-12 text-label text-ds-muted">No matches.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
