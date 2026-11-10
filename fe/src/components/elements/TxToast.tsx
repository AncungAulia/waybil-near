"use client";

import { ArrowUpRight, CheckCircle, CircleNotch, Warning } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";
import { useChanged } from "@/hooks/useChanged";
import { NEARBLOCKS_URL } from "@/lib/env";

/*
 * Transaction toast from design/waybil.pen → Toast/Tx and the States board.
 * A dark card that says what is happening to the money, with a link to the record.
 */

type Tx = "sending" | "confirmed" | "failed";

const TX: Record<Tx, { icon: typeof CheckCircle; tile: string; glyph: string }> = {
  sending: { icon: CircleNotch, tile: "bg-ds-ink-2", glyph: "text-ds-bg" },
  confirmed: { icon: CheckCircle, tile: "bg-ds-brand", glyph: "text-ds-ink" },
  failed: { icon: Warning, tile: "bg-ds-danger", glyph: "text-ds-bg" },
};

const EXPLORER = NEARBLOCKS_URL;

export function TxToast({
  state,
  title,
  meta,
  tx,
  className,
}: {
  state: Tx;
  title: string;
  meta: string;
  /** Left out while the transaction has no hash yet. */
  tx?: string;
  className?: string;
}) {
  const { icon: Icon, tile, glyph } = TX[state];
  /* The title crossfades when it changes, never on first show. */
  const changed = useChanged(title);

  const body = (
    <>
      <span className={cn("grid size-36 shrink-0 place-items-center rounded-full", tile)}>
        <Icon
          size={18}
          weight={state === "sending" ? "bold" : "fill"}
          className={cn(glyph, state === "sending" && "animate-spin motion-reduce:animate-none")}
        />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span
          key={title}
          className={cn("truncate text-[14px] font-medium text-ds-bg", changed && "swap")}
        >
          {title}
        </span>
        <span className="truncate text-caption text-ds-on-night">{meta}</span>
      </span>

      {tx && <ArrowUpRight size={16} className="shrink-0 text-ds-bg" />}
    </>
  );

  const shell =
    "enter flex w-380 max-w-full items-center gap-12 rounded-[22px] bg-ds-ink py-12 pr-16 pl-12";

  /*
   * The card with a record stays a real link. `role="status"` on the `<a>` would replace its
   * link role, so it announces changes through `aria-live` instead, which keeps the role.
   */
  return tx ? (
    <a
      href={`${EXPLORER}/txns/${tx}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-live="polite"
      aria-atomic="true"
      className={cn(shell, "focus-ring", className)}
    >
      {body}
    </a>
  ) : (
    <div role="status" className={cn(shell, className)}>
      {body}
    </div>
  );
}
