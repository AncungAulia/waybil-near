"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Bottom nav from design/waybil.pen → Nav/Bottom and the States board.
 * A floating white pill. The open item grows into an ink pill with its label; the others
 * stay as 44 px grey circles. Only this highlight is allowed to slide (fe/AGENTS.md).
 */

export interface BottomNavItem {
  href: string;
  label: string;
  /* An element, not a component: a server page cannot hand a function to this client one. */
  icon: ReactNode;
}

export function BottomNav({
  items,
  current,
  className,
}: {
  items: BottomNavItem[];
  /** Which item is open, by href. */
  current: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex gap-8 rounded-full border border-ds-line bg-ds-bg p-6",
        /* Clear of the home indicator on a phone. */
        "mb-[var(--safe-bottom)]",
        className,
      )}
    >
      {items.map((item) => {
        const on = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            aria-label={on ? undefined : item.label}
            className={cn(
              "press focus-ring flex items-center justify-center rounded-full transition-[color,background-color,border-color,transform] duration-150 ease-base",
              on
                ? "gap-8 bg-ds-ink py-10 pr-16 pl-10 text-ds-bg"
                : "size-44 bg-ds-canvas text-ds-ink",
            )}
          >
            {item.icon}
            {on && <span className="text-[14px] font-medium">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
