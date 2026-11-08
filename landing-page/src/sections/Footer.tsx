import { Logo } from "@/components/Logo";
import { NearLogo } from "@/components/NearLogo";

const GITHUB = "https://github.com/AncungAulia/waybil-near";
const NEARBLOCKS = "https://testnet.nearblocks.io/address/app.waybil.testnet";
// The X account is not live yet. Replace with the profile URL when it is.
const X_URL = "https://x.com";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Who it's for", href: "#who-its-for" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Follow",
    links: [
      { label: "X", href: X_URL, external: true },
      { label: "GitHub", href: GITHUB, external: true },
      { label: "NearBlocks", href: NEARBLOCKS, external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer
      data-nav="dark"
      className="bg-[#111111] px-20 pt-56 pb-32 text-white md:px-32 md:pt-72 lg:px-40 lg:pt-88 lg:pb-40"
    >
      <div className="mx-auto flex max-w-1360 flex-col gap-40 md:gap-64">
        <div className="flex flex-col gap-40 lg:flex-row lg:justify-between">
          <div className="flex max-w-360 flex-col items-start gap-16">
            <Logo light />
            <p className="fs-16 leading-relaxed text-white/60">
              Waybil pays truck owners the moment their goods arrive.
            </p>
          </div>
          <div className="flex gap-64 lg:gap-80">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-14">
                <p className="fs-14 font-medium text-white/40">{col.title}</p>
                {col.links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    {...("external" in l ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="link-line self-start fs-15 text-white/90"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-12 border-t border-white/10 pt-24 fs-14 text-white/50 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Waybil</p>
          <p className="flex items-center gap-8">
            <NearLogo className="size-14 text-white" />
            Live on NEAR testnet.
          </p>
        </div>
      </div>
    </footer>
  );
}
