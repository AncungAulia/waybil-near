import { cn } from "@/lib/cn";
import { ArrowUpRight, SealCheck } from "@phosphor-icons/react/dist/ssr";

/*
 * The receipt row the boards draw under a result (K2.8, W2.6, P4.4): a soft green circle,
 * the title, and the explorer link. Fixtures have no transaction hash, so this links to the
 * real testnet account without inventing one.
 */
export function DemoRecord({
  title = "Demo receipt",
  className,
  icon,
}: {
  title?: string;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <a
      href="https://testnet.nearblocks.io/address/app.waybil.testnet"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "focus-ring flex w-full items-center gap-12 rounded-row bg-ds-bg p-16 text-left",
        className,
      )}
    >
      <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-success-soft text-ds-success">
        {icon ?? <SealCheck size={20} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-label">{title}</span>
        <span className="block text-caption text-ds-muted">See the record on NearBlocks</span>
      </span>
      <ArrowUpRight size={16} className="shrink-0 text-ds-brand-deep" />
    </a>
  );
}
