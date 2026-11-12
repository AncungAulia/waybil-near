import Link from "next/link";
import {
  Envelope,
  Flag,
  Hourglass,
  PencilSimple,
  Phone,
  ShieldCheck,
  TrendUp,
  User,
} from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Money } from "@/components/elements/Money";
import { FanMeter } from "@/components/elements/FanMeter";
import { cn } from "@/lib/cn";
import { AdminBadge, AdminTiles, Fact } from "../AdminParts";
import type { ActiveCompany } from "../../data/fixtures";

/** M2.7. A company already shipping. Only Northwind has the full drawn detail. */
export function ActiveShipper({
  account,
  activeCompany,
  paused,
  onPause,
  onChangeLimit,
}: {
  account: string;
  activeCompany: ActiveCompany;
  paused: boolean;
  onPause: () => void;
  onChangeLimit: () => void;
}) {
  return account !== "northwind-freight.testnet" ? (
    <Panel title="Credit">
      <Money amount={activeCompany.owed} className="text-amount" />
      <p className="text-label text-ds-muted">
        The limit is <Money amount={activeCompany.limit} />.
      </p>
      <FanMeter
        value={Number(activeCompany.owed) / Number(activeCompany.limit)}
        label="Credit used"
        className="w-full"
      />
      <Fact label="Available now" value={<Money amount={activeCompany.left} />} />
      <Fact label="Company" value={activeCompany.name} />
      <p className="text-caption text-ds-muted">
        This company has a summary fixture. The complete review example is Northwind.
      </p>
    </Panel>
  ) : (
    <div className="admin-detail-grid grid items-start gap-24 lg:grid-cols-[minmax(0,1fr)_440px]">
      <div className="flex min-w-0 flex-col gap-24">
        <Panel
          title="Credit"
          className="admin-credit"
          action={
            <AdminBadge tone={paused ? "warning" : "success"}>
              {paused ? "Paused" : "Good standing"}
            </AdminBadge>
          }
        >
          <div className="flex flex-wrap items-baseline gap-8">
            <Money amount={activeCompany.owed} className="text-[36px] leading-44 font-semibold" />
            <span className="text-[15px] leading-18 text-ds-muted">
              of <Money amount={activeCompany.limit} /> in use
            </span>
          </div>
          <FanMeter
            value={Number(activeCompany.owed) / Number(activeCompany.limit)}
            label="Credit used"
            className="w-full"
          />
          <AdminTiles
            items={[
              { label: "Available now", value: <Money amount={activeCompany.left} /> },
              { label: "Fee per bill", value: "2.5%" },
              { label: "Pays within", value: "30 days" },
            ]}
          />
        </Panel>
        <Panel title="Payment record">
          <AdminTiles
            items={[
              { label: "Bills paid", value: "12" },
              { label: "Paid on time", value: <span className="text-ds-success">100%</span> },
              { label: "Paid early, on average", value: "3 days" },
            ]}
          />
        </Panel>
        <Panel
          title="Open bills"
          className="admin-open-bills"
          action={
            <span className="hidden text-[13px] text-ds-muted md:inline">
              8 bills for 2,400.00 USDC. The newest 4 are shown.
            </span>
          }
        >
          <div className="flex flex-col gap-8">
            {[
              {
                id: 1041,
                city: "Harbor City",
                amount: "300000000",
                due: "Dec 11",
                status: "Delivered",
              },
              {
                id: 1043,
                city: "Riverton",
                amount: "150000000",
                due: "Dec 14",
                status: "On the road",
              },
              {
                id: 1044,
                city: "Westfield",
                amount: "210000000",
                due: "Dec 16",
                status: "On the road",
              },
              {
                id: 1045,
                city: "Oakdale",
                amount: "292500000",
                due: "Dec 18",
                status: "Waiting for pickup",
              },
            ].map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-12 rounded-small bg-ds-canvas px-14 py-12"
              >
                <div className="min-w-0">
                  <p className="text-[14px] leading-17 font-medium">Eastport to {r.city}</p>
                  <p className="mt-2 text-[12px] leading-15 text-ds-muted">
                    #{r.id} is due {r.due}.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-4 text-right">
                  <Money amount={r.amount} className="text-[14px] leading-17" />
                  <span
                    className={cn(
                      "admin-bill-status rounded-full px-8 py-2 text-[11px] leading-14 font-semibold",
                      r.status === "Delivered"
                        ? "bg-ds-check-soft text-ds-check-ink"
                        : r.status === "On the road"
                          ? "bg-ds-vote-soft text-ds-vote-ink"
                          : "bg-ds-canvas text-ds-ink-2",
                    )}
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="flex min-w-0 flex-col gap-24">
        <Panel title="Limit history" className="admin-limit-history">
          <div className="flex flex-col gap-14">
            {[
              {
                title: "The assistant suggests 5,000.00 USDC",
                meta: "Today. It is waiting for the team.",
              },
              {
                title: "Raised to 3,000.00 USDC",
                meta: "The credit assistant raised it on Nov 9.",
              },
              { title: "Started at 2,500.00 USDC", meta: "The team approved it on Oct 21." },
            ].map((r, i) => (
              <div key={r.title} className="flex gap-12">
                <span className="grid size-32 shrink-0 place-items-center rounded-full bg-ds-canvas">
                  {i === 0 ? (
                    <Hourglass size={16} className="text-ds-brand-deep" />
                  ) : i === 1 ? (
                    <TrendUp size={16} />
                  ) : (
                    <Flag size={16} />
                  )}
                </span>
                <div>
                  <p className="text-[14px] leading-17 font-semibold">{r.title}</p>
                  <p className="mt-2 text-[12px] leading-15 text-ds-muted">{r.meta}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/admin"
            className="link focus-ring w-fit text-[13px] leading-16 font-semibold"
          >
            See it in Approvals
          </Link>
        </Panel>
        <Panel title="Contact">
          <div className="flex flex-col gap-10">
            {[
              { icon: User, text: "Hannah Brooks", tag: "Finance" },
              { icon: Phone, text: "+1 207 555 0142" },
              { icon: Envelope, text: "hannah@northwindfreight.com" },
              { icon: ShieldCheck, text: "Documents checked on Oct 21" },
            ].map((r) => (
              <p key={r.text} className="flex gap-10 text-[14px] leading-17 text-ds-ink-2">
                <r.icon size={16} className="shrink-0 text-ds-muted" />
                <span className="min-w-0 break-words">{r.text}</span>
                {"tag" in r && <Tag>{r.tag}</Tag>}
              </p>
            ))}
          </div>
        </Panel>
        <Panel title="Manage">
          <p className="text-[14px] leading-17 text-ds-muted">
            A limit change needs 2 of 3 team members. A pause starts right away.
          </p>
          <div className="admin-manage-actions flex flex-col gap-10 md:flex-row">
            <Button
              variant="quiet"
              className="min-w-0 flex-1 justify-center"
              disabled={paused}
              onClick={onPause}
            >
              Pause new shipments
            </Button>
            <Button
              className="min-w-0 flex-1"
              icon={<PencilSimple size={17} />}
              onClick={onChangeLimit}
            >
              Change limit
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
