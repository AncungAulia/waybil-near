import Image from "next/image";
import { ClipboardTextIcon, MoneyIcon, ScanIcon } from "@phosphor-icons/react/ssr";
import { Lines } from "@/components/Lines";
import { Reveal } from "@/components/Reveal";
import { stagger } from "@/lib/stagger";

const STEPS = [
  {
    Icon: ClipboardTextIcon,
    title: "The shipper approves the trip.",
    text: "The fee and the due date are set before the truck leaves.",
  },
  {
    Icon: ScanIcon,
    title: "The warehouse confirms the delivery.",
    text: "Staff scan the driver's QR code and check the goods.",
  },
  {
    Icon: MoneyIcon,
    title: "The driver gets paid right away.",
    text: "The driver keeps 97.5% of the bill, paid in seconds. The shipper pays the same bill on the due date, with nothing added.",
  },
];

// Sizes are design pixels (see --u in globals.css).
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-96 bg-ds-canvas px-20 py-72 md:px-32 md:py-96 lg:px-40 lg:py-120"
    >
      <Reveal className="mx-auto flex max-w-1360 flex-col gap-40 md:gap-48 lg:flex-row lg:items-center lg:gap-80">
        <div className="flex flex-col gap-32 lg:w-520 lg:shrink-0 lg:gap-48">
          <div className="flex flex-col gap-20">
            <h2 className="fs-44 leading-[1.02] font-medium tracking-[-0.03em] md:fs-56 lg:fs-72">
              <Lines lines={["One trip.", "Three steps."]} />
            </h2>
            <p className="reveal fs-16 leading-relaxed text-ds-muted md:fs-17" style={stagger(2)}>
              Every payment follows the same path. Each step is recorded, so anyone can check what
              happened.
            </p>
          </div>
          <ol className="flex flex-col gap-32">
            {STEPS.map(({ Icon, title, text }, i) => (
              <li key={title} className="reveal flex gap-16" style={stagger(i + 1)}>
                <span className="grid size-40 shrink-0 place-items-center rounded-full bg-white">
                  <Icon weight="fill" className="size-20" aria-hidden />
                </span>
                <div className="flex flex-col gap-6 pt-7">
                  <h3 className="fs-19 font-medium tracking-[-0.02em] md:fs-22">{title}</h3>
                  <p className="fs-16 leading-relaxed text-ds-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex h-460 items-end gap-20 md:h-540 lg:h-720 lg:flex-1">
          <div
            className="media-in relative hidden h-[60%] w-[36%] overflow-hidden r-24 md:block"
            style={stagger(2)}
          >
            <Image
              src="/images/step-b.jpg"
              alt="A warehouse worker scans the driver's phone at the dock"
              fill
              sizes="(max-width: 1024px) 36vw, 280px"
              className="object-cover"
            />
          </div>
          <div className="media-in relative h-full flex-1 overflow-hidden r-24" style={stagger(3)}>
            <Image
              src="/images/step-c.jpg"
              alt="A truck owner smiles at his phone in the cab"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 60vw, 480px"
              className="object-cover"
            />
            <div
              className="reveal absolute inset-x-12 top-12 flex max-w-440 items-center gap-12 r-22 bg-white/90 p-14 backdrop-blur-md md:inset-x-16 md:top-16"
              style={stagger(14)}
            >
              <Image
                src="/brand/waybil-app-icon.png"
                alt=""
                width={40}
                height={40}
                className="size-40 shrink-0 r-10"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex justify-between fs-13 text-ds-muted">
                  <span className="font-medium">Waybil</span>
                  <span>now</span>
                </div>
                <p className="fs-15 font-semibold">You got paid 292.50 USDC</p>
                <p className="fs-14 leading-snug">
                  Harbor Hub confirmed trip #1041. The money is in your account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
