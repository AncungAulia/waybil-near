"use client";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CaretDown, CaretUpDown, Check, MagnifyingGlass } from "@phosphor-icons/react";
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
  appearance,
  popoverAlign = "start",
}: {
  label: string;
  className?: string;
  value: string;
  options: { value: string; label: string; flag?: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  initialOpen?: boolean;
  initialQuery?: string;
  appearance?: "company";
  popoverAlign?: "start" | "end";
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
  const filtered = options.filter((o) =>
    `${o.label} ${o.value}`.toLowerCase().includes(query.toLowerCase()),
  );
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
        className={cn(
          "press flex h-52 w-full items-center justify-between gap-8 rounded-row border border-transparent bg-ds-canvas px-18 text-left text-label disabled:text-ds-off-ink",
          appearance === "company"
            ? "focus-visible:border-ds-ink focus-visible:outline-none"
            : "focus-ring",
          appearance === "company" &&
            "rounded-[16px] border-[1.5px] border-ds-canvas px-16 text-[16px] font-normal",
          open && appearance === "company" && "border-ds-ink bg-ds-bg",
        )}
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
      >
        <span className="flex min-w-0 items-center gap-8 truncate">
          {appearance === "company" && label === "Phone code" && (
            <img
              src={options.find((o) => o.value === value)?.flag}
              alt=""
              width={22}
              height={15}
              className="h-15 w-22 shrink-0 rounded-[3px] object-cover ring-1 ring-ds-ink/10"
            />
          )}
          {label === "Phone code"
            ? value
            : (options.find((o) => o.value === value)?.label ?? placeholder)}
        </span>
        {appearance === "company" ? (
          <CaretUpDown size={16} className="shrink-0 text-ds-muted" />
        ) : (
          <CaretDown size={16} />
        )}
      </button>
      {open && (
        <div
          className={cn(
            `absolute top-full left-0 z-30 mt-4 rounded-row border border-ds-line bg-ds-bg p-8 shadow-lg ${label === "Phone code" ? "w-280 max-w-[calc(100vw-64px)] md:left-1/2 md:-translate-x-1/2" : "right-0"}`,
            appearance === "company" && "mt-8 rounded-[18px] border-ds-line-strong p-6",
            appearance === "company" &&
              label === "Phone code" &&
              "w-320 md:left-0 md:translate-x-0",
            popoverAlign === "end" && "md:right-0 md:left-auto",
          )}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              ref.current?.querySelector("button")?.focus();
            }
          }}
        >
          <div className={cn("relative", appearance === "company" && "mb-6")}>
            {appearance === "company" && (
              <MagnifyingGlass
                size={16}
                className="pointer-events-none absolute top-12 left-12 text-ds-muted"
              />
            )}
            <input
              aria-label={`Search ${label.toLowerCase()}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(
                "mb-8 h-40 w-full rounded-small border border-transparent bg-ds-canvas px-12 text-label focus:border-ds-ink focus-visible:outline-none",
                appearance === "company" && "mb-0 pl-36 text-[14.5px]",
              )}
              placeholder={
                label === "Phone code"
                  ? "Search country or code"
                  : `Search ${label === "State / Province" ? "provinces" : label.toLowerCase()}`
              }
            />
          </div>
          <div
            role="listbox"
            aria-label={label}
            className={cn("max-h-220 overflow-y-auto", appearance === "company" && "max-h-300")}
          >
            {filtered.length ? (
              filtered.map((o) => (
                <button
                  key={o.value}
                  role="option"
                  aria-selected={value === o.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-8 rounded-small p-12 text-left text-label hover:bg-ds-canvas",
                    appearance === "company"
                      ? "focus-visible:outline-1 focus-visible:outline-ds-ink"
                      : "focus-ring",
                    appearance === "company" && "text-[14.5px] font-normal",
                    appearance === "company" && value === o.value && "bg-ds-canvas",
                  )}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    ref.current?.querySelector("button")?.focus();
                  }}
                >
                  <span className="flex items-center gap-10">
                    {appearance === "company" && o.flag && (
                      <img
                        src={o.flag}
                        alt=""
                        width={22}
                        height={15}
                        className="h-15 w-22 shrink-0 rounded-[3px] object-cover ring-1 ring-ds-ink/10"
                      />
                    )}
                    {o.label}
                  </span>
                  {appearance === "company" && label === "Phone code" && (
                    <span className="ml-auto text-[13.5px] text-ds-muted">{o.value}</span>
                  )}
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
