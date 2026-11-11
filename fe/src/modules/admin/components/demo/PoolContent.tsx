import Link from "next/link";
import type { Pool } from "@waybil/shared";
import { Bank, Hourglass, Shield, TrendUp, Truck, Warning } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Money } from "@/components/elements/Money";
import { cn } from "@/lib/cn";
import { CONTRACT_RECORD_URL } from "@/lib/env";
import { Empty } from "../AdminParts";
import type { AdminState } from "../../data/fixtures";

const ACCOUNT = CONTRACT_RECORD_URL;

/** M3.3 and M3.4. The warning above the pool numbers. */
export function PoolAlerts({ state }: { state: AdminState }) {
  const small = state === "M3.4";
  return (
    <>
      {state === "M3.3" && (
        <div className="admin-pool-alert flex items-start gap-12 rounded-[20px] bg-ds-danger-stamp p-16 text-ds-report-ink">
          <Warning size={20} className="shrink-0" />
          <div>
            <h2 className="text-[15px] leading-18 font-semibold">
              Blue Ridge Logistics is 3 days late on bill #1037
            </h2>
            <p className="mt-4 text-[13px] leading-16">
              They owe 292.50 USDC. If the bill remains unpaid for 14 days after its due date, the
              team can use the reserve.
            </p>
            <Link
              href="/admin/shippers/blue-ridge.testnet"
              className="link focus-ring mt-4 inline-block text-[13px] leading-16 font-semibold"
            >
              See Blue Ridge Logistics
            </Link>
          </div>
        </div>
      )}
      {small && (
        <div className="admin-pool-alert flex items-start gap-12 rounded-[20px] bg-ds-warning-soft p-16 text-ds-warning-ink">
          <Hourglass size={20} className="shrink-0" />
          <div>
            <h2 className="text-[15px] leading-18 font-semibold">
              Almost all the money is lent out
            </h2>
            <p className="mt-4 text-[13px] leading-16">
              Only 400 USDC is free. New advances wait until repayments come in.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/** M3. The pool numbers, investors, activity and limits. */
export function PoolContent({ state, pool }: { state: AdminState; pool: Pool }) {
  const empty = state === "M3.2",
    small = state === "M3.4";
  return (
    <>
      <div className="admin-pool-stats grid grid-cols-2 gap-10 md:grid-cols-4 md:gap-16">
        {[
          {
            label: "In the pool",
            value: String(BigInt(pool.cash) + BigInt(pool.lent)),
            context: empty ? "No investors yet" : small ? "3 investors" : "5 investors",
            icon: Bank,
          },
          {
            label: "Lent out now",
            value: pool.lent,
            context: empty ? "Nothing lent yet" : small ? "94% of the pool" : "13% of the pool",
            icon: Truck,
          },
          {
            label: "Overdue",
            value: state === "M3.3" ? "292500000" : "0",
            context: state === "M3.3" ? "1 bill · 3 days late" : "Nothing late",
            icon: Hourglass,
          },
          {
            label: "Reserve",
            value: pool.reserve,
            context: empty ? "Builds up from fees" : "5% of the pool, covers losses",
            icon: Shield,
          },
        ].map((item, i) => (
          <section
            key={item.label}
            className={cn(
              "admin-pool-stat relative flex min-w-0 flex-col gap-10 overflow-hidden rounded-[20px] p-16 md:p-20",
              i === 0 ? "ready-card bg-ds-brand" : "bg-ds-bg",
            )}
          >
            <p className="relative flex items-center gap-8 text-[13px] leading-16 text-ds-muted">
              <item.icon size={14} className="shrink-0" />
              {item.label}
            </p>
            <Money
              amount={item.value}
              className={cn(
                "relative text-[24px] leading-29 font-semibold md:text-[30px] md:leading-37 [&>span]:font-semibold",
                i === 2 && (state === "M3.3" ? "text-ds-danger" : "text-ds-success"),
              )}
            />
            <p
              className={cn(
                "relative text-[12px] leading-15",
                state === "M3.3" && i === 2
                  ? "text-ds-danger"
                  : small && i === 1
                    ? "text-ds-warning-ink"
                    : "text-ds-muted",
              )}
            >
              {item.context}
            </p>
          </section>
        ))}
      </div>
      <div className="admin-detail-grid grid items-start gap-24 lg:grid-cols-[minmax(0,1fr)_440px]">
        <Panel
          title="Investors"
          className="admin-investors"
          action={
            !empty && (
              <span className="flex shrink-0 items-center gap-6 rounded-full bg-ds-brand-soft px-10 py-5 text-[12px] leading-15 font-semibold text-ds-brand-deep">
                <TrendUp size={14} />
                APY 8.4% · last 30 days
              </span>
            )
          }
        >
          {empty ? (
            <Empty
              title="No investors yet"
              text="Investors show up here after their first deposit."
              icon="investors"
            />
          ) : (
            <div className="flex flex-col gap-4">
              {[
                {
                  name: "maya-harper.testnet",
                  date: "Nov 10",
                  amount: small ? "2000000000" : "5009720000",
                  pct: small ? "31%" : "20%",
                },
                {
                  name: "orbit-ventures.testnet",
                  date: "Oct 24",
                  amount: small ? "2400000000" : "8000000000",
                  pct: small ? "38%" : "32%",
                },
                {
                  name: "harbor-coop.testnet",
                  date: "Oct 30",
                  amount: small ? "2000000000" : "6500000000",
                  pct: small ? "31%" : "26%",
                },
                ...(!small
                  ? [
                      {
                        name: "leo-moreau.testnet",
                        date: "Nov 3",
                        amount: "3000000000",
                        pct: "12%",
                      },
                      {
                        name: "ana-silva.testnet",
                        date: "Nov 5",
                        amount: "2490280000",
                        pct: "10%",
                      },
                    ]
                  : []),
              ].map((item) => (
                <div
                  key={item.name}
                  className="admin-investor-row flex items-center justify-between gap-12 py-10"
                >
                  <div className="min-w-0">
                    <p className="break-words text-[15px] leading-18 font-medium">{item.name}</p>
                    <p className="mt-2 text-[13px] leading-16 text-ds-muted">Since {item.date}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Money amount={item.amount} className="text-[15px] leading-18" />
                    <p className="mt-2 text-[13px] leading-16 text-ds-muted">{item.pct}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <div className="flex min-w-0 flex-col gap-24">
          <Panel title="Recent activity" className="admin-pool-activity">
            {empty ? (
              <Empty
                title="Nothing has happened yet"
                text="Deposits, advances and repayments will show up here."
                icon="activity"
              />
            ) : (
              <div className="flex flex-col gap-4">
                {[
                  { title: "Advance · #1041", name: "Sam", amount: "-292500000" },
                  { title: "Repaid · #1039", name: "Northwind", amount: "120000000" },
                  { title: "Deposit", name: "maya-harper.testnet", amount: "1000000000" },
                ].map((item) => (
                  <div key={item.title} className="flex items-center justify-between gap-12 py-10">
                    <div className="min-w-0">
                      <p className="text-[15px] leading-18 font-medium">{item.title}</p>
                      <p className="mt-2 text-[13px] leading-16 text-ds-brand-deep">
                        <span>{item.name} · </span>
                        <a
                          href={ACCOUNT}
                          target="_blank"
                          rel="noreferrer"
                          className="link focus-ring"
                        >
                          See the record on NearBlocks ↗
                        </a>
                      </p>
                    </div>
                    <span className="flex shrink-0 text-[15px] leading-18 font-medium">
                      {BigInt(item.amount) > 0n ? "+" : ""}
                      <Money amount={item.amount} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="Pool limits" className="admin-pool-limits">
            <div className="flex flex-col gap-4">
              {[
                { label: "Max advance rate", value: "97.5%" },
                { label: "Max share for one shipper", value: "25% of the pool" },
                { label: "Withdrawals when busy", value: "Paid as repayments arrive" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-12 py-10">
                  <div>
                    <p className="text-[15px] leading-18 font-medium">{item.label}</p>
                    <p className="mt-2 text-[13px] leading-16 text-ds-muted">Set by the team</p>
                  </div>
                  <p className="text-right text-[15px] leading-18 font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
