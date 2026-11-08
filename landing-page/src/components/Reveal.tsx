"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

const ITEMS = ".reveal, .rise-in, .media-in";

/**
 * Plays each child's entrance once, when that child scrolls into view.
 * Children use `.reveal` (fade and lift), `.rise-in` (a headline line rising from its mask)
 * or `.media-in` (a photo or card opening upward), with `style={stagger(n)}` to stagger.
 */
export function Reveal({
  as: Tag = "div",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = [...root.querySelectorAll<HTMLElement>(ITEMS)];
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.setAttribute("data-shown", ""));
      return;
    }
    // A rising line sits outside its mask until it plays, so watch the mask instead.
    const byTarget = new Map(items.map((el) => [el.closest(".line") ?? el, el]));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          byTarget.get(e.target)?.setAttribute("data-shown", "");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    byTarget.forEach((_, target) => io.observe(target));
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
