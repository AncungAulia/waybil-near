import { ArrowUpRightIcon } from "@phosphor-icons/react/ssr";

/**
 * The round arrow in a button. On hover (`.group`) the arrow leaves up and right and a new
 * one comes in from the bottom left. See `.arrow-swap` in globals.css.
 */
export function ArrowSwap({ className = "" }: { className?: string }) {
  return (
    <span className={`arrow-swap grid size-36 place-items-center rounded-full ${className}`}>
      <ArrowUpRightIcon weight="bold" className="size-17" aria-hidden />
      <ArrowUpRightIcon weight="bold" className="size-17" aria-hidden />
    </span>
  );
}
