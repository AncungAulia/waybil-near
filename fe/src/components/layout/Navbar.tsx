"use client";

import { useEffect, useState } from "react";
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

/*
 * Once the page scrolls, the pill gets a little shorter and lifts off the content. It is a
 * layout change seen many times a day, so it is small and quick: 72 to 60 px over 200 ms
 * with the ease-in-out token, and no movement at all with reduced motion. Two thresholds stop it from flickering when the page rests near the top.
 */
function useScrolled(on: boolean) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!on) return;
    const update = () => setScrolled((was) => (was ? window.scrollY > 8 : window.scrollY > 24));
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [on]);
  return scrolled;
}

export function Navbar({
  links,
  /** Which link is open, by href. */
  current,
  /** The wallet menu, or the Connect wallet button. */
  wallet,
  /** Stays at the top of the window and shrinks a little once the page scrolls. */
  sticky = false,
  className,
}: {
  links: NavLink[];
  current: string;
  wallet?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  const compact = useScrolled(sticky);
  const nav = (
    <nav
      className={cn(
        "flex h-72 w-full items-center justify-between rounded-full border border-ds-line bg-ds-bg px-20",
        sticky &&
          "transition-[height,box-shadow] duration-200 ease-in-out motion-reduce:transition-none",
        compact && "h-60 shadow-float",
        !sticky && className,
      )}
    >
      <div className="flex items-center gap-28">
        <span
          className={cn(
            "flex origin-left transition-transform duration-200 ease-in-out motion-reduce:transition-none",
            compact && "scale-90",
          )}
        >
          <Logo />
        </span>

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
  if (!sticky) return nav;
  /*
   * The sticky band keeps its full height, so the page under it never jumps. Only the pill
   * inside it changes. The band is the page colour from the top of the window to below the
   * pill, so nothing that scrolls under it shows around the pill's round ends.
   */
  return (
    <div
      className={cn(
        "sticky top-0 z-30 -mx-32 -mt-20 flex h-104 items-center bg-ds-canvas px-32 pt-8 lg:-mx-40 lg:px-40",
        className,
      )}
    >
      {nav}
    </div>
  );
}
