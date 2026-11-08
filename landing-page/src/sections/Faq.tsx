"use client";

import { useId, useState } from "react";
import { Lines } from "@/components/Lines";
import { Reveal } from "@/components/Reveal";
import { stagger } from "@/lib/stagger";

const QA = [
  {
    q: "Who pays the driver?",
    a: "The pool pays the driver the moment the warehouse confirms the delivery. Investors put money in the pool, and the shipper pays it back by the due date.",
  },
  {
    q: "What if the goods arrive damaged or short?",
    a: "The warehouse reports it with a count and photos. The payout waits until the shipper chooses what to pay, and the driver gets that amount.",
  },
  {
    q: "What happens when a shipper pays late?",
    a: "They can't start new trips until the bill is paid. If it is still unpaid 14 days after the due date, the reserve covers it.",
  },
  {
    q: "Where does the 2.5% fee go?",
    a: "1.6% goes to the investors, 0.4% to a safety reserve and 0.5% to Waybil. The driver keeps 97.5%.",
  },
  {
    q: "Do drivers and warehouses need a wallet?",
    a: "No. They sign in with Google, and Waybil covers the network fees.",
  },
  {
    q: "Who can change the rules?",
    a: "Big changes need 2 of 3 Waybil team members, and every change is recorded.",
  },
  {
    q: "Is real money moving today?",
    a: "Not yet. Waybil runs on NEAR testnet with test USDC, so you can try it without risk.",
  },
];

export function Faq() {
  const [open, setOpen] = useState(0);
  const id = useId();

  return (
    <section id="faq" className="scroll-mt-96 bg-ds-canvas px-20 pb-72 md:px-32 md:pb-96 lg:pb-140">
      <Reveal className="mx-auto flex max-w-840 flex-col gap-32 md:gap-40 lg:gap-56">
        <div className="flex flex-col items-center gap-16 text-center">
          <h2 className="fs-40 leading-[1.05] font-medium tracking-[-0.03em] md:fs-52 lg:fs-56">
            <Lines lines={["Frequently asked questions"]} />
          </h2>
          <p
            className="reveal max-w-520 fs-16 leading-relaxed text-ds-muted md:fs-17"
            style={stagger(1)}
          >
            How the money moves, who pays, and what happens when something goes wrong.
          </p>
        </div>

        <ul className="flex flex-col gap-10 md:gap-12">
          {QA.map((item, i) => {
            const isOpen = open === i;
            return (
              <li key={item.q} className="reveal r-16 bg-white md:r-20" style={stagger(i + 1)}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`${id}-${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-24 px-20 py-18 text-left fs-17 font-medium tracking-[-0.01em] md:px-28 md:py-24 md:fs-20"
                  >
                    {item.q}
                    <PlusMinus open={isOpen} />
                  </button>
                </h3>
                <div
                  id={`${id}-${i}`}
                  role="region"
                  className={`grid transition-[grid-template-rows] duration-200 ease-[var(--ease-in-out)] motion-reduce:transition-none ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p
                      className={`px-20 pb-20 fs-16 leading-relaxed text-ds-muted transition-opacity duration-200 ease-out md:px-28 md:pb-24 ${
                        isOpen ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {item.a}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
}

/** A plus that turns into a minus: the vertical bar folds away. */
function PlusMinus({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid size-36 shrink-0 place-items-center rounded-full transition-colors duration-200 ease-out ${
        open ? "bg-ds-ink text-white" : "bg-ds-canvas text-ds-ink"
      }`}
    >
      <svg
        viewBox="0 0 16 16"
        className="size-16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M3 8h10" />
        <path
          d="M8 3v10"
          className={`origin-center transition-transform duration-200 ease-out motion-reduce:transition-none ${
            open ? "scale-y-0" : "scale-y-100"
          }`}
        />
      </svg>
    </span>
  );
}
