import { cn } from "@/lib/cn";
import { CONTRACT_RECORD_URL } from "@/lib/env";
import { ArrowUpRight, SealCheck } from "@phosphor-icons/react/dist/ssr";

/*
 * The receipt row the boards draw under a result (K2.8, W2.6, P4.4): a soft green circle,
 * the title, and the explorer link. Fixtures have no transaction hash, so by default this
 * links to the contract's account page and says it is a sample instead of inventing a hash.
 * Pass `href` for a real record and `sample={false}` to drop the sample tag.
 */
export function DemoRecord({
  title = "Demo receipt",
  href = CONTRACT_RECORD_URL,
  sample = true,
  className,
  icon,
}: {
  title?: string;
  /** Where the row goes. Defaults to the contract's account page on NearBlocks. */
  href?: string;
  /** Marks the row as sample data, because the link opens a general account page. */
  sample?: boolean;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "tap focus-ring flex w-full items-center gap-12 rounded-row bg-ds-bg p-16 text-left hover:bg-ds-canvas",
        className,
      )}
    >
      <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-success-soft text-ds-success">
        {icon ?? <SealCheck size={20} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <span className="text-label">{title}</span>
          {sample && (
            <span className="rounded-full bg-ds-canvas px-8 py-1 text-[11.5px] leading-[1.45] font-medium text-ds-muted">
              Sample
            </span>
          )}
        </span>
        <span className="block text-caption text-ds-muted">See the record on NearBlocks</span>
        {sample && (
          <span className="sr-only">
            This is sample data. The link opens the Waybil account page.
          </span>
        )}
      </span>
      <ArrowUpRight size={16} className="shrink-0 text-ds-brand-deep" />
    </a>
  );
}
