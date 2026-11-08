"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";

const IDLE_MS = 900;

/**
 * A thin scrollbar that replaces the browser's on mouse devices (globals.css hides the native
 * one there). It shows while the page scrolls or when the pointer nears the right edge, fades
 * out after a short pause, and can be dragged. Touch screens keep their own overlay scrollbar.
 */
export function ScrollIndicator() {
  const lenis = useLenis();
  const [visible, setVisible] = useState(false);
  const [thumb, setThumb] = useState({ top: 0, height: 0 });
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ startY: number; startScroll: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const measure = () => {
      const doc = document.documentElement;
      const view = window.innerHeight;
      const total = doc.scrollHeight;
      const track = view - 16;
      const height = Math.max(40, (view / total) * track);
      const top = 8 + (window.scrollY / Math.max(1, total - view)) * (track - height);
      setThumb({ top, height: total > view ? height : 0 });
    };
    const wake = () => {
      setVisible(true);
      if (idle.current) clearTimeout(idle.current);
      idle.current = setTimeout(() => !drag.current && setVisible(false), IDLE_MS);
    };
    const onScroll = () => {
      measure();
      wake();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && window.innerWidth - e.clientX < 24) wake();
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("pointermove", onMove, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      if (idle.current) clearTimeout(idle.current);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startScroll: window.scrollY };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const doc = document.documentElement;
    const view = window.innerHeight;
    const ratio = (doc.scrollHeight - view) / (view - 16 - thumb.height);
    const y = drag.current.startScroll + (e.clientY - drag.current.startY) * ratio;
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  };
  const onPointerUp = () => {
    drag.current = null;
    setDragging(false);
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => setVisible(false), IDLE_MS);
  };

  if (!thumb.height) return null;
  const shown = visible || dragging;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-y-0 right-0 z-[60] hidden w-16 hover-fine:block"
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerEnter={() => setVisible(true)}
        className={`group absolute right-3 flex w-10 cursor-grab justify-end transition-opacity duration-300 ease-out active:cursor-grabbing ${
          shown ? "pointer-events-auto opacity-100" : "opacity-0"
        }`}
        style={{ top: thumb.top, height: thumb.height }}
      >
        <span
          className={`h-full rounded-full bg-ds-ink/40 ring-1 ring-white/60 transition-[width,background-color] duration-150 ease-out group-hover:w-8 group-hover:bg-ds-ink/55 ${
            dragging ? "w-8 bg-ds-ink/60" : "w-6"
          }`}
        />
      </div>
    </div>
  );
}
