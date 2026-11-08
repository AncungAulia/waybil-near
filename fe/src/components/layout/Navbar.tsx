"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

/*
 * Desktop navbar from design/waybil.pen → Organism/Navbar and the States board.
 * A 72 px white pill: the logo and the links on the left, the wallet on the right.
 * The links sit in their own grey pill; the open one is white.
 * Switching tabs never animates, only the highlight's colour (fe/AGENTS.md "Motion").
 */

export interface NavLink {
  href: string;
  label: string;
}

export function Navbar({
  links,
  /** Which link is open, by href. */
  current,
  /** The wallet menu, or the Connect wallet button. */
  wallet,
  className,
}: {
  links: NavLink[];
  current: string;
  wallet?: React.ReactNode;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "flex h-72 w-full items-center justify-between rounded-full border border-ds-line bg-ds-bg px-20",
        className,
      )}
    >
      <div className="flex items-center gap-28">
        <Logo />

        <div className="flex gap-4 rounded-full bg-ds-canvas p-4">
          {links.map((link) => {
            const on = link.href === current;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "focus-ring rounded-full px-16 py-8 text-[14px] font-medium transition-colors duration-150 ease-base",
                  on ? "bg-ds-bg text-ds-ink" : "text-ds-muted hover:bg-ds-bg/60 hover:text-ds-ink",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-12">{wallet}</div>
    </nav>
  );
}
