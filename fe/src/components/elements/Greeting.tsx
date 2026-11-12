"use client";
import { cn } from "@/lib/cn";

/** "Good morning" from 5:00, "Good afternoon" from 12:00, "Good evening" from 17:00, else "Good night". */
export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

/** The first three words of a name, so "Aulia Nur Fajri Tri Anggoro" reads "Aulia Nur Fajri". */
export const shortName = (name: string) => name.trim().split(/\s+/).slice(0, 3).join(" ");

/**
 * The page title that greets the person by the time of day on their own device. It stays on
 * one line, with the first three words of the name, cut short with an ellipsis on a narrow
 * phone. The server renders in its own time zone, so the text may change once in the
 * browser, which React is told to expect.
 */
export function Greeting({ name, className }: { name?: string; className?: string }) {
  const text = name ? `${greeting()}, ${shortName(name)}` : greeting();
  return (
    <h1 suppressHydrationWarning title={text} className={cn("text-title truncate", className)}>
      {text}
    </h1>
  );
}
