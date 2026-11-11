import { formatUsdc } from "@waybil/shared";
import { Scales, Sparkle } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { cn } from "@/lib/cn";
import { AdminBadge, Empty } from "../AdminParts";
import type { AdminState } from "../../data/fixtures";

/** M2. New companies waiting for review. */
export function Applications({
  state,
  applicationRejected,
  requestedCompany,
  requestedLimit,
  onDecide,
}: {
  state: AdminState;
  applicationRejected: string[];
  requestedCompany: string;
  requestedLimit: string;
  onDecide: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-24">
      {state === "M2.8" || applicationRejected.length === 2 ? (
        <Panel className="admin-empty-applications">
          <Empty
            title="No new applications"
            text="New companies show up here when they apply."
            icon="applications"
          />
        </Panel>
      ) : (
        ["Meridian Shipping", "Coastline Freight"]
          .filter((name) => !applicationRejected.includes(name))
          .map((name) => {
            const closer = name === "Coastline Freight";
            const approved = state === "M2.2" && name === requestedCompany;
            const url = `/admin/shippers/${closer ? "coastline-freight.testnet" : "meridian-shipping.testnet"}`;
            return (
              <Panel key={name} className="admin-application-card">
                <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-col gap-4">
                    <h2 className="text-[17px] leading-21 font-semibold">{name}</h2>
                    <p className="text-[13px] leading-16 text-ds-muted">
                      {closer
                        ? "Applied yesterday · Northgate · 25 trips a month"
                        : "Applied today · Port Ellis · 40 trips a month"}
                    </p>
                  </div>
                  <AdminBadge tone={approved ? "brand" : closer ? "warning" : "success"}>
                    {approved
                      ? "1 of 2 approvals"
                      : closer
                        ? "Needs a closer look"
                        : "Documents checked"}
                  </AdminBadge>
                </div>
                <div className="admin-application-facts hidden gap-12 md:grid md:grid-cols-3">
                  {[
                    { label: "Registration ID", value: closer ? "Doesn’t match" : "Verified" },
                    {
                      label: "Monthly spend",
                      value: <Money amount={closer ? "6500000000" : "12000000000"} />,
                    },
                    { label: "Contact", value: closer ? "Marcus, Owner" : "Priya, Finance" },
                  ].map((f) => (
                    <div key={f.label} className="rounded-[14px] bg-ds-canvas px-14 py-12">
                      <p className="text-[12px] leading-15 text-ds-muted">{f.label}</p>
                      <div
                        className={cn(
                          "mt-2 text-[15px] leading-18 font-medium",
                          !approved &&
                            f.label === "Registration ID" &&
                            (closer ? "text-ds-danger" : "text-ds-success"),
                        )}
                      >
                        {f.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-10 rounded-[14px] bg-ds-brand-soft p-14 text-[14px] leading-17 text-ds-brand-deep">
                  <Sparkle size={18} className="shrink-0" />
                  <p>
                    {approved
                      ? `You approved a ${formatUsdc(BigInt(requestedLimit))} USDC starting limit. It goes live when one more team member approves it.`
                      : closer
                        ? "The assistant isn’t sure about two papers, so it gives no limit."
                        : "The assistant suggests a starting limit of 2,000.00 USDC."}
                  </p>
                </div>
                {!approved && (
                  <div className="admin-card-actions flex items-center justify-between gap-10">
                    <ButtonLink variant="secondary" href={url}>
                      View details
                    </ButtonLink>
                    <Button icon={<Scales size={17} />} onClick={() => onDecide(name)}>
                      Decide
                    </Button>
                  </div>
                )}
              </Panel>
            );
          })
      )}
    </div>
  );
}
