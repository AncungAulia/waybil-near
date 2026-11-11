"use client";
import { useState } from "react";
import Link from "next/link";
import { parseUsdc, formatUsdc } from "@waybil/shared";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  ArrowRight,
  Bank,
  Truck,
  Check,
  Pause,
  PaperPlaneTilt,
  PencilSimple,
  PencilSimpleLine,
  Scales,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Hourglass,
  CircleNotch,
  ChatText,
  Tray,
  WarningCircle,
  Warning,
  Eye,
  FileText,
  Envelope,
  Phone,
  TrendUp,
  Flag,
  Shield,
  Buildings,
  Users,
  Pulse,
  Sparkle,
  User,
  X,
} from "@phosphor-icons/react";
import { AdminActionFields } from "./AdminActionFields";
import { Money } from "@/components/elements/Money";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { FanMeter } from "@/components/elements/FanMeter";
import { cn } from "@/lib/cn";
import { BackLink } from "@/components/elements/BackLink";
import { Segmented } from "@/components/ui/Segmented";
import { CONTRACT_RECORD_URL } from "@/lib/env";
import { ADMIN_FIXTURES, type AdminState } from "../data/fixtures";
import "./admin.css";
const PEOPLE = [
  { name: "Risk lead", account: "risk.waybil.testnet" },
  { name: "Operations", account: "ops.waybil.testnet" },
  { name: "Finance", account: "finance.waybil.testnet" },
];
const ACCOUNT = CONTRACT_RECORD_URL;
type Modal = "vote" | "decision" | "limit" | "pause" | "wallet" | "document" | null;
export function AdminScreen({
  initialState = "M1.1",
  account = "northwind-freight.testnet",
}: {
  initialState?: AdminState;
  account?: string;
  preview?: boolean;
}) {
  const [state, setState] = useState(initialState),
    [modal, setModal] = useState<Modal>(null),
    [tab, setTab] = useState(
      initialState === "M2.6" || initialState === "M2.9" ? "Active" : "Waiting",
    ),
    [rejection, setRejection] = useState(initialState === "M2.5"),
    [reason, setReason] = useState(
      initialState === "M1.4"
        ? "Too big a jump"
        : initialState === "M2.5"
          ? "Documents do not match"
          : initialState === "M2.12"
            ? "Late bill"
            : "",
    ),
    [note, setNote] = useState(
      initialState === "M1.4"
        ? "Doubling in a month is fast. Let's wait for two more bills before going above 4,000."
        : initialState === "M2.11"
          ? "Twelve bills paid on time. A smaller step than the assistant suggested."
          : initialState === "M2.5"
            ? "The name on the tax ID is different from the business registration. Please upload the right file and apply again."
            : "",
    ),
    [limit, setLimit] = useState(initialState === "M2.11" ? "4000" : "2000"),
    [requestedLimit, setRequestedLimit] = useState("2000000000"),
    [requestedCompany, setRequestedCompany] = useState("Meridian Shipping"),
    [receipt, setReceipt] = useState(""),
    [paused, setPaused] = useState(false),
    [selected, setSelected] = useState(
      initialState.startsWith("M1") ? "Northwind Freight" : "Meridian Shipping",
    ),
    [meridianVote, setMeridianVote] = useState<"approved" | "rejected" | null>(null),
    [applicationRejected, setApplicationRejected] = useState<string[]>([]),
    [document, setDocument] = useState("");
  const activeCompany =
    account === "blue-ridge.testnet"
      ? { name: "Blue Ridge Logistics", limit: "1500000000", owed: "594000000", left: "906000000" }
      : account === "atlas-cargo.testnet"
        ? { name: "Atlas Cargo", limit: "1500000000", owed: "300000000", left: "1200000000" }
        : {
            name: "Northwind Freight Co.",
            limit: "3000000000",
            owed: "2400000000",
            left: "600000000",
          };
  const fixture = ADMIN_FIXTURES[state];
  const group = state.split(".")[0],
    activeDetail = ["M2.7", "M2.11", "M2.12"].includes(state),
    applicationDetail = state === "M2.3" || state === "M2.10",
    coast = state === "M2.10" || selected === "Coastline Freight";
  const showing =
    modal ??
    (state === "M1.4"
      ? "vote"
      : ["M2.4", "M2.5"].includes(state)
        ? "decision"
        : state === "M2.11"
          ? "limit"
          : state === "M2.12"
            ? "pause"
            : null);
  const close = () => {
    setModal(null);
    if (state === "M1.4") setState("M1.1");
    if (["M2.4", "M2.5"].includes(state)) setState("M2.1");
    if (["M2.11", "M2.12"].includes(state)) setState("M2.7");
  };
  const title =
    group === "M1"
      ? "Approvals"
      : group === "M3"
        ? "Pool"
        : activeDetail
          ? activeCompany.name
          : applicationDetail
            ? coast
              ? "Coastline Freight"
              : "Meridian Shipping"
            : "Shippers";
  function decide(name: string) {
    setSelected(name);
    setRejection(false);
    setReason("");
    setNote("");
    setLimit(name === "Meridian Shipping" ? "2000" : "");
    setModal("decision");
  }
  let limitUnits = 0n;
  try {
    limitUnits = parseUsdc(limit);
  } catch {
    /* Invalid limits keep approval disabled. */
  }
  const invalidLimit = limitUnits <= 0n || limitUnits > 10000000000n;
  const waitingCount = state === "M2.8" ? 0 : 2 - applicationRejected.length;
  const sectionTitle = (text: string) => (
    <h2 className="text-[15px] leading-18 font-medium">{text}</h2>
  );
  const team = (
    <Panel className="approval-team">
      <div className="flex flex-col gap-4">
        <h2 className="text-[17px] leading-21 font-semibold">Team approval</h2>
        <p className="text-label text-ds-muted">
          A change goes through when 2 of the 3 team members approve it.
        </p>
      </div>
      <div>
        {PEOPLE.map((p, i) => (
          <div key={p.account} className="approval-member flex items-center gap-10 py-12">
            <span
              className={cn(
                "grid size-36 shrink-0 place-content-center rounded-full border-2 bg-ds-canvas text-ds-ink-2",
                i === 0
                  ? state === "M1.2"
                    ? "border-ds-success"
                    : "border-ds-brand"
                  : i === 1 && state !== "M1.3"
                    ? "border-ds-success"
                    : "border-ds-line",
              )}
              aria-hidden
            >
              <User size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label font-medium">{p.name}</p>
              <p className="break-all text-caption text-ds-muted">{p.account}</p>
            </div>
            <span
              className={cn(
                "text-caption",
                (i === 1 && state !== "M1.3") || (i === 0 && state === "M1.2")
                  ? "text-ds-success"
                  : (i === 0 && ["M1.5", "M1.6"].includes(state)) || (i === 2 && state === "M1.6")
                    ? "text-ds-danger"
                    : "text-ds-muted",
              )}
            >
              {i === 0
                ? state === "M1.2"
                  ? "Approved"
                  : ["M1.5", "M1.6"].includes(state)
                    ? "Rejected"
                    : "You"
                : state === "M1.3"
                  ? "—"
                  : i === 1
                    ? "Approved"
                    : state === "M1.6"
                      ? "Rejected"
                      : state === "M1.7"
                        ? "Didn’t vote"
                        : "Waiting"}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
  const recent = (
    <Panel title="Recently approved" className="approval-recent">
      {/* Sample approvals have no transaction, so the panel says where the links go. */}
      <p className="text-caption text-ds-muted">
        These are sample approvals. Each link opens the demo account, not a real transaction.
      </p>
      <div>
        {[
          ...(state === "M1.3"
            ? ["Northwind · 3,000.00 → 5,000.00 USDC", "Meridian Shipping · 0 → 2,000.00 USDC"]
            : []),
          "Northwind · 0 → 2,500.00 USDC",
          "Advance rate cap set to 97.5%",
        ].map((t, i, rows) => (
          <div
            key={t}
            className="approval-recent-row flex items-center justify-between gap-12 py-12"
          >
            <div className="min-w-0">
              <p className="text-label font-medium">{t}</p>
              <p className="text-caption text-ds-muted">
                {i === rows.length - 1 ? "3 of 3 approved" : "2 of 3 approved"} ·{" "}
                {i === rows.length - 1 ? "Oct 28" : i === rows.length - 2 ? "Oct 21" : "Today"}
              </p>
              <a
                href={ACCOUNT}
                target="_blank"
                rel="noreferrer"
                aria-label={`See the sample record on NearBlocks for ${t}`}
                className="link focus-ring mt-2 inline-block text-caption"
              >
                See the record on NearBlocks ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
  function proposal(name: string, second = false) {
    const terminal = ["M1.2", "M1.6", "M1.7"].includes(state) && !second,
      split = state === "M1.5" && !second,
      ownVote = second ? meridianVote !== null : terminal || split;
    return (
      <Panel className="approval-proposal">
        <div className="approval-proposal-head flex flex-col items-start justify-between gap-10 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-col gap-4">
            <h2 className="text-[17px] leading-21 font-semibold">{name}</h2>
            <p className="text-[13px] leading-16 text-ds-muted">
              {second
                ? "New company from the Shippers page · Today 09:40"
                : state === "M1.7"
                  ? "Suggested by the credit assistant · Nov 4"
                  : "Suggested by the credit assistant · Today 10:12"}
            </p>
          </div>
          <span
            className={cn(
              "flex shrink-0 items-center gap-6 rounded-full px-10 py-5 text-caption font-semibold",
              !second && state === "M1.2"
                ? "bg-ds-brand-soft text-ds-brand-deep"
                : !second && state === "M1.5"
                  ? "bg-ds-vote-soft text-ds-vote-ink"
                  : !second && state === "M1.6"
                    ? "bg-ds-danger-stamp text-ds-report-ink"
                    : terminal
                      ? "bg-ds-canvas text-ds-ink-2"
                      : "bg-ds-check-soft text-ds-check-ink",
            )}
          >
            {!second && state === "M1.2" ? (
              <CircleNotch size={14} />
            ) : !second && state === "M1.5" ? (
              <Scales size={14} />
            ) : !second && state === "M1.6" ? (
              <XCircle size={14} />
            ) : !second && state === "M1.7" ? (
              <Hourglass size={14} />
            ) : (
              <ShieldCheck size={14} />
            )}
            {second
              ? "Private check"
              : state === "M1.2"
                ? "Going live"
                : state === "M1.5"
                  ? "Split vote"
                  : state === "M1.6"
                    ? "Rejected"
                    : state === "M1.7"
                      ? "Expired"
                      : "Private check"}
          </span>
        </div>
        <div className="approval-change flex flex-wrap items-center gap-12">
          <span className="text-[22px] leading-27 font-semibold text-ds-muted md:text-[28px] md:leading-34">
            {second ? "0.00" : "3,000.00"}
          </span>
          <ArrowRight size={20} className="shrink-0" />
          <Money
            amount={second ? "2000000000" : "5000000000"}
            className="text-[22px] leading-27 font-semibold md:text-[28px] md:leading-34 [&>span]:font-semibold"
          />
          <span className="rounded-full bg-ds-brand-soft px-10 py-5 text-caption text-ds-brand-deep">
            {second ? "New" : "+67%"}
          </span>
        </div>
        <div className="approval-reason flex gap-10 rounded-[14px] bg-ds-canvas p-14">
          <Sparkle size={18} className="shrink-0" />
          <p className="text-[14px] leading-17 text-ds-ink-2">
            {second
              ? "New company. Its papers check out. A first limit always needs the team."
              : "12 of 12 bills repaid on time, 3 days early on average. Volume doubled in 30 days. Above the 20% weekly cap, so it needs the team."}
          </p>
        </div>
        {(split || state === "M1.6") && !second && (
          <div className="approval-vote-note flex gap-10 rounded-[14px] bg-ds-danger-stamp p-14 text-[13px] leading-16 text-ds-report-ink">
            <ChatText size={18} className="shrink-0" />
            <p>
              {state === "M1.6"
                ? "Risk lead and Finance think it is too big a jump."
                : `Risk lead thinks it is too big a jump. “${note || "Doubling in a month is fast. Let’s wait for two more bills before going above 4,000.00 USDC."}”`}
            </p>
          </div>
        )}
        <div className="approval-footer flex flex-wrap items-center justify-between gap-16 pt-16">
          <div className="flex items-center gap-10">
            <div aria-hidden className="flex -space-x-8">
              {["O", "R", "F"].map((initial, i) => (
                <span
                  key={initial}
                  className={cn(
                    "grid size-32 place-items-center rounded-full border-2 border-ds-bg text-[12px] font-semibold",
                    !second && (i === 0 || (i === 1 && state === "M1.2"))
                      ? "bg-ds-success text-ds-bg"
                      : !second &&
                          ((i === 1 && ["M1.5", "M1.6"].includes(state)) ||
                            (i === 2 && state === "M1.6"))
                        ? "bg-ds-danger text-ds-bg"
                        : !second && i === 1 && state === "M1.7"
                          ? "bg-ds-ink text-ds-bg"
                          : i === 1 && (!second || meridianVote)
                            ? "bg-ds-brand"
                            : "bg-ds-surface-3",
                  )}
                >
                  {initial}
                </span>
              ))}
            </div>
            <p className="text-[14px] leading-17">
              {second
                ? meridianVote
                  ? meridianVote === "approved"
                    ? "1 of 2 approved"
                    : "1 rejected"
                  : "0 of 2 approved"
                : state === "M1.2"
                  ? "2 of 2 approved"
                  : state === "M1.5"
                    ? "1 approve · 1 reject"
                    : state === "M1.6"
                      ? "1 approve · 2 reject"
                      : state === "M1.7"
                        ? "1 approve · 7 days passed"
                        : "1 of 2 approved"}
            </p>
          </div>
          {(!ownVote || second) && (
            <div className="approval-actions flex w-full flex-col-reverse gap-10 md:w-auto md:flex-row md:gap-12">
              <Button
                variant="quiet"
                className="justify-center"
                disabled={ownVote}
                onClick={() => {
                  setSelected(second ? "Meridian Shipping" : "Northwind Freight");
                  setReason("");
                  setNote("");
                  setModal("vote");
                }}
              >
                Reject
              </Button>
              <Button
                icon={<PencilSimpleLine size={17} />}
                disabled={ownVote}
                onClick={() => {
                  if (second) {
                    setMeridianVote("approved");
                    setReceipt("Demo approval vote");
                  } else {
                    setState("M1.2");
                    setReceipt("Demo limit approval");
                  }
                }}
              >
                Approve
              </Button>
            </div>
          )}
          {ownVote && !second && (
            <p
              className={cn(
                "flex items-center gap-6 text-[13px] leading-16",
                state === "M1.2"
                  ? "text-ds-success"
                  : state === "M1.6"
                    ? "text-ds-danger"
                    : "text-ds-ink-2",
              )}
            >
              {state === "M1.2" ? (
                <CheckCircle size={18} className="shrink-0" />
              ) : state === "M1.6" ? (
                <XCircle size={16} className="shrink-0" />
              ) : (
                <Hourglass size={16} className="shrink-0" />
              )}
              {second
                ? "Your vote is recorded in this demo."
                : state === "M1.2"
                  ? "Approved. The new limit goes live now."
                  : state === "M1.5"
                    ? "You said no. Finance decides next."
                    : state === "M1.6"
                      ? "It is closed. The assistant can suggest it again on Nov 19."
                      : "It expired on Nov 11. The assistant can suggest it again."}
            </p>
          )}
        </div>
        {second && meridianVote && <DemoRecord title="Demo team vote" />}
      </Panel>
    );
  }
  const activeList = (
    <Panel title="Active shippers" className="admin-active-list">
      {state === "M2.9" ? (
        <Empty
          title="No active shippers yet"
          text="A company shows up here after the team approves its starting limit."
          icon="company"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {[
            {
              name: "Northwind Freight Co.",
              account: "northwind-freight.testnet",
              limit: "3000000000",
              note: "Since Oct 21 · 12 bills",
              record: "100% on time",
            },
            {
              name: "Blue Ridge Logistics",
              account: "blue-ridge.testnet",
              limit: "1500000000",
              note: "Since Oct 23 · 7 bills",
              record: "86% on time",
            },
            {
              name: "Atlas Cargo",
              account: "atlas-cargo.testnet",
              limit: "1500000000",
              note: "Since Nov 10 · No bills yet",
              record: "New",
            },
          ].map((c, i) => (
            <Link
              key={c.account}
              href={`/admin/shippers/${c.account}`}
              className="tap focus-ring flex items-center justify-between gap-12 rounded-small py-10 hover:bg-ds-canvas"
            >
              <div className="min-w-0">
                <p className="text-[15px] leading-18 font-medium">{c.name}</p>
                <p className="mt-2 text-[13px] leading-16 text-ds-muted">{c.note}</p>
              </div>
              <div className="shrink-0 text-right">
                <Money amount={c.limit} className="text-[15px] leading-18" />
                <p
                  className={cn(
                    "mt-2 text-[13px] leading-16",
                    i === 0 ? "text-ds-success" : i === 1 ? "text-ds-warning" : "text-ds-muted",
                  )}
                >
                  {c.record}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
  const applications = (
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
                    <Button icon={<Scales size={17} />} onClick={() => decide(name)}>
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
  const company = coast ? "Coastline Freight" : "Meridian Shipping";
  const application = (
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
              { label: "Contact", value: coast ? "Marcus Reid · Owner" : "Priya Shah · Finance" },
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
                    onClick={() => {
                      setDocument(name);
                      setModal("document");
                    }}
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
            <Button icon={<Scales size={17} />} onClick={() => decide(company)}>
              Decide
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
  const active =
    account !== "northwind-freight.testnet" ? (
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
                8 bills · 2,400.00 USDC · newest 4
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
                      #{r.id} · Due {r.due}
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
                  meta: "Today · Waiting for the team",
                },
                { title: "Raised to 3,000.00 USDC", meta: "Nov 9 · By the credit assistant" },
                { title: "Started at 2,500.00 USDC", meta: "Oct 21 · Approved by the team" },
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
                { icon: User, text: "Hannah Brooks · Finance" },
                { icon: Phone, text: "+1 207 555 0142" },
                { icon: Envelope, text: "hannah@northwindfreight.com" },
                { icon: ShieldCheck, text: "Documents checked on Oct 21" },
              ].map((r) => (
                <p key={r.text} className="flex gap-10 text-[14px] leading-17 text-ds-ink-2">
                  <r.icon size={16} className="shrink-0 text-ds-muted" />
                  <span className="min-w-0 break-words">{r.text}</span>
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
                onClick={() => {
                  setReason("");
                  setModal("pause");
                }}
              >
                Pause new shipments
              </Button>
              <Button
                className="min-w-0 flex-1"
                icon={<PencilSimple size={17} />}
                onClick={() => {
                  setLimit("4000");
                  setReason("");
                  setNote("");
                  setModal("limit");
                }}
              >
                Change limit
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    );
  const pool = fixture.pool,
    empty = state === "M3.2",
    small = state === "M3.4";
  const poolContent = (
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

  return (
    <div
      className={cn(
        "admin-ui",
        group === "M1" && "admin-approvals",
        (activeDetail || applicationDetail) && "admin-detail",
        group === "M3" && "admin-pool",
      )}
      data-state={state}
    >
      <RoleShell
        role="admin"
        current={group === "M1" ? "/admin" : group === "M3" ? "/admin/pool" : "/admin/shippers"}
      >
        <div className="flex flex-col gap-24">
          {(activeDetail || applicationDetail) && (
            <BackLink href="/admin/shippers">Shippers</BackLink>
          )}
          <header className="flex flex-wrap items-center justify-between gap-12 md:items-end">
            <div>
              <h1 className="text-title">{title}</h1>
              <p className="mt-6 hidden text-label text-ds-muted md:block">
                {group === "M1"
                  ? "Changes that need the team"
                  : group === "M3"
                    ? "Where the investors’ money is right now"
                    : activeDetail
                      ? account === "northwind-freight.testnet"
                        ? "Active since Oct 21 · Eastport"
                        : "Active shipper"
                      : applicationDetail
                        ? coast
                          ? "Applied yesterday · Northgate"
                          : "Applied today · Port Ellis"
                        : "New applications and the companies already shipping"}
              </p>
            </div>
            {applicationDetail && (
              <Button
                className="md:hidden"
                icon={<Scales size={17} />}
                onClick={() => decide(company)}
              >
                Decide
              </Button>
            )}
            {group === "M1" && (
              <Button className="h-52" onClick={() => setModal("wallet")}>
                Open team wallet
              </Button>
            )}
          </header>
          {receipt && <DemoRecord title={receipt} />}
          <>
            {group === "M1" ? (
              <div className="grid items-start gap-24 lg:grid-cols-[1fr_420px]">
                <div className="flex flex-col gap-24">
                  {state === "M1.3" ? (
                    <Panel className="admin-empty-approvals">
                      <Empty
                        title="Nothing waiting for the team"
                        text="Small changes go through on their own. Bigger ones will show up here."
                      />
                    </Panel>
                  ) : (
                    <>
                      {proposal("Raise Northwind’s limit")}
                      {proposal("Start Meridian Shipping", true)}
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-24">
                  {team}
                  {recent}
                </div>
              </div>
            ) : group === "M3" ? (
              <>
                {state === "M3.3" && (
                  <div className="admin-pool-alert flex items-start gap-12 rounded-[20px] bg-ds-danger-stamp p-16 text-ds-report-ink">
                    <Warning size={20} className="shrink-0" />
                    <div>
                      <h2 className="text-[15px] leading-18 font-semibold">
                        Blue Ridge Logistics is 3 days late on bill #1037
                      </h2>
                      <p className="mt-4 text-[13px] leading-16">
                        They owe 292.50 USDC. If the bill remains unpaid for 14 days after its due
                        date, the team can use the reserve.
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
                {poolContent}
              </>
            ) : activeDetail ? (
              active
            ) : applicationDetail ? (
              application
            ) : (
              <>
                <Segmented
                  label="Shippers"
                  className="admin-tabs w-full lg:hidden"
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: "Waiting", label: `Waiting · ${waitingCount}` },
                    { value: "Active", label: `Active · ${state === "M2.9" ? 0 : 3}` },
                  ]}
                />
                <div className="grid items-start gap-24 lg:grid-cols-[1fr_420px]">
                  <div
                    className={cn("flex flex-col gap-20", tab !== "Waiting" && "hidden lg:flex")}
                  >
                    <div className="hidden lg:block">
                      {sectionTitle(`Waiting for review · ${waitingCount}`)}
                    </div>
                    {applications}
                  </div>
                  <div className={cn(tab !== "Active" && "hidden lg:block")}>{activeList}</div>
                </div>
              </>
            )}
          </>
          <p className="text-center text-caption text-ds-muted">
            This demo uses sample data. No real votes or changes are sent.
          </p>
        </div>
        {showing && (
          <ActionSheet
            className={`admin-sheet admin-sheet-${showing}`}
            title={
              showing === "vote"
                ? "Reject this change?"
                : showing === "decision"
                  ? `Decide on ${selected}`
                  : showing === "limit"
                    ? "Change Northwind’s limit"
                    : showing === "pause"
                      ? "Pause Northwind’s new shipments?"
                      : showing === "document"
                        ? document
                        : "Team wallet"
            }
            onClose={close}
          >
            {showing === "wallet" ? (
              <>
                <p className="text-label">
                  The team accounts are shown below. Wallet connection will be added with sign-in.
                </p>
                {PEOPLE.map((p) => (
                  <Fact key={p.account} label={p.name} value={p.account} />
                ))}
                <Button onClick={close}>Done</Button>
              </>
            ) : showing === "document" ? (
              <>
                <p className="text-label">
                  This is a sample document entry. Private uploaded files will open after sign-in
                  and backend integration.
                </p>
                <Button onClick={close}>Done</Button>
              </>
            ) : (
              <>
                <AdminActionFields
                  kind={showing}
                  selected={selected}
                  rejection={rejection}
                  onRejection={setRejection}
                  reason={reason}
                  onReason={setReason}
                  note={note}
                  onNote={setNote}
                  limit={limit}
                  onLimit={setLimit}
                  invalidLimit={invalidLimit}
                />
                <div className="admin-sheet-actions flex justify-end gap-10">
                  <Button variant="quiet" onClick={close}>
                    Cancel
                  </Button>
                  <Button
                    variant={
                      showing === "pause" || showing === "vote" || rejection ? "danger" : "primary"
                    }
                    icon={
                      showing === "pause" ? (
                        <Pause size={17} />
                      ) : showing === "vote" || rejection ? (
                        <X size={17} />
                      ) : showing === "limit" ? (
                        <PaperPlaneTilt size={17} />
                      ) : (
                        <Check size={17} weight="bold" />
                      )
                    }
                    disabled={
                      showing === "pause" ||
                      showing === "vote" ||
                      (showing === "decision" && rejection)
                        ? !reason
                        : invalidLimit || (showing === "limit" && !note.trim())
                    }
                    onClick={() => {
                      if (showing === "pause") {
                        setPaused(true);
                        setReceipt("Demo pause receipt");
                      } else if (showing === "vote") {
                        if (selected === "Meridian Shipping") setMeridianVote("rejected");
                        else setState("M1.5");
                        setReceipt("Demo rejection vote");
                      } else if (showing === "decision") {
                        if (rejection) {
                          setApplicationRejected((previous) => [...previous, selected]);
                          setReceipt("Demo application rejection");
                        } else {
                          setRequestedLimit(String(limitUnits));
                          setRequestedCompany(selected);
                          setState("M2.2");
                          setReceipt("Demo starting limit request");
                        }
                      } else {
                        setReceipt(`Demo limit request for ${formatUsdc(limitUnits)} USDC`);
                      }
                      setModal(null);
                      if (["M2.11", "M2.12"].includes(state)) setState("M2.7");
                      if (["M2.4", "M2.5"].includes(state) && rejection) setState("M2.1");
                    }}
                  >
                    {showing === "pause"
                      ? "Pause"
                      : showing === "vote" || rejection
                        ? "Reject"
                        : showing === "limit"
                          ? "Send to the team"
                          : "Approve"}
                  </Button>
                </div>
              </>
            )}
          </ActionSheet>
        )}
      </RoleShell>
    </div>
  );
}
export function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="admin-fact flex flex-wrap items-center justify-between gap-8 py-7 text-[14px] leading-17">
      <span className="text-ds-muted">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  );
}
export function AdminBadge({
  children,
  tone = "success",
  icon,
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "brand";
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-6 rounded-full px-10 py-5 text-[12px] leading-15 font-semibold",
        tone === "success"
          ? "bg-ds-check-soft text-ds-check-ink"
          : tone === "warning"
            ? "bg-ds-warning-soft text-ds-warning"
            : "bg-ds-brand-soft text-ds-brand-deep",
      )}
    >
      {icon ??
        (tone === "warning" ? (
          <WarningCircle size={14} />
        ) : tone === "brand" ? (
          <Hourglass size={14} />
        ) : (
          <ShieldCheck size={14} />
        ))}
      {children}
    </span>
  );
}
export function AdminTiles({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div
      className={cn(
        "admin-tiles grid gap-10",
        items.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="rounded-small bg-ds-canvas px-14 py-12">
          <p className="text-[12px] leading-15 text-ds-muted">{item.label}</p>
          <div className="mt-2 text-[16px] leading-20 font-medium">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
export function Empty({
  title,
  text,
  icon = "tray",
}: {
  title: string;
  text: string;
  icon?: "tray" | "company" | "activity" | "investors" | "applications";
}) {
  return (
    <div className="admin-empty grid min-h-240 place-content-center justify-items-center gap-12 text-center">
      {icon === "company" ? (
        <span className="grid size-56 place-items-center rounded-full bg-ds-canvas text-ds-muted">
          <Buildings size={24} />
        </span>
      ) : icon === "activity" ? (
        <span className="grid size-48 place-items-center rounded-full bg-ds-canvas text-ds-muted">
          <Pulse size={22} />
        </span>
      ) : icon === "investors" ? (
        <span className="grid size-48 place-items-center rounded-full bg-ds-canvas text-ds-muted">
          <Users size={22} />
        </span>
      ) : icon === "applications" ? (
        <span className="grid size-56 place-items-center rounded-full bg-ds-brand-soft text-ds-brand-deep">
          <svg
            aria-hidden="true"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12 5 5a2 2 0 0 1 1.8-1h10.4A2 2 0 0 1 19 5l3 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" />
            <path d="M2 12h6l2 3h4l2-3h6" />
          </svg>
        </span>
      ) : (
        <Tray size={28} className="text-ds-muted" />
      )}
      <h2 className="text-heading">{title}</h2>
      <p className="mx-auto max-w-340 text-label text-ds-muted">{text}</p>
    </div>
  );
}
