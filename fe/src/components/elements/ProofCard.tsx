import { ArrowUpRight, CheckCircle, Clock, Warning } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";
import { NEAR_NETWORK } from "@/lib/env";

/*
 * Recorded-action card from design/waybil.pen → Molecule/Proof and the States board.
 * A round icon, what happened, and a link to the record. The whole card is the link.
 */

type Proof = "pending" | "confirmed" | "failed";

const PROOF: Record<Proof, { icon: typeof CheckCircle; tile: string; glyph: string }> = {
  pending: { icon: Clock, tile: "bg-ds-canvas", glyph: "text-ds-muted" },
  confirmed: { icon: CheckCircle, tile: "bg-ds-success-soft", glyph: "text-ds-success" },
  failed: { icon: Warning, tile: "bg-ds-danger-soft", glyph: "text-ds-danger" },
};

const EXPLORER =
  NEAR_NETWORK === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io";

export function ProofCard({
  state,
  /** What happened, for example "Delivery confirmed". */
  title,
  /** The line underneath. Defaults to the link wording. */
  meta,
  tx,
  className,
}: {
  state: Proof;
  title: string;
  meta?: string;
  tx: string;
  className?: string;
}) {
  const { icon: Icon, tile, glyph } = PROOF[state];

  return (
    <a
      href={`${EXPLORER}/txns/${tx}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "focus-ring flex w-380 items-center gap-12 rounded-[18px] bg-ds-bg px-16 py-12",
        "transition-colors duration-150 ease-base hover:bg-ds-canvas",
        className,
      )}
    >
      <span className={cn("grid size-32 shrink-0 place-items-center rounded-full", tile)}>
        <Icon size={16} weight="fill" className={glyph} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="truncate text-label font-semibold text-ds-ink">{title}</span>
        <span className="truncate text-caption text-ds-muted">
          {meta ?? "See the record on NearBlocks"}
        </span>
      </span>

      {/* The card already shows an arrow, so the label drops the "↗" (AGENTS.md). */}
      <ArrowUpRight size={16} className="shrink-0 text-ds-brand-deep" />
    </a>
  );
}
