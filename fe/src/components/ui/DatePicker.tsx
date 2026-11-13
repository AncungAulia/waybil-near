"use client";
import { useEffect, useId, useRef, useState } from "react";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/* Dates are plain "YYYY-MM-DD" strings in local time, the same as a date input gives. */
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
};
const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * A date field that opens a small calendar under it, styled like the other fields. Days
 * outside `min` and `max` can't be picked. Arrow keys move a day or a week, Enter picks, and
 * Escape closes.
 */
export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  hint,
  placeholder = "Pick a date",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  hint?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(() => value || min || iso(new Date()));
  const [month, setMonth] = useState(() => parse(value || min || iso(new Date())));
  const box = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  /* Close on a click outside. */
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  /* Keep keyboard focus on the focused day while the calendar is open. */
  useEffect(() => {
    if (open) grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  }, [open, focus, month]);

  const allowed = (day: string) => (!min || day >= min) && (!max || day <= max);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  /* Weeks start on Monday. */
  const lead = (first.getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(first);
    d.setDate(1 - lead + i);
    return d;
  });
  const shown = value
    ? parse(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";
  const step = (by: number) => {
    const d = parse(focus);
    d.setDate(d.getDate() + by);
    const next = iso(d);
    if (!allowed(next)) return;
    setFocus(next);
    if (d.getMonth() !== month.getMonth()) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };
  const shiftMonth = (by: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));
  const canPrev = !min || iso(new Date(month.getFullYear(), month.getMonth(), 0)) >= min;
  const canNext = !max || iso(new Date(month.getFullYear(), month.getMonth() + 1, 1)) <= max;

  return (
    <div ref={box} className="relative flex flex-col gap-8">
      <label htmlFor={id} className="text-label font-medium text-ds-ink">
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setFocus(value || min || iso(new Date()));
          setMonth(parse(value || min || iso(new Date())));
          setOpen((o) => !o);
        }}
        className={cn(
          "flex h-52 items-center justify-between gap-8 rounded-[16px] border-[1.5px] px-18 text-left text-[16px] transition-colors duration-150 outline-none",
          open
            ? "border-ds-ink bg-ds-bg"
            : "border-ds-canvas bg-ds-canvas hover:border-ds-line-strong focus-visible:border-ds-ink focus-visible:bg-ds-bg",
        )}
      >
        <span className={value ? "text-ds-ink" : "text-ds-off-ink"}>{shown || placeholder}</span>
        <CalendarBlank size={18} className="shrink-0 text-ds-muted" aria-hidden />
      </button>
      {hint && <p className="text-caption text-ds-muted">{hint}</p>}
      {open && (
        <div
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
          className="absolute top-[86px] left-0 z-30 w-[308px] rounded-[20px] border border-ds-line bg-ds-bg p-14 shadow-lg"
          onKeyDown={(e) => {
            const moves: Record<string, number> = {
              ArrowLeft: -1,
              ArrowRight: 1,
              ArrowUp: -7,
              ArrowDown: 7,
            };
            if (e.key in moves) {
              e.preventDefault();
              step(moves[e.key]!);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              document.getElementById(id)?.focus();
            }
          }}
        >
          <div className="mb-8 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              disabled={!canPrev}
              onClick={() => shiftMonth(-1)}
              className="tap focus-ring grid size-36 place-items-center rounded-full hover:bg-ds-canvas disabled:opacity-30"
            >
              <CaretLeft size={16} />
            </button>
            <p className="text-label font-semibold" aria-live="polite">
              {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              aria-label="Next month"
              disabled={!canNext}
              onClick={() => shiftMonth(1)}
              className="tap focus-ring grid size-36 place-items-center rounded-full hover:bg-ds-canvas disabled:opacity-30"
            >
              <CaretRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-caption text-ds-muted">
            {WEEK.map((w) => (
              <span key={w} className="py-4">
                {w}
              </span>
            ))}
          </div>
          <div ref={grid} role="grid" className="grid grid-cols-7 gap-2">
            {days.map((d) => {
              const day = iso(d);
              const inMonth = d.getMonth() === month.getMonth();
              const ok = allowed(day);
              const picked = day === value;
              const today = day === iso(new Date());
              return (
                <button
                  key={day}
                  type="button"
                  data-day={day}
                  tabIndex={day === focus ? 0 : -1}
                  disabled={!ok}
                  aria-label={d.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  aria-pressed={picked}
                  onClick={() => {
                    onChange(day);
                    setOpen(false);
                    document.getElementById(id)?.focus();
                  }}
                  className={cn(
                    "tap grid h-38 place-items-center rounded-full text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ds-ink",
                    picked
                      ? "bg-ds-ink font-semibold text-ds-bg"
                      : ok
                        ? "hover:bg-ds-canvas"
                        : "text-ds-off-ink",
                    !inMonth && !picked && "opacity-40",
                    today && !picked && "font-semibold underline underline-offset-4",
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
