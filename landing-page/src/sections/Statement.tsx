import Image from "next/image";
import { LightningIcon, ScanIcon, ShieldIcon, StampIcon } from "@phosphor-icons/react/ssr";
import { Lines } from "@/components/Lines";
import { Reveal } from "@/components/Reveal";
import { stagger } from "@/lib/stagger";

// Sizes are design pixels (see --u in globals.css).
export function Statement() {
  return (
    <section className="bg-ds-canvas px-20 py-72 md:px-32 md:py-96 lg:py-120">
      <Reveal className="mx-auto flex max-w-1140 flex-col items-center gap-32 md:gap-40 lg:gap-48">
        <div className="flex flex-col items-center gap-14 text-center">
          <h2 className="fs-40 leading-[1.02] font-medium tracking-[-0.03em] md:fs-56 lg:fs-64">
            <Lines lines={["Deliver today.", "Get paid today."]} />
          </h2>
          <p
            className="reveal max-w-520 fs-16 leading-relaxed text-ds-muted md:fs-17"
            style={stagger(2)}
          >
            No more chasing a bill for weeks. The money lands the moment the warehouse scans.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-12 md:gap-16 lg:grid-cols-[1fr_calc(var(--u)*300)_calc(var(--u)*300)]">
          {/* Scan at the dock */}
          <div
            className="media-in relative col-span-2 h-400 overflow-hidden r-24 md:h-420 lg:col-span-1 lg:row-span-2 lg:h-auto"
            style={stagger(1)}
          >
            <Image
              src="/images/bento-2.jpg"
              alt="A warehouse worker scans the QR code on a driver's phone"
              fill
              sizes="(max-width: 1024px) 100vw, 540px"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-white/70 px-20 pt-40 pb-24 text-center backdrop-blur-sm">
              <span className="absolute -top-26 left-1/2 grid size-52 -translate-x-1/2 place-items-center rounded-full bg-ds-brand">
                <ScanIcon weight="fill" className="size-26" aria-hidden />
              </span>
              <p className="mx-auto max-w-380 fs-16 leading-snug font-medium md:fs-19">
                One scan at the dock, and the money moves before the truck does.
              </p>
            </div>
          </div>

          {/* Approved */}
          <div
            className="media-in relative h-200 overflow-hidden r-24 md:col-start-1 md:h-212 lg:col-start-2 lg:row-start-1 lg:h-222"
            style={stagger(2)}
          >
            <Image
              src="/images/bento-1.jpg"
              alt="A Waybil truck at a warehouse dock"
              fill
              sizes="(max-width: 768px) 50vw, 300px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent to-60%" />
            <p className="absolute inset-x-12 bottom-12 mx-auto w-fit rounded-full bg-white/20 px-12 py-6 text-center fs-12 font-medium text-white backdrop-blur-md md:fs-13">
              Approved before the truck leaves
            </p>
          </div>

          {/* Fast, fair and recorded */}
          <div
            className="media-in flex h-200 flex-col items-center justify-center gap-16 r-24 bg-ds-brand p-16 text-center md:col-start-1 md:h-212 lg:col-start-2 lg:row-start-2 lg:h-222"
            style={stagger(3)}
          >
            <span className="relative grid size-60 place-items-center">
              <ShieldIcon weight="fill" className="absolute inset-0 size-60" aria-hidden />
              <StampIcon
                weight="fill"
                className="relative -mt-4 size-22 text-ds-brand"
                aria-hidden
              />
            </span>
            <p className="max-w-240 fs-22 leading-[1.15] font-medium tracking-[-0.02em] md:fs-30">
              Fast, fair and recorded.
            </p>
          </div>

          {/* 0 days */}
          <div
            className="media-in relative col-span-2 h-360 overflow-hidden r-24 text-white md:col-span-1 md:col-start-2 md:row-span-2 md:row-start-2 md:h-auto lg:col-start-3 lg:row-start-1"
            style={stagger(4)}
          >
            <Image
              src="/images/bento-3.jpg"
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 344px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/30 backdrop-blur-xl" />
            <div className="relative flex h-full flex-col items-center justify-between px-24 py-36 text-center">
              <span className="grid size-56 place-items-center rounded-full bg-ds-brand text-ds-ink">
                <LightningIcon weight="fill" className="size-26" aria-hidden />
              </span>
              <p className="fs-64 leading-none font-medium tracking-[-0.04em] lg:fs-72">0 days</p>
              <p className="max-w-240 fs-18 leading-snug lg:fs-22">
                of waiting for your money after delivery
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
