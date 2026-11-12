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

/**
 * The page title that greets the person by the time of day on their own device. The server
 * renders in its own time zone, so the text may change once in the browser, which React is
 * told to expect. A long name wraps between words.
 */
export function Greeting({ name, className }: { name?: string; className?: string }) {
  return (
    <h1 suppressHydrationWarning className={cn("text-title break-words", className)}>
      {name ? `${greeting()}, ${name}` : greeting()}
    </h1>
  );
}
