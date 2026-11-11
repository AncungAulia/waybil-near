import { ArrowLineDown } from "@phosphor-icons/react";
import { Money } from "@/components/elements/Money";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { MAIN_TRIP_ID, MAIN_TRIP_PAYOUT, PAYOUTS } from "../data/fixtures";

const MAIN_ID = String(MAIN_TRIP_ID);

export function PayoutRows({
  recent = false,
  latest = MAIN_TRIP_PAYOUT,
  /* #1041 is only listed once Harbor Hub has confirmed it and Sam was paid. */
  paid1041 = true,
}: {
  recent?: boolean;
  latest?: string;
  paid1041?: boolean;
}) {
  const rows = PAYOUTS.filter(([id]) => paid1041 || id !== MAIN_ID);
  return (
    <div className="flex flex-col gap-20">
      {(recent ? PAYOUTS.slice(1, 3) : rows).map(([id, city, date, amount, company]) => (
        <div key={id} className="flex flex-wrap items-center gap-12">
          <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-success-soft text-ds-success">
            <ArrowLineDown size={18} />
          </span>
          <div className="min-w-120 flex-1">
            <p className="text-label">Eastport to {city}</p>
            <p className="text-caption text-ds-muted">
              #{id} · {company} · {date}
            </p>
          </div>
          <span className="text-label text-ds-success">
            +<Money amount={id === MAIN_ID ? latest : amount} />
          </span>
        </div>
      ))}
      {/* Sample payouts have no transactions, so one demo receipt stands in for them. */}
      {!recent && <DemoRecord title="Demo payout records" className="bg-ds-canvas" />}
    </div>
  );
}
