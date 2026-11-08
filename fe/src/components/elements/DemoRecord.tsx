import { ArrowUpRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";

/** Fixtures have no transaction hash. Link to the real testnet account without inventing one. */
export function DemoRecord({ title = "Demo receipt" }: { title?: string }) {
  return (
    <a
      href="https://testnet.nearblocks.io/address/app.waybil.testnet"
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring flex w-full items-center gap-12 rounded-row bg-ds-bg p-16 text-left"
    >
      <CheckCircle size={32} className="shrink-0 text-ds-success" />
      <span className="min-w-0 flex-1">
        <span className="block text-label">{title}</span>
        <span className="block text-caption text-ds-muted">See the record on NearBlocks</span>
      </span>
      <ArrowUpRight size={16} className="shrink-0" />
    </a>
  );
}
