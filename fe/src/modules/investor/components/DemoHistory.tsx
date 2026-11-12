import { ArrowUpRight, Plus, SealCheck } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Money } from "@/components/elements/Money";
import { cn } from "@/lib/cn";

const HISTORY = [
  {
    title: "Earned",
    note: "From Northwind's bill #1032 on Nov 9.",
    amount: "960000",
    kind: "earned",
  },
  {
    title: "Earned",
    note: "From Blue Ridge's bill #1028 on Nov 7.",
    amount: "980000",
    kind: "earned",
  },
  { title: "Withdrawal", note: "To your wallet on Nov 1.", amount: "-500000000", kind: "out" },
  { title: "Deposit", note: "From your wallet on Oct 21.", amount: "5500000000", kind: "in" },
] as const;

/* The sample history (I3.3). */
export function DemoHistory() {
  return (
    <>
      <header>
        <h1 className="text-title">History</h1>
        <p className="mt-6 text-label text-ds-muted">Your deposits, withdrawals, and earnings.</p>
      </header>
      <Panel gap={4} className="px-20 py-8">
        {HISTORY.map((h, i) => (
          <div key={i} className="flex items-center gap-12 py-14">
            <span className="grid size-38 shrink-0 place-items-center rounded-full bg-ds-canvas">
              {h.kind === "earned" ? (
                <SealCheck size={16} />
              ) : h.kind === "out" ? (
                <ArrowUpRight size={16} />
              ) : (
                <Plus size={16} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body">{h.title}</span>
              <span className="block text-caption text-ds-muted">{h.note}</span>
            </span>
            <span
              className={cn(
                "shrink-0 text-label",
                h.kind === "earned" ? "text-ds-success" : "text-ds-ink",
              )}
            >
              {h.kind === "earned" && "+"}
              <Money amount={h.amount} />
            </span>
          </div>
        ))}
      </Panel>
    </>
  );
}
