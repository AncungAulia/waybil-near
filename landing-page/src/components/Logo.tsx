import Image from "next/image";

/** The horizontal lockup, 32 design pixels tall. `light` is the white version for dark backgrounds. */
export function Logo({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <Image
      src={light ? "/brand/waybil-lockup-reversed.svg" : "/brand/waybil-lockup.svg"}
      alt="Waybil"
      width={139}
      height={32}
      loading="eager"
      className={`h-32 w-auto ${className}`}
    />
  );
}
