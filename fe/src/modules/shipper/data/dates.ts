/*
 * Dates on the shipper screens. Shipments store times as nanoseconds (contract.md), and
 * the demo runs on a fixed "today" so the server and the browser draw the same words.
 */
export const DEMO_TODAY = "2026-11-12";
export const DEMO_NOW = Date.parse(DEMO_TODAY);
const DAY = 86400000;

export function nanos(ms: number) {
  return (BigInt(ms) * 1000000n).toString();
}
export function millis(value: string | null | undefined) {
  return value ? Number(BigInt(value) / 1000000n) : undefined;
}
const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" });
const SHORT = fmt({ month: "short", day: "numeric" });
const LONG = fmt({ month: "short", day: "numeric", year: "numeric" });

/** "Dec 11" */
export const shortDate = (ms: number) => SHORT.format(new Date(ms));
/** "Dec 11, 2026" */
export const longDate = (ms: number) => LONG.format(new Date(ms));
/** Whole days from one moment to another, counted by calendar day. */
export const daysBetween = (from: number, to: number) =>
  Math.round((Math.floor(to / DAY) * DAY - Math.floor(from / DAY) * DAY) / DAY);
const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/** "Dec 11, 2026 · in 29 days", "Nov 12, 2026 · today" or "Nov 9, 2026 · 3 days late". */
export function dueSummary(dueAt: string, now = DEMO_NOW) {
  const due = millis(dueAt)!;
  const left = daysBetween(now, due);
  return `${longDate(due)} · ${left > 0 ? `in ${days(left)}` : left === 0 ? "today" : `${days(-left)} late`}`;
}

/** How a payment on `paid` sits against the due date, for example "29 days early". */
export function timing(dueAt: string, paid = DEMO_NOW) {
  const left = daysBetween(paid, millis(dueAt)!);
  return left > 0 ? `${days(left)} early` : left === 0 ? "on the due date" : `${days(-left)} late`;
}

/**
 * "Nov 12 · 14:05", the way the progress card writes a moment the person just made. The
 * demo keeps its fixed day and takes the clock time from the browser. Only call it after
 * mount, since the server has another clock.
 */
export function demoMoment(ms: number) {
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(ms));
  return `${shortDate(DEMO_NOW)} · ${time}`;
}
