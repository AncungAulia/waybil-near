"use client";
import { formatUsdc, type Pool, type QueueEntry } from "@waybil/shared";
import { Panel } from "@/components/layout/Panel";
import { Money } from "@/components/elements/Money";
import { getPool, getWithdrawQueue, readAll } from "@/lib/near";
import { AdminTiles, Fact } from "../AdminParts";
import { day, Failed, Header, Loading, useLoad } from "./shared";

/* M3. Where the investors' money is right now. */
export function PoolView() {
  const { data, error, reload } = useLoad(
    () =>
      Promise.all([getPool(), readAll((from, limit) => getWithdrawQueue({ from, limit }))]).then(
        ([pool, queue]): { pool: Pool; queue: QueueEntry[] } => ({ pool, queue }),
      ),
    "pool",
  );
  if (error) return <Failed error={error} reload={reload} />;
  const p = data?.pool;
  const value = p ? BigInt(p.cash) + BigInt(p.lent) - BigInt(p.queued) - BigInt(p.fees) : 0n;
  const free = p ? BigInt(p.cash) - BigInt(p.committed) - BigInt(p.queued) - BigInt(p.fees) : 0n;
  return (
    <>
      <Header title="Pool" note="Where the investors’ money is right now" />
      {!p || !data ? (
        <Loading label="Loading the pool." />
      ) : (
        <>
          {value > 0n && free * 10n < value && (
            <div className="admin-pool-alert flex items-start gap-12 rounded-[20px] bg-ds-warning-soft p-16 text-ds-warning-ink">
              <p className="text-[13px] leading-16">
                Only {formatUsdc(free)} USDC is free. New advances wait until repayments come in.
              </p>
            </div>
          )}
          <Panel title="The pool">
            <AdminTiles
              items={[
                { label: "Pool value", value: <Money amount={String(value)} /> },
                { label: "Free now", value: <Money amount={String(free)} /> },
                { label: "Paid out early", value: <Money amount={p.lent} /> },
              ]}
            />
            <AdminTiles
              items={[
                { label: "Promised to approved trips", value: <Money amount={p.committed} /> },
                { label: "Safety reserve", value: <Money amount={p.reserve} /> },
                { label: "Waybil fees to claim", value: <Money amount={p.fees} /> },
              ]}
            />
          </Panel>
          <Panel title="Withdrawals waiting">
            {data.queue.length === 0 ? (
              <p className="text-label text-ds-muted">No investor is waiting for a withdrawal.</p>
            ) : (
              data.queue.map((q, i) => (
                <Fact
                  key={`${q.investor}-${q.requested_at}`}
                  label={`${i + 1}. ${q.investor} · ${day(q.requested_at)}`}
                  value={<Money amount={q.amount} />}
                />
              ))
            )}
          </Panel>
        </>
      )}
    </>
  );
}
