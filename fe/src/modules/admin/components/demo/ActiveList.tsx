import Link from "next/link";
import { Panel } from "@/components/layout/Panel";
import { Money } from "@/components/elements/Money";
import { cn } from "@/lib/cn";
import { Empty } from "../AdminParts";
import type { AdminState } from "../../data/fixtures";

/** M2. The companies already shipping. */
export function ActiveList({ state }: { state: AdminState }) {
  return (
    <Panel title="Active shippers" className="admin-active-list">
      {state === "M2.9" ? (
        <Empty
          title="No active shippers yet"
          text="A company shows up here after the team approves its starting limit."
          icon="company"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {[
            {
              name: "Northwind Freight Co.",
              account: "northwind-freight.testnet",
              limit: "3000000000",
              note: "Active since Oct 21 with 12 bills.",
              record: "100% on time",
            },
            {
              name: "Blue Ridge Logistics",
              account: "blue-ridge.testnet",
              limit: "1500000000",
              note: "Active since Oct 23 with 7 bills.",
              record: "86% on time",
            },
            {
              name: "Atlas Cargo",
              account: "atlas-cargo.testnet",
              limit: "1500000000",
              note: "Active since Nov 10 with no bills yet.",
              record: "New",
            },
          ].map((c, i) => (
            <Link
              key={c.account}
              href={`/admin/shippers/${c.account}`}
              className="tap focus-ring flex items-center justify-between gap-12 rounded-small py-10 hover:bg-ds-canvas"
            >
              <div className="min-w-0">
                <p className="text-[15px] leading-18 font-medium">{c.name}</p>
                <p className="mt-2 text-[13px] leading-16 text-ds-muted">{c.note}</p>
              </div>
              <div className="shrink-0 text-right">
                <Money amount={c.limit} className="text-[15px] leading-18" />
                <p
                  className={cn(
                    "mt-2 text-[13px] leading-16",
                    i === 0 ? "text-ds-success" : i === 1 ? "text-ds-warning" : "text-ds-muted",
                  )}
                >
                  {c.record}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}
