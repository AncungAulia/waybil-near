import { cn } from "@/lib/cn";
import { NEARBLOCKS_URL, WAYBIL_CONTRACT } from "@/lib/env";
import { Logo } from "./Logo";

/*
 * Footer from design/waybil.pen → Organism/Footer and the States board.
 * A dark card: the lockup and the line, three columns of short links, then the small print.
 * Footer links drop the "↗" and keep short labels (AGENTS.md "Writing UI copy").
 */

const GITHUB = "https://github.com/AncungAulia/waybil-near";
const EXPLORER = NEARBLOCKS_URL;

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Shipments", href: "/shipper/shipments" },
      { label: "Pool", href: "/pool" },
      { label: "Activity", href: "/shipper" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "How it works", href: GITHUB + "#how-it-works", external: true },
      { label: "Source code", href: GITHUB, external: true },
      { label: "GitHub", href: GITHUB, external: true },
    ],
  },
  {
    title: "Network",
    links: [
      { label: "NEAR testnet", href: `${EXPLORER}/address/${WAYBIL_CONTRACT}`, external: true },
      { label: "NearBlocks", href: EXPLORER, external: true },
      { label: "Faucet", href: "https://near-faucet.io", external: true },
    ],
  },
];

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "flex w-full flex-col gap-40 rounded-card bg-ds-ink px-40 pt-40 pb-28 text-ds-bg",
        className,
      )}
    >
      <div className="flex flex-col gap-40 lg:flex-row lg:justify-between">
        <div className="flex max-w-420 flex-col gap-14">
          <Logo light />
          <p className="flex flex-wrap gap-7 text-[28px] font-medium">
            <span>Goods arrive.</span>
            <span className="font-serif">Cash flows.</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-64">
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-12">
              <p className="text-label text-ds-on-night-dim">{col.title}</p>
              {col.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  {...("external" in link ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  /* The States board ring. Its brand outline stays visible on the ink card. */
                  className="focus-ring self-start rounded-[4px] text-body text-ds-bg transition-colors duration-150 ease-base hover:text-ds-brand"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-ds-bg/12" />

      <div className="flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
        <p className="text-label text-ds-on-night-dim">
          © 2026 Waybil. Built at NEAR Hackathon 2026.
        </p>
        <p className="flex items-center gap-8 self-start rounded-full border border-ds-bg/20 px-12 py-6 text-label">
          <span className="size-8 rounded-full bg-ds-brand" />
          Built on NEAR
        </p>
      </div>
    </footer>
  );
}
