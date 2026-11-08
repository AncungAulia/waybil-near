"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ArrowUpRightIcon, ListIcon, XIcon } from "@phosphor-icons/react";
import { ArrowSwap } from "./ArrowSwap";
import { useLenis } from "lenis/react";
import { Logo } from "./Logo";
import { NearLogo } from "./NearLogo";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#who-its-for", label: "Who it's for" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Always visible, with no bar behind it: a progressive blur that is strongest at the top edge
 * and fades out below, tinted with the color of the section underneath. Over dark sections
 * (marked data-nav="dark") the tint is dark and the text white; over light ones the tint is
 * the page color and the text dark. Colors crossfade in 200 ms.
 * On small screens a menu button opens a full-screen menu.
 * Sizes are design pixels (see --u in globals.css).
 */
export function Navbar({ appUrl }: { appUrl: string }) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const lenis = useLenis();

  useEffect(() => {
    const onScroll = () => {
      // Which section sits under the middle of the navbar?
      const y = 36;
      const over = [...document.querySelectorAll<HTMLElement>("[data-nav='dark']")].some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= y && r.bottom > y;
      });
      setDark(over);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, lenis]);

  const fade = "transition-[opacity,background-color,color] duration-200 ease-out";
  const light = !dark;

  return (
    <>
      <header
        className="drop-load fixed inset-x-0 top-0 z-40"
        style={{ "--d": 150 } as CSSProperties}
      >
        <ProgressiveBlur dark={dark} />
        <nav className="relative mx-auto flex h-64 max-w-1440 items-center justify-between px-20 md:h-72 md:px-32 lg:h-80 lg:px-40">
          <a href="#top" className="relative block h-32" aria-label="Waybil home">
            <Logo light className={`${fade} ${light ? "opacity-0" : "opacity-100"}`} />
            <Logo className={`absolute inset-0 ${fade} ${light ? "opacity-100" : "opacity-0"}`} />
          </a>

          <ul className="hidden items-center gap-36 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className={`link-line fs-15 ${fade} ${light ? "text-ds-ink" : "text-white/80"}`}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href={appUrl}
            className={`press group hidden h-48 items-center gap-12 rounded-full py-6 pr-6 pl-20 fs-15 font-medium md:inline-flex ${fade} ${
              light ? "bg-ds-ink text-white" : "bg-white text-ds-ink"
            }`}
          >
            Open the app
            <ArrowSwap
              className={`${fade} ${light ? "bg-white text-ds-ink" : "bg-ds-ink text-white"}`}
            />
          </a>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open the menu"
            aria-expanded={open}
            className={`press grid size-44 place-items-center rounded-full md:hidden ${fade} ${
              light ? "bg-ds-ink text-white" : "bg-white text-ds-ink"
            }`}
          >
            <ListIcon weight="bold" className="size-20" />
          </button>
        </nav>
      </header>

      <MobileMenu open={open} onClose={() => setOpen(false)} appUrl={appUrl} />
    </>
  );
}

function MobileMenu({
  open,
  onClose,
  appUrl,
}: {
  open: boolean;
  onClose: () => void;
  appUrl: string;
}) {
  const pill =
    "press group flex h-48 items-center justify-between rounded-full py-6 pr-6 pl-20 fs-15 font-medium";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-0 z-50 flex flex-col justify-between bg-ds-night px-20 pt-20 pb-32 md:hidden ${
        open
          ? "translate-y-0 opacity-100 transition-[opacity,transform] duration-300 ease-[var(--ease-drawer)]"
          : "pointer-events-none -translate-y-8 opacity-0 transition-[opacity,transform] duration-200 ease-out motion-reduce:translate-y-0"
      }`}
    >
      <div className="flex flex-col gap-56">
        <div className="flex h-48 items-center justify-between">
          <Logo light />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the menu"
            className="press grid size-44 place-items-center rounded-full bg-white text-ds-ink"
          >
            <XIcon weight="bold" className="size-20" />
          </button>
        </div>
        <ul>
          {LINKS.map((l) => (
            <li key={l.href} className="border-b border-white/10">
              <a
                href={l.href}
                onClick={onClose}
                className="flex items-center justify-between py-18 fs-34 font-medium tracking-tight text-white"
              >
                {l.label}
                <ArrowUpRightIcon weight="bold" className="size-22 text-white/40" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-12">
        <a href={`${appUrl}/onboarding/shipper`} className={`${pill} bg-ds-brand text-ds-ink`}>
          Start shipping
          <ArrowSwap className="bg-ds-ink text-ds-brand" />
        </a>
        <a href={appUrl} className={`${pill} bg-white text-ds-ink`}>
          Open the app
          <ArrowSwap className="bg-ds-ink text-white" />
        </a>
        <p className="flex items-center justify-center gap-8 pt-12 fs-13 text-white/50">
          <NearLogo className="size-13" />
          Live on NEAR testnet.
        </p>
      </div>
    </div>
  );
}

/**
 * Five stacked backdrop blurs (1 to 16 px), each masked to its own band, so the blur builds
 * up toward the top edge with no hard line. A tint on top fades from the section color.
 */
function ProgressiveBlur({ dark }: { dark: boolean }) {
  const layers = [1, 2, 4, 8, 16];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[150%]">
      {layers.map((blur, i) => {
        const from = 100 - (i + 1) * 20;
        const to = from + 30;
        return (
          <div
            key={blur}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: `linear-gradient(to top, transparent ${from}%, black ${to}%)`,
              WebkitMaskImage: `linear-gradient(to top, transparent ${from}%, black ${to}%)`,
            }}
          />
        );
      })}
      <div
        className={`absolute inset-0 bg-gradient-to-b to-transparent transition-opacity duration-200 ease-out ${
          dark ? "opacity-0" : "opacity-100"
        } from-ds-canvas/90 via-ds-canvas/50`}
      />
      <div
        className={`absolute inset-0 bg-gradient-to-b to-transparent transition-opacity duration-200 ease-out ${
          dark ? "opacity-100" : "opacity-0"
        } from-ds-night/80 via-ds-night/35`}
      />
    </div>
  );
}
