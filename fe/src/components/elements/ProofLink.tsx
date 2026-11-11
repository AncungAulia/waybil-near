import { NEARBLOCKS_URL } from "@/lib/env";
import { cn } from "@/lib/cn";

/*
 * Proof link from design/waybil.pen → Atom/Link. Every recorded action ends with one.
 * The wording is fixed by AGENTS.md: "See the record on NearBlocks ↗", one arrow per link.
 */

const EXPLORER = NEARBLOCKS_URL;

export function ProofLink({ tx, className }: { tx: string; className?: string }) {
  return (
    <a
      href={`${EXPLORER}/txns/${tx}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "link focus-ring inline-flex items-center gap-4 text-[14px] font-medium",
        className,
      )}
    >
      See the record on NearBlocks ↗
    </a>
  );
}
