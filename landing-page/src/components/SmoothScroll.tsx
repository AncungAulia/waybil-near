"use client";

import { useEffect, type ReactNode } from "react";
import { ReactLenis, useLenis } from "lenis/react";

/** Where a section lands below the fixed navbar. */
const OFFSET = -88;

/**
 * Smooth wheel scrolling with Lenis. Touch keeps the native scroll, and Lenis turns itself
 * off when the visitor prefers reduced motion.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ autoRaf: true, lerp: 0.1 }}>
      <SectionLinks />
      {children}
    </ReactLenis>
  );
}

/**
 * Links to a section (href="#faq") scroll there without putting "#faq" in the address bar.
 * The href stays, so the links still work without JavaScript. A page opened with a hash
 * scrolls to that section and then drops the hash from the address. Otherwise a refresh
 * always starts at the top.
 */
function SectionLinks() {
  const lenis = useLenis();

  // Don't let the browser restore the old scroll position on refresh.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  useEffect(() => {
    const go = (id: string, immediate = false) => {
      const target = id === "top" ? 0 : document.getElementById(id);
      if (target === null) return false;
      if (lenis)
        lenis.scrollTo(target, { offset: target === 0 ? 0 : OFFSET, immediate, force: true });
      else if (target === 0) window.scrollTo({ top: 0 });
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + OFFSET });
      return true;
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      const id = link?.getAttribute("href")?.slice(1);
      if (!id) return;
      e.preventDefault();
      // Let a closing menu restore scrolling first.
      requestAnimationFrame(() => requestAnimationFrame(() => go(id)));
    };

    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      history.replaceState(null, "", location.pathname + location.search);
      requestAnimationFrame(() => go(id, true));
    } else {
      // A refresh always starts at the top, so the hero entrance plays from the start.
      go("top", true);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [lenis]);

  return null;
}
