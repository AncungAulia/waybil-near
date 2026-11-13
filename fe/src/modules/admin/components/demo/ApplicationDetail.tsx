import { CheckCircle, Eye, FileText, Scales, Warning } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Money } from "@/components/elements/Money";
import { cn } from "@/lib/cn";
import { CONTRACT_RECORD_URL } from "@/lib/env";
import { AdminBadge, AdminTiles, Fact } from "../AdminParts";

const ACCOUNT = CONTRACT_RECORD_URL;

/** M2.3 and M2.10. A company that applied. `coast` is the one that needs a closer look. */
export function ApplicationDetail({
  coast,
  onOpenDocument,
  onDecide,
}: {
  coast: boolean;
  onOpenDocument: (name: string) => void;
  onDecide: () => void;
}) {
  return (
    <div
      className={cn(
        "admin-detail-grid grid items-start gap-24 lg:grid-cols-[minmax(0,1fr)_440px]",
        coast && "admin-closer-look",
      )}
    >
      <div className="flex min-w-0 flex-col gap-24">
        <Panel title="Company" className="admin-company-details">
          <div>
            {[
              {
                label: "Registration ID",
                value: coast ? (
                  "8120 0045 7781 2"
                ) : (
                  <span className="text-ds-success">9120 0012 3456 7 ✓</span>
                ),
              },
              { label: "Country", value: "United States" },
              {
                label: "Address",
                value: coast ? "88 Coast Road, Northgate" : "12 Harbor Way, Port Ellis",
              },
              {
                label: "Contact",
                value: (
                  <span className="inline-flex flex-wrap items-center gap-8">
                    {coast ? "Marcus Reid" : "Priya Shah"}
                    <Tag>{coast ? "Owner" : "Finance"}</Tag>
                  </span>
                ),
              },
              { label: "Phone", value: coast ? "+1 207 555 0187" : "+1 207 555 0142" },
              {
                label: "Email",
                value: coast ? "marcus@coastlinefreight.com" : "priya@meridianshipping.com",
              },
            ].map((c) => (
              <Fact key={c.label} {...c} />
            ))}
          </div>
        </Panel>
        <Panel title="Documents" className="admin-documents">
          <div className="flex flex-col gap-8">
            {["Business registration.pdf", "Tax ID.pdf", "Bank statement, 3 months.pdf"].map(
              (name, i) => (
                <div
                  key={name}
                  className="flex items-center gap-12 rounded-small bg-ds-canvas px-12 py-10"
                >
                  <span className="grid size-32 shrink-0 place-items-center rounded-small bg-ds-bg">
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] leading-17 font-medium">{name}</p>
                    <p
                      className={cn(
                        "mt-2 flex items-center gap-4 text-[12px] leading-15",
                        coast && i > 0 ? "text-ds-warning-ink" : "text-ds-success",
                      )}
                    >
                      {coast && <CheckCircle size={13} className="shrink-0 text-ds-success" />}
                      {i === 0
                        ? "Matches company name"
                        : coast
                          ? i === 1
                            ? "Name doesn’t match"
                            : "Hard to read"
                          : i === 1
                            ? "Valid"
                            : "Average outgoing payments are 14,200.00 USDC per month."}
                    </p>
                  </div>
                  <button
                    className="link focus-ring shrink-0 text-[13px] leading-16"
                    onClick={() => onOpenDocument(name)}
                  >
                    Open
                  </button>
                </div>
              ),
            )}
          </div>
        </Panel>
        <Panel title="Shipping profile">
          <AdminTiles
            items={[
              { label: "Trips per month", value: coast ? "25" : "40" },
              {
                label: "Spend per month",
                value: <Money amount={coast ? "6500000000" : "12000000000"} />,
              },
            ]}
          />
          <Fact
            label="Main routes"
            value={
              coast
                ? "Northgate → Westfield, Northgate → Riverton"
                : "Port Ellis → Millbrook, Port Ellis → Harbor City"
            }
          />
        </Panel>
      </div>
      <div className="flex min-w-0 flex-col gap-24">
        <Panel
          title="Assistant’s view"
          className="admin-assessment"
          action={
            <AdminBadge
              tone={coast ? "warning" : "success"}
              icon={coast ? <Warning size={14} /> : undefined}
            >
              {coast ? "Needs a closer look" : "Private check"}
            </AdminBadge>
          }
        >
          <div>
            <p className="text-[13px] leading-16 text-ds-muted">
              {coast ? "Starting limit" : "Suggested starting limit"}
            </p>
            {coast ? (
              <p className="mt-6 text-[28px] leading-34 font-semibold">No suggestion yet</p>
            ) : (
              <Money amount="2000000000" className="mt-6 text-[36px] leading-44 font-semibold" />
            )}
          </div>
          <div className="flex flex-col gap-16">
            {(coast
              ? [
                  "The name on the tax ID is different from the registration.",
                  "The bank statement is a blurry photo. Some numbers cannot be read.",
                  "The registration number matches the company name.",
                  "Open both papers and check them yourself.",
                ]
              : [
                  "Registration and tax ID check out.",
                  "The bank statement shows steady outgoing payments.",
                  "New to Waybil, so it starts below the 10,000.00 USDC cap.",
                  "The limit is reviewed after 3 bills are paid on time.",
                ]
            ).map((text, i) => (
              <p
                key={text}
                className={cn(
                  "flex gap-10 text-[14px] leading-17",
                  coast && "items-center text-ds-ink-2",
                )}
              >
                {coast && i === 3 ? (
                  <Eye size={18} className="shrink-0" />
                ) : coast && i !== 2 ? (
                  <Warning size={18} className="shrink-0 text-ds-warning-ink" />
                ) : (
                  <CheckCircle size={18} className="shrink-0 text-ds-success" />
                )}
                {text}
              </p>
            ))}
          </div>
          <a
            href={ACCOUNT}
            target="_blank"
            rel="noreferrer"
            className="link focus-ring w-fit text-[13px] leading-16"
          >
            See the record on NearBlocks ↗
          </a>
        </Panel>
        <Panel title="Decision" className="admin-application-decision">
          <p className="text-[14px] leading-17 text-ds-muted">
            {coast
              ? "The assistant isn’t sure about this company. Check the papers before you decide."
              : "If you approve, the team gets a request for a 2,000.00 USDC starting limit. It goes live when 2 of 3 approve."}
          </p>
          <div className="flex justify-end">
            <Button icon={<Scales size={17} />} onClick={onDecide}>
              Decide
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
