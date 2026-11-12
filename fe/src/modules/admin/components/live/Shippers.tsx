"use client";
import { useState } from "react";
import Link from "next/link";
import {
  formatUsdc,
  type ApplicationListItem,
  type ApplicationsResponse,
  type Shipper,
} from "@waybil/shared";
import { Scales } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { getShipper, listProposals } from "@/lib/near";
import { AdminBadge, Empty } from "../AdminParts";
import { DecideSheet } from "./DecideSheet";
import { day, DoneNote, Failed, Header, Loading, useLoad, type Done } from "./shared";

/* M2. Applications waiting for review, and the companies already shipping. */
export function Shippers() {
  const { data, error, reload } = useLoad(async () => {
    const [{ applications }, proposals] = await Promise.all([
      api<ApplicationsResponse>("/admin/applications"),
      listProposals("Approved", 50),
    ]);
    const names = [
      ...new Set([
        ...applications.filter((a) => a.state === "approved").map((a) => a.shipperId),
        ...proposals.flatMap((p) =>
          "StartShipper" in p.kind ? [p.kind.StartShipper.shipper] : [],
        ),
      ]),
    ];
    const shippers = await Promise.all(names.map(getShipper));
    return {
      waiting: applications.filter((a) => ["in_review", "needs_more"].includes(a.state)),
      active: names
        .map((n, i) => ({ account: n, shipper: shippers[i] }))
        .filter((r): r is { account: string; shipper: Shipper } => !!r.shipper),
    };
  }, "shippers");
  const [deciding, setDeciding] = useState<ApplicationListItem | null>(null);
  const [done, setDone] = useState<Done>(null);
  if (error) return <Failed error={error} reload={reload} />;
  return (
    <>
      <Header title="Shippers" note="New applications and the companies already shipping" />
      <DoneNote done={done} />
      {!data ? (
        <Loading label="Loading the shippers." />
      ) : (
        <div className="grid items-start gap-24 lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col gap-20">
            <h2 className="text-[15px] leading-18 font-medium">
              Waiting for review · {data.waiting.length}
            </h2>
            {data.waiting.length === 0 ? (
              <Panel className="admin-empty-applications">
                <Empty
                  title="No new applications"
                  text="New companies show up here when they apply."
                  icon="applications"
                />
              </Panel>
            ) : (
              data.waiting.map((a) => (
                <ApplicationCard key={a.id} application={a} onDecide={() => setDeciding(a)} />
              ))
            )}
          </div>
          <Panel title="Active shippers" className="admin-active-list">
            {data.active.length === 0 ? (
              <Empty
                title="No active shippers yet"
                text="A company shows up here after the team approves its starting limit."
                icon="company"
              />
            ) : (
              <div className="flex flex-col gap-4">
                {data.active.map(({ account, shipper }) => (
                  <Link
                    key={account}
                    href={`/admin/shippers/${account}`}
                    className="tap focus-ring flex items-center justify-between gap-12 rounded-small py-10 hover:bg-ds-canvas"
                  >
                    <p className="min-w-0 text-[15px] leading-18 font-medium break-all">
                      {account}
                    </p>
                    <div className="shrink-0 text-right">
                      <Money amount={shipper.limit} className="text-[15px] leading-18" />
                      <p
                        className={cn(
                          "mt-2 text-[13px] leading-16",
                          shipper.paused || shipper.late_bills
                            ? "text-ds-warning"
                            : "text-ds-success",
                        )}
                      >
                        {shipper.paused
                          ? "Paused"
                          : shipper.late_bills
                            ? `${shipper.late_bills} late`
                            : "On time"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
      {deciding && (
        <DecideSheet
          application={deciding}
          onClose={() => setDeciding(null)}
          onDone={(next) => {
            setDone(next);
            setDeciding(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function ApplicationCard({
  application: a,
  onDecide,
}: {
  application: ApplicationListItem;
  onDecide: () => void;
}) {
  const closer = a.review?.needsCloserLook;
  return (
    <Panel className="admin-application-card">
      <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-[17px] leading-21 font-semibold">{a.company.name}</h2>
          <p className="text-[13px] leading-16 text-ds-muted">
            Applied {day(a.createdAt)} · {a.company.city} · {a.company.trips} trips a month
          </p>
        </div>
        <AdminBadge tone={a.proposalId !== null ? "brand" : closer ? "warning" : "success"}>
          {a.proposalId !== null
            ? "Waiting for the team"
            : closer
              ? "Needs a closer look"
              : a.state === "needs_more"
                ? "Waiting for papers"
                : "Private check"}
        </AdminBadge>
      </div>
      <p className="flex gap-10 rounded-[14px] bg-ds-brand-soft p-14 text-[14px] leading-17 text-ds-brand-deep">
        {a.proposalId !== null
          ? `Proposal #${a.proposalId} is with the team.`
          : a.review?.suggestedLimit
            ? `The assistant suggests a starting limit of ${formatUsdc(BigInt(a.review.suggestedLimit))} USDC.`
            : a.review?.state === "complete"
              ? "The assistant gives no limit. Check the papers."
              : "The private check is still running."}
      </p>
      <div className="admin-card-actions flex items-center justify-between gap-10">
        <ButtonLink variant="secondary" href={`/admin/shippers/${a.shipperId}`}>
          View details
        </ButtonLink>
        {a.proposalId === null && (
          <Button icon={<Scales size={17} />} onClick={onDecide}>
            Decide
          </Button>
        )}
      </div>
    </Panel>
  );
}
