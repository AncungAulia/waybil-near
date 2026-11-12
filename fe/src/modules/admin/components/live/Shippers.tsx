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
import { FanMeter } from "@/components/elements/FanMeter";
import { Tag } from "@/components/ui/Tag";
import { accountLabel } from "@/lib/accountLabel";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { getShipper, listProposals } from "@/lib/near";
import { AdminBadge, Empty } from "../AdminParts";
import { DecideSheet } from "./DecideSheet";
import { day, Failed, Header, Loading, useLoad } from "./shared";

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
        .map((n, i) => ({
          account: n,
          shipper: shippers[i],
          /* The name from its application, otherwise the account without ".testnet". */
          name: applications.find((a) => a.shipperId === n)?.company.name ?? accountLabel(n),
        }))
        .filter((r): r is { account: string; shipper: Shipper; name: string } => !!r.shipper),
    };
  }, "shippers");
  const [deciding, setDeciding] = useState<ApplicationListItem | null>(null);
  if (error) return <Failed error={error} reload={reload} />;
  return (
    <>
      <Header
        title="Shippers"
        note="New applications and the companies already shipping"
        aside={
          data && <p className="text-label font-medium">{data.waiting.length} waiting for review</p>
        }
      />
      {!data ? (
        <Loading label="Loading the shippers." />
      ) : (
        /* Both columns fill the window and end level. */
        <div className="grid gap-24 lg:min-h-[calc(100dvh-260px)] lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col gap-20">
            {data.waiting.length === 0 ? (
              <Panel className="admin-empty-applications flex-1 justify-center">
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
          <Panel
            title="Active shippers"
            className="admin-active-list h-full"
            action={<Tag>{data.active.length} companies</Tag>}
          >
            {data.active.length === 0 ? (
              <Empty
                title="No active shippers yet"
                text="A company shows up here after the team approves its starting limit."
                icon="company"
              />
            ) : (
              <div className="-mx-12 flex flex-col gap-4">
                {data.active.map(({ account, shipper, name }) => {
                  const limit = BigInt(shipper.limit);
                  const used = BigInt(shipper.owed) + BigInt(shipper.committed);
                  const share = limit > 0n ? Number((used * 1000n) / limit) / 1000 : 0;
                  const trouble = !!shipper.paused || shipper.late_bills > 0;
                  return (
                    <Link
                      key={account}
                      href={`/admin/shippers/${account}`}
                      title={account}
                      className="tap focus-ring flex flex-col rounded-row px-12 py-12 hover:bg-ds-canvas"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center justify-between gap-8">
                          <p className="min-w-0 truncate text-[15px] leading-18 font-medium">
                            {name}
                          </p>
                          <AdminBadge tone={trouble ? "warning" : "success"}>
                            {shipper.paused
                              ? "Paused"
                              : shipper.late_bills
                                ? `${shipper.late_bills} late`
                                : "On time"}
                          </AdminBadge>
                        </div>
                        {/* How much of its limit is in use, on the same meter as the pool. */}
                        <FanMeter
                          value={share}
                          label={`${name} credit used`}
                          className="mt-10 w-full"
                        />
                        <p className="mt-6 text-caption text-ds-muted">
                          {formatUsdc(used)} of {formatUsdc(limit)} USDC in use.
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}
      {deciding && (
        <DecideSheet
          application={deciding}
          onClose={() => setDeciding(null)}
          onDone={() => setDeciding(null)}
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
            Applied {day(a.createdAt)} from {a.company.city}. {a.company.trips} trips a month.
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
      {/* On a phone the actions share the full width, half each when there are two. */}
      <div
        className={cn(
          "admin-card-actions grid gap-10 md:flex md:items-center md:justify-between",
          a.proposalId === null && "grid-cols-2",
        )}
      >
        <ButtonLink
          variant="secondary"
          href={`/admin/shippers/${a.shipperId}`}
          className="w-full min-w-0 md:w-auto"
        >
          <span className="md:hidden">Details</span>
          <span className="hidden md:inline">View details</span>
        </ButtonLink>
        {a.proposalId === null && (
          <Button
            icon={<Scales size={17} />}
            className="w-full min-w-0 md:w-auto"
            onClick={onDecide}
          >
            Decide
          </Button>
        )}
      </div>
    </Panel>
  );
}
