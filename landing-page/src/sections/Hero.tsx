import type { CSSProperties } from "react";
import Image from "next/image";
import { NearLogo } from "@/components/NearLogo";
import { Lines } from "@/components/Lines";
import { PillButton } from "@/components/PillButton";

/** Delay in ms for an entrance on page load (see .enter, .rise-load in globals.css). */
const d = (ms: number) => ({ "--d": ms }) as CSSProperties;

// The hero fills exactly one screen. The copy sits on the pale sky at the top and the photo
// fills the rest; its sky fades into the page color, so there is no edge.
// Sizes are design pixels (see --u in globals.css). On desktop the hero uses --uh (1440 × 980)
// so the copy fits on short laptop screens too.
const uh = (px: number) => `calc(var(--uh) * ${px})`;
// Text in the hero: half rem and half --uh, so browser zoom still grows it (see fs-* in globals.css).
const uhText = (px: number) =>
  `clamp(${(px * 0.75) / 16}rem, calc(${px / 32}rem + var(--uh) * ${px / 2}), ${px / 16}rem)`;

// hero-road.jpg is 2400 × 1339. The truck sits at 51% across and 68% down.
const PHOTO_RATIO = 2400 / 1339;

export function Hero({ appUrl }: { appUrl: string }) {
  return (
    <section
      id="top"
      className="relative isolate flex h-svh min-h-640 flex-col overflow-hidden bg-ds-canvas"
    >
      {/*
        The photo area starts about a third down. Inside it, a box with the photo's own ratio
        is scaled to cover the area (like object-fit: cover) and shifted by --px and --py.
        The box drifts slowly closer to the truck and back (.hero-drift in globals.css).
      */}
      <div
        className="absolute inset-x-0 top-[34%] bottom-0 overflow-hidden [container-type:size] [--px:0.58] [--py:0] md:top-[36%] md:[--px:0.5] lg:top-[29%] lg:[--py:0.6]"
        style={{ "--r": PHOTO_RATIO } as CSSProperties}
      >
        <div className="hero-drift absolute top-[calc((100cqh-max(100cqh,100cqw/var(--r)))*var(--py))] left-[calc((100cqw-max(100cqw,100cqh*var(--r)))*var(--px))] h-[max(100cqh,100cqw/var(--r))] w-[max(100cqw,100cqh*var(--r))]">
          <Image
            src="/images/hero-road.jpg"
            alt="A Waybil truck on a quiet road through misty hills"
            fill
            preload
            sizes="160vw"
            className="settle-load object-cover"
            style={d(0)}
          />

          {/* A soft band of mist that drifts slowly across the horizon. */}
          <div className="hero-mist absolute top-[36%] left-0 h-[28%] w-[200%]" />
        </div>
        <div className="absolute inset-x-0 top-0 h-170 bg-gradient-to-b from-ds-canvas to-transparent md:h-220 lg:h-[33%]" />
      </div>

      <div
        className="relative mx-auto flex w-full max-w-1000 flex-col items-center gap-18 px-20 pt-170 text-center md:gap-22 md:px-64 md:pt-200 lg:gap-24 lg:pt-[var(--ht-top)]"
        style={{ "--ht-top": uh(130) } as CSSProperties}
      >
        <p
          className="enter flex items-center gap-8 rounded-full border border-ds-line bg-white py-6 pr-14 pl-10 fs-13 font-medium"
          style={d(250)}
        >
          <NearLogo className="size-13" />
          Live on NEAR testnet
        </p>
        <h1
          className="fs-34 leading-[1.04] font-medium tracking-[-0.03em] md:fs-56 lg:text-[length:var(--ht)] lg:leading-[1.02]"
          style={{ "--ht": uhText(76) } as CSSProperties}
        >
          <Lines lines={["Invoices take weeks.", "Waybil takes seconds."]} load delay={350} />
        </h1>
        <p className="enter max-w-460 fs-16 leading-relaxed text-ds-muted md:fs-17" style={d(600)}>
          Truck owners get paid the moment the goods arrive. You pay on your due date.
        </p>
        <div
          className="enter flex flex-col items-center gap-10 pt-6 md:flex-row md:gap-12 md:pt-8"
          style={d(720)}
        >
          <PillButton href={`${appUrl}/onboarding/shipper`} tone="dark">
            Start shipping
          </PillButton>
          <PillButton href={appUrl} tone="light">
            Open the app
          </PillButton>
        </div>
      </div>
    </section>
  );
}
