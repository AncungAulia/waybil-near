import { advanceFor, formatUsdc, splitBill } from "@waybil/shared";
import { Check, ShieldCheck } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Money } from "@/components/elements/Money";
import { DemoMap } from "@/components/elements/DemoMap";
import { StatusPill } from "@/components/elements/StatusPill";
import { BackLink } from "@/components/elements/BackLink";
import { cn } from "@/lib/cn";
import { CONTRACT_RECORD_URL } from "@/lib/env";

/* One sample delivery (I3.2), or one covered by the reserve (I3.5). */
export function DeliveryDetails({
  id,
  value,
  total,
  reserve,
  covered = false,
}: {
  id: number;
  value: string;
  total: string;
  reserve: string;
  covered?: boolean;
}) {
  const bill = id === 1043 ? 150000000n : id === 1039 ? 120000000n : 300000000n;
  const city = id === 1041 ? "Harbor City" : id === 1039 ? "Millbrook" : "Riverton";
  const driver = id === 1043 ? "Jordan Lee" : "Sam";
  const split = splitBill(bill);
  /* The investor's part follows their live share of the pool, not a fixed number. */
  const pool = BigInt(total);
  const share = pool > 0n ? Number((BigInt(value) * 100n) / pool) : 0;
  const part = pool > 0n ? (split.pool * BigInt(value)) / pool : 0n;
  /*
   * Covered by reserve (I3.5). The bill was never repaid, so the reserve pays back the advance
   * as far as it can and the pool shares whatever is left as a loss (docs/specs/contract.md).
   */
  const advance = advanceFor(bill);
  const reservePaid = advance < BigInt(reserve) ? advance : BigInt(reserve);
  const loss = advance - reservePaid;
  const lossPart = pool > 0n ? (loss * BigInt(value)) / pool : 0n;
  const money = covered
    ? [
        { label: `Paid early to ${driver}`, value: advance },
        { label: "Northwind paid back", value: 0n },
        { label: "Reserve paid the pool", value: reservePaid },
        { label: "Pool loss", value: loss },
        { label: `Your part of the loss (${share}%)`, value: lossPart },
      ]
    : [
        { label: `Paid early to ${driver}`, value: split.driver },
        { label: "Northwind pays back", value: bill },
        { label: "Pool earns", value: split.pool },
        { label: `Your part at ${share}%`, value: part },
        { label: "Safety reserve", value: split.reserve },
        { label: "Waybil fee", value: split.waybil },
      ];
  const steps = [
    {
      title: "Approved by Northwind",
      who: "Hannah Brooks on Nov 12, 08:02",
      detail: `Bill ${formatUsdc(bill)} USDC, due Dec 11`,
      warning: false,
    },
    {
      title: `Picked up by ${driver}`,
      who: "Main warehouse, Eastport on Nov 12, 09:14",
      detail: "Load checked by the driver",
      warning: false,
    },
    {
      title: "Arrival confirmed by Harbor Hub",
      who: "Lena on Nov 12, 15:36",
      detail: "120 of 120 crates",
      warning: false,
    },
    ...(covered
      ? [
          {
            title: "Covered by the reserve",
            who: "Waybil team on Dec 27, 10:20",
            detail: "2 of 3 approved. Northwind is paused until it settles.",
            warning: true,
          },
        ]
      : []),
  ];
  return (
    <>
      <BackLink href="/pool/deliveries">Deliveries</BackLink>
      <header className="flex flex-wrap items-center justify-between gap-12">
        <div>
          <h1 className="text-title">Eastport to {city}</h1>
          <p className="mt-6 text-label text-ds-muted">
            {driver} drove #{id} for Northwind.
          </p>
        </div>
        <StatusPill status={covered ? "coveredByReserve" : "paidEarly"} />
      </header>
      <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,1fr)_400px]">
        <DemoMap
          phase="arrived"
          destination={city}
          label="Delivered Nov 12"
          className="h-340 md:h-420 lg:h-500"
        />
        <div className="flex flex-col gap-16">
          <Panel title="Money" gap={4}>
            {money.map((r) => (
              <div key={r.label} className="flex flex-wrap justify-between gap-8 py-9 text-label">
                <span className="text-ds-muted">{r.label}</span>
                <Money amount={String(r.value)} />
              </div>
            ))}
          </Panel>
          <Panel title="Proof it happened" gap={4}>
            {/* Sample steps have no transaction, so the panel says where the links go. */}
            <p className="text-caption text-ds-muted">
              These are sample steps. Each link opens the demo account, not a real transaction.
            </p>
            {steps.map((step) => (
              <div key={step.title} className="flex gap-14 py-12">
                <span
                  className={cn(
                    "mt-2 grid size-26 shrink-0 place-items-center rounded-full text-ds-bg",
                    step.warning ? "bg-ds-warning" : "bg-ds-ink",
                  )}
                >
                  {step.warning ? (
                    <ShieldCheck size={14} weight="bold" />
                  ) : (
                    <Check size={14} weight="bold" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-label">{step.title}</span>
                  <span className="block text-caption text-ds-muted">{step.who}</span>
                  <span className="block text-caption text-ds-ink-2">{step.detail}</span>
                  <a
                    className="link focus-ring mt-4 inline-block text-caption"
                    href={CONTRACT_RECORD_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    See the record on NearBlocks ↗
                  </a>
                </span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}
