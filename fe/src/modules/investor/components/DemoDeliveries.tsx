import Link from "next/link";
import { Package } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Money } from "@/components/elements/Money";
import { StatusPill } from "@/components/elements/StatusPill";
import { cn } from "@/lib/cn";

/* The sample deliveries this demo shows. The empty state counts none of them. */
const DELIVERIES = [
  {
    id: 1041,
    city: "Harbor City",
    driver: "Sam",
    amount: "292500000",
    due: "Dec 11",
    repaid: false,
  },
  {
    id: 1043,
    city: "Riverton",
    driver: "Jordan Lee",
    amount: "146250000",
    due: "Dec 13",
    repaid: false,
  },
  { id: 1039, city: "Millbrook", driver: "Sam", amount: "117000000", due: "Nov 14", repaid: false },
  { id: 1032, city: "Riverton", driver: "Sam", amount: "292500000", due: "Nov 9", repaid: true },
];

/* The sample deliveries list (I3.1) and its empty state (I3.4). */
export function DemoDeliveries({
  empty,
  filter,
  onFilter,
}: {
  empty: boolean;
  filter: string;
  onFilter: (filter: string) => void;
}) {
  return (
    <>
      <header>
        <h1 className="text-title">Deliveries</h1>
        <p className="mt-6 text-label text-ds-muted">
          Every trip the pool paid for, with proof it arrived.
        </p>
      </header>
      {/* With no deliveries there is nothing to filter, so the empty card stands alone. */}
      {!empty && (
        <div className="flex w-fit flex-wrap gap-6 rounded-full bg-ds-bg p-4">
          {[
            { label: "All", count: 9 },
            { label: "Waiting to be repaid", count: 3 },
            { label: "Repaid", count: 6 },
          ].map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => onFilter(f.label)}
              className={cn(
                "tap focus-ring flex items-center gap-6 rounded-full px-14 py-8 text-label",
                filter === f.label ? "bg-ds-ink text-ds-bg" : "text-ds-ink-2 hover:bg-ds-canvas",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "text-caption",
                  filter === f.label ? "text-ds-on-night" : "text-ds-muted",
                )}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      )}
      <Panel
        gap={4}
        className={cn(
          "px-20 py-8",
          empty && "min-h-[calc(100dvh-330px)] md:min-h-[calc(100dvh-290px)]",
        )}
      >
        {empty ? (
          <div className="grid min-h-360 flex-1 place-content-center gap-16 text-center">
            <img src="/illustrations/investor.svg" alt="" className="mx-auto h-96" />
            <h2 className="text-heading">No deliveries yet</h2>
            <p className="max-w-340 text-label text-ds-muted">
              When the pool pays a driver early, the delivery shows up here with its proof.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden gap-16 py-12 text-caption text-ds-muted md:grid md:grid-cols-[1fr_140px_130px_170px]">
              <span>Delivery</span>
              <span>Paid early</span>
              <span>Status</span>
              <span>Bill</span>
            </div>
            {DELIVERIES.filter((r) => filter === "All" || (filter === "Repaid") === r.repaid).map(
              (r) => (
                <Link
                  href={`/pool/deliveries/${r.id}`}
                  key={r.id}
                  className="tap focus-ring grid items-center gap-10 py-14 hover:bg-ds-canvas md:grid-cols-[1fr_140px_130px_170px] md:gap-16"
                >
                  <span className="flex items-center gap-12">
                    <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-canvas">
                      <Package size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-body">Eastport to {r.city}</span>
                      <span className="block text-caption text-ds-muted">
                        #{r.id} · Northwind · {r.driver}
                      </span>
                    </span>
                  </span>
                  <Money amount={r.amount} className="text-label" />
                  <span className="justify-self-start">
                    <StatusPill status={r.repaid ? "repaid" : "paidEarly"} />
                  </span>
                  <p className="text-label text-ds-ink-2">
                    {r.repaid ? "Paid back" : "Bill due"} {r.due}
                  </p>
                </Link>
              ),
            )}
          </>
        )}
      </Panel>
    </>
  );
}
