import Link from "next/link";
import { ArrowLineDown, Plus, SealCheck } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Money } from "@/components/elements/Money";
import { FanMeter } from "@/components/elements/FanMeter";
import { Stat } from "@/components/elements/Stat";
import { POOL_PERCENT } from "../data/pool";

/* The sample stats, company credit and latest activity under the demo pool home. */
export function DemoPoolSections() {
  return (
    <>
      <div className="grid gap-16 md:grid-cols-3">
        <Stat
          className="w-full"
          label="Earned by the pool"
          value={<Money amount="48600000" />}
          context={`The pool earns ${POOL_PERCENT} of each bill.`}
        />
        <Stat className="w-full" label="Missed payments" value="0" context="Out of 9 trips" />
        <Stat
          className="w-full"
          label="Average trip"
          value="13 days"
          context="From payment to repayment"
        />
      </div>
      <div className="grid items-start gap-16 lg:grid-cols-2">
        <Panel title="Owed by each company">
          {[
            {
              name: "Northwind Freight Co.",
              pct: 0.8,
              used: "2,400.00",
              limit: "3,000.00",
              note: "Every bill was paid on time.",
            },
            {
              name: "Blue Ridge Logistics",
              pct: 0.3,
              used: "594.00",
              limit: "2,000.00",
              note: "Every bill was paid on time.",
            },
            {
              name: "Atlas Cargo",
              pct: 0.2,
              used: "300.00",
              limit: "1,500.00",
              note: "No bills have been paid yet.",
            },
          ].map((c) => (
            <div key={c.name} className="flex flex-col gap-8 py-8">
              <div className="flex justify-between text-label">
                <span>{c.name}</span>
                <span className="text-ds-muted">{Math.round(c.pct * 100)}%</span>
              </div>
              <FanMeter value={c.pct} label={`${c.name} credit used`} className="w-full" />
              <p className="text-caption text-ds-muted">
                {c.used} of {c.limit} USDC. {c.note}
              </p>
            </div>
          ))}
        </Panel>
        <Panel
          title="Latest"
          gap={4}
          className="p-20 pb-10"
          action={
            <Link className="link focus-ring text-label" href="/pool/history">
              See all
            </Link>
          }
        >
          {[
            {
              icon: <ArrowLineDown size={16} />,
              title: "Paid Sam early",
              amount: "292500000",
              note: "for #1041 from Eastport to Harbor City",
              when: "Today",
            },
            {
              icon: <SealCheck size={16} />,
              title: "Northwind paid a bill",
              amount: "300000000",
              note: "on #1032, 1 day early",
              when: "Yesterday",
            },
            {
              icon: <Plus size={16} />,
              title: "You deposited",
              amount: "5500000000",
              note: "",
              when: "Oct 21",
            },
          ].map((h) => (
            <Link
              key={h.title}
              href="/pool/history"
              className="tap focus-ring flex items-center gap-12 py-12 hover:bg-ds-canvas"
            >
              <span className="grid size-36 shrink-0 place-items-center rounded-full bg-ds-canvas">
                {h.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-label">{h.title}</span>
                <span className="block text-caption text-ds-muted">
                  <Money amount={h.amount} />
                  {h.note && ` ${h.note}`}
                </span>
              </span>
              <span className="shrink-0 text-caption text-ds-muted">{h.when}</span>
            </Link>
          ))}
        </Panel>
      </div>
    </>
  );
}
