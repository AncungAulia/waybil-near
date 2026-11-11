"use client";
import { useEffect, useRef, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { DEMO_TODAY } from "../data/form";

/* The calendar shows November 2026 to January 2027. Today and anything past 60 days is off. */
const DUE_FROM = "2026-11-01";
const DUE_TO = "2027-01-31";
const DAY_MS = 86400000;
const addDays = (date: string, n: number) =>
  new Date(Date.parse(date) + n * DAY_MS).toISOString().slice(0, 10);
const dueBlocked = (date: string) => {
  const distance = (Date.parse(date) - Date.parse(DEMO_TODAY)) / DAY_MS;
  return distance <= 0 || distance > 60;
};
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SPOKEN_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/*
 * The P2.4 month grid, built as an ARIA grid. Only one day is in the tab order. The arrows
 * move by a day or a week, Home and End go to the start and end of the week, Page Up and
 * Page Down change the month, and Enter or Space picks the day. Days that can't be picked
 * stay reachable but say they are unavailable. Moving between days never animates.
 */
export function DueGrid({
  month,
  due,
  labelledBy,
  onMonth,
  onPick,
}: {
  month: string;
  due: string;
  labelledBy: string;
  onMonth: (month: string) => void;
  onPick: (date: string, from: HTMLElement) => void;
}) {
  const [year, monthIndex] = month.split("-").map(Number) as [number, number];
  const first = (new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const dates = Array.from(
    { length: days },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
  const [focused, setFocused] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  /* Set by a key press, so the day that becomes tabbable also takes focus once drawn. */
  const moved = useRef(false);
  const inMonth = (date: string | null): date is string => !!date && date.startsWith(month);
  const tabbable =
    (inMonth(focused) && focused) ||
    (inMonth(due) && due) ||
    dates.find((date) => !dueBlocked(date)) ||
    dates[0]!;
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    grid.current?.querySelector<HTMLElement>(`[data-date="${tabbable}"]`)?.focus();
  });
  const moveTo = (date: string) => {
    const next = date < DUE_FROM ? DUE_FROM : date > DUE_TO ? DUE_TO : date;
    moved.current = true;
    setFocused(next);
    if (!next.startsWith(month)) onMonth(next.slice(0, 7));
  };
  /* The same day in another month, or that month's last day when it is shorter. */
  const shiftMonth = (date: string, delta: number) => {
    const [y, m, d] = date.split("-").map(Number) as [number, number, number];
    const last = new Date(Date.UTC(y, m + delta, 0)).getUTCDate();
    return new Date(Date.UTC(y, m - 1 + delta, Math.min(d, last))).toISOString().slice(0, 10);
  };
  const cells: (string | null)[] = [...Array<null>(first).fill(null), ...dates];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  return (
    <div ref={grid} role="grid" aria-labelledby={labelledBy} className="flex flex-col gap-y-2">
      <div role="row" className="grid grid-cols-7 gap-x-4">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day, i) => (
          <span
            key={day}
            role="columnheader"
            aria-label={WEEKDAYS[i]}
            className="py-6 text-center text-[11.5px] text-ds-muted"
          >
            {day}
          </span>
        ))}
      </div>
      {weeks.map((week, w) => (
        <div key={w} role="row" className="grid grid-cols-7 gap-x-4">
          {week.map((date, i) => {
            if (!date) return <span key={`blank${i}`} role="gridcell" />;
            const blocked = dueBlocked(date);
            const weekday = (new Date(date).getUTCDay() + 6) % 7;
            return (
              <div
                key={date}
                role="gridcell"
                data-date={date}
                tabIndex={date === tabbable ? 0 : -1}
                aria-selected={due === date}
                aria-disabled={blocked || undefined}
                aria-label={`${SPOKEN_DATE.format(new Date(date))}${blocked ? ", not available" : ""}`}
                className={cn(
                  /* The hit area reaches 40 px tall without making the day bigger. */
                  "focus-ring grid h-34 place-items-center rounded-[10px] text-label font-normal before:absolute before:inset-x-0 before:-inset-y-3",
                  blocked ? "opacity-25" : "tap",
                  due === date ? "bg-ds-brand font-semibold" : !blocked && "hover:bg-ds-canvas",
                )}
                onClick={(event) => {
                  if (!blocked) onPick(date, event.currentTarget);
                }}
                onKeyDown={(event) => {
                  const key = event.key;
                  if (key === "ArrowLeft") moveTo(addDays(date, -1));
                  else if (key === "ArrowRight") moveTo(addDays(date, 1));
                  else if (key === "ArrowUp") moveTo(addDays(date, -7));
                  else if (key === "ArrowDown") moveTo(addDays(date, 7));
                  else if (key === "Home") moveTo(addDays(date, -weekday));
                  else if (key === "End") moveTo(addDays(date, 6 - weekday));
                  else if (key === "PageUp") moveTo(shiftMonth(date, -1));
                  else if (key === "PageDown") moveTo(shiftMonth(date, 1));
                  else if (key === "Enter" || key === " ") {
                    if (!blocked) onPick(date, event.currentTarget);
                  } else return;
                  event.preventDefault();
                }}
              >
                {Number(date.slice(8))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* The P2.4 calendar popup: quick picks, the month switcher and the grid. */
export function DuePopup({
  className,
  month,
  due,
  labelId,
  onMonth,
  onPick,
}: {
  className: string;
  month: string;
  due: string;
  labelId: string;
  onMonth: (month: string) => void;
  onPick: (date: string, from: HTMLElement) => void;
}) {
  const [year, monthIndex] = month.split("-").map(Number) as [number, number];
  const changeMonth = (delta: number) => {
    const d = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
    onMonth(d.toISOString().slice(0, 7));
  };
  return (
    <div className={className}>
      <div className="flex gap-8">
        {[30, 45, 60].map((days) => (
          <button
            key={days}
            className="tap focus-ring h-32 flex-1 rounded-full bg-ds-canvas text-label before:absolute before:inset-x-0 before:-inset-y-4 hover:bg-ds-canvas-hover"
            onClick={(event) =>
              onPick(
                new Date(Date.parse(DEMO_TODAY) + days * 86400000).toISOString().slice(0, 10),
                event.currentTarget,
              )
            }
          >
            {days} days
          </button>
        ))}
      </div>
      {/* The board hangs the two arrows on the card's padding edge, so the
          tap target's own padding is pulled back out. */}
      <div className="-mx-11 -my-11 flex items-center justify-between">
        <button
          aria-label="Previous month"
          className="press focus-ring rounded-small p-8 text-ds-ink disabled:text-ds-muted"
          disabled={month <= "2026-11"}
          onClick={() => changeMonth(-1)}
        >
          <CaretLeft size={18} />
        </button>
        <span id={labelId} className="text-[14px] font-medium">
          {new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${month}-01`))}
        </span>
        <button
          aria-label="Next month"
          className="press focus-ring rounded-small p-8 text-ds-ink disabled:text-ds-muted"
          disabled={month >= "2027-01"}
          onClick={() => changeMonth(1)}
        >
          <CaretRight size={18} />
        </button>
      </div>
      <DueGrid
        month={month}
        due={due}
        labelledBy={labelId}
        onMonth={onMonth}
        onPick={(date, from) => onPick(date, from)}
      />
      <p className="text-caption text-ds-muted">Paying later than 60 days needs a talk with us.</p>
    </div>
  );
}
