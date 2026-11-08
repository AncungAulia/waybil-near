import Image from "next/image";
import { Lines } from "@/components/Lines";
import { Reveal } from "@/components/Reveal";
import { stagger } from "@/lib/stagger";

const PEOPLE = [
  { name: "Shippers", text: "Ship the goods and pay the bill on the due date.", img: "people-1" },
  { name: "Truck owners", text: "Drive the load and get paid when it arrives.", img: "people-2" },
  {
    name: "Warehouses",
    text: "Check the goods and scan to confirm the delivery.",
    img: "people-3",
  },
  {
    name: "Investors",
    text: "Fund the pool and earn from deliveries that happened.",
    img: "people-4",
  },
];

/**
 * On desktop with a mouse, the card under the pointer (or with keyboard focus) widens and
 * shows its description. Everywhere else every description is visible.
 */
export function FourPeople() {
  return (
    <section
      id="who-its-for"
      className="scroll-mt-96 bg-ds-canvas px-20 pb-72 md:px-32 md:pb-96 lg:px-40 lg:pb-140"
    >
      <Reveal className="mx-auto flex max-w-1360 flex-col gap-32 md:gap-40 lg:gap-56">
        <div className="flex flex-col gap-16 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="fs-44 leading-[1.02] font-medium tracking-[-0.03em] md:fs-56 lg:fs-72">
            <Lines lines={["One shipment.", "Four people."]} />
          </h2>
          <p
            className="reveal max-w-400 fs-16 leading-relaxed text-ds-muted md:fs-17"
            style={stagger(2)}
          >
            Each person sees only what they need to do their part.
          </p>
        </div>

        <ul className="people grid gap-12 md:grid-cols-2 md:gap-16 lg:flex lg:h-560">
          {PEOPLE.map((p, i) => (
            <li
              key={p.name}
              tabIndex={0}
              className="people-card relative h-340 r-24 outline-offset-4 md:h-440 lg:h-auto lg:flex-1"
            >
              <div
                className="media-in absolute inset-0 overflow-hidden r-24"
                style={stagger(i + 1)}
              >
                <div className="people-zoom absolute inset-0">
                  <Image
                    src={`/images/${p.img}.jpg`}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 540px"
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="people-dim absolute inset-0 bg-black" />
                <div className="absolute inset-x-20 bottom-20 flex flex-col text-white">
                  <h3 className="fs-24 font-medium tracking-[-0.02em]">{p.name}</h3>
                  <div className="people-desc">
                    <p className="max-w-320 fs-15 leading-snug text-white/80">
                      <span className="block pt-6">{p.text}</span>
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
