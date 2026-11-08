import Image from "next/image";
import { PillButton } from "@/components/PillButton";
import { Lines } from "@/components/Lines";
import { Reveal } from "@/components/Reveal";
import { stagger } from "@/lib/stagger";

/**
 * The photo fades into the page at the top and into the footer at the bottom.
 * The truck sits at a fixed share of the width, so on desktop the section is at least 56% of
 * the width tall: the copy always has open sky between it and the truck roof.
 */
export function Cta({ appUrl }: { appUrl: string }) {
  return (
    <section className="relative isolate h-680 overflow-hidden bg-ds-canvas md:h-760 lg:h-[max(calc(var(--u)*820),56vw)]">
      <Image
        src="/images/cta-truck.jpg"
        alt="A Waybil truck on an open highway"
        fill
        sizes="100vw"
        className="object-cover object-[47%_100%] md:object-[50%_100%]"
      />
      <div className="absolute inset-x-0 top-0 h-[44%] bg-gradient-to-b from-ds-canvas to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-[#111111] via-[#111111]/40 to-transparent" />

      <Reveal className="relative mx-auto flex max-w-800 flex-col items-center lg:max-w-1000 gap-20 px-20 pt-72 text-center md:pt-96 lg:pt-112">
        <h2 className="fs-40 leading-[1.02] font-medium tracking-[-0.03em] md:fs-56 lg:fs-64">
          <Lines lines={["Your drivers get paid today.", "You pay later."]} />
        </h2>
        <p
          className="reveal max-w-520 fs-16 leading-relaxed text-ds-muted md:fs-17 lg:max-w-640"
          style={stagger(1)}
        >
          Same bill, on the date you choose.
        </p>
        <div className="reveal pt-8" style={stagger(2)}>
          <PillButton href={`${appUrl}/onboarding/shipper`}>Start shipping</PillButton>
        </div>
      </Reveal>
    </section>
  );
}
