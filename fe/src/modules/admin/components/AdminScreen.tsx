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
  Check,
  Pause,
  PaperPlaneTilt,
  PencilSimple,
  PencilSimpleLine,
  Scales,
  X,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Money } from "@/components/elements/Money";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { FanMeter } from "@/components/elements/FanMeter";
import { Stat } from "@/components/elements/Stat";
import { cn } from "@/lib/cn";
import { ADMIN_FIXTURES, type AdminState } from "../data/fixtures";
const PEOPLE = [
  { name: "Risk lead", account: "risk.waybil.testnet" },
  { name: "Operations", account: "ops.waybil.testnet" },
  { name: "Finance", account: "finance.waybil.testnet" },
];
const REASONS = ["Too big a jump", "Needs more history", "Payment risk", "Other"];
const ACCOUNT = "https://testnet.nearblocks.io/address/app.waybil.testnet";
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
      ? { name: "Blue Ridge Logistics", limit: "2000000000", owed: "594000000", left: "1406000000" }
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
  const sectionTitle = (text: string) => <h2 className="text-heading">{text}</h2>;
  const team = (
    <Panel title="Team approval">
      <p className="text-label text-ds-muted">
        A change goes through when 2 of the 3 team members approve it.
      </p>
      {PEOPLE.map((p, i) => (
        <div key={p.account} className="flex items-center gap-12 py-8">
          <span
            className={cn(
              "grid size-40 shrink-0 place-content-center rounded-full border-2",
              i === 0 ? "border-ds-brand" : i === 1 ? "border-ds-success" : "border-ds-line",
            )}
            aria-hidden
          >
            {p.name[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-label font-medium">{p.name}</p>
            <p className="break-all text-caption text-ds-muted">{p.account}</p>
          </div>
          <span className="text-caption text-ds-muted">
            {i === 0
              ? state === "M1.2"
                ? "Signed"
                : state === "M1.5"
                  ? "Rejected"
                  : "You"
              : i === 1
                ? "Signed"
                : "Waiting"}
          </span>
        </div>
      ))}
    </Panel>
  );
  const recent = (
    <Panel title="Recently approved">
      {[
        ...(state === "M1.3"
          ? ["Northwind’s limit is now 5,000.00 USDC.", "Meridian starts at 2,000.00 USDC."]
          : []),
        "Northwind started at 2,500.00 USDC.",
        "The advance rate cap is 98%.",
      ].map((t) => (
        <div key={t} className="py-8">
          <p className="text-label font-medium">{t}</p>
          <p className="text-caption text-ds-muted">Two team members approved.</p>
          <a
            href={ACCOUNT}
            target="_blank"
            rel="noreferrer"
            className="link focus-ring text-caption"
          >
            See the record on NearBlocks ↗
          </a>
        </div>
      ))}
    </Panel>
  );
  function proposal(name: string, second = false) {
    const terminal = ["M1.2", "M1.6", "M1.7"].includes(state) && !second,
      split = state === "M1.5" && !second,
      ownVote = second ? meridianVote !== null : terminal || split;
    return (
      <Panel
        title={name}
        className="[&>div:first-child]:items-start [&>div:first-child]:flex-col [&_h2]:text-[16px] md:[&>div:first-child]:flex-row md:[&_h2]:text-heading"
        action={
          <span
            className={cn(
              "rounded-full px-12 py-6 text-caption",
              terminal ? "bg-ds-canvas text-ds-muted" : "bg-ds-success-soft text-ds-success",
            )}
          >
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
        }
      >
        <p className="text-caption text-ds-muted">
          {second
            ? "New company from the Shippers page · Today 09:40"
            : "Suggested by the credit assistant · Today 10:12"}
        </p>
        <div className="flex flex-wrap items-baseline gap-8 md:gap-12">
          <span className="text-heading text-ds-muted">{second ? "0.00" : "3,000.00"}</span>
          <span>→</span>
          <Money
            amount={second ? "2000000000" : "5000000000"}
            className="text-[24px] font-medium md:text-[28px]"
          />
          <span className="rounded-full bg-ds-brand-soft px-10 py-6 text-caption">
            {second ? "New" : "+67%"}
          </span>
        </div>
        <p className="rounded-row bg-ds-canvas p-16 text-label text-ds-muted">
          {second
            ? "New company. Its papers check out. A first limit always needs the team."
            : "Every one of 12 bills was repaid on time, 3 days early on average. Volume doubled in 30 days. The increase is above the weekly cap, so it needs the team."}
        </p>
        {(split || state === "M1.6") && !second && (
          <p className="rounded-row bg-ds-warning-soft p-16 text-label">
            Risk lead thinks the jump is too big.{" "}
            {note || "Wait for two more bills before going above 4,000.00 USDC."}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-16">
          <div className="flex items-center gap-12">
            <span aria-hidden className="rounded-full bg-ds-canvas px-12 py-8 text-label">
              O · R · F
            </span>
            <p className="text-label">
              {second
                ? meridianVote
                  ? meridianVote === "approved"
                    ? "1 of 2 approved"
                    : "1 rejected"
                  : "0 of 2 approved"
                : state === "M1.2"
                  ? "2 of 2 approved"
                  : state === "M1.5"
                    ? "1 approved and 1 rejected"
                    : state === "M1.6"
                      ? "1 approved and 2 rejected"
                      : state === "M1.7"
                        ? "7 days passed"
                        : "1 of 2 approved"}
            </p>
          </div>
          {(!terminal || state !== "M1.2") && (
            <div className="flex w-full flex-col-reverse gap-10 md:w-auto md:flex-row [&>button]:justify-between">
              <Button
                variant="danger"
                icon={<X size={17} />}
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
        </div>
        {ownVote && (
          <p className="text-label text-ds-muted">
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
        {((!second && state === "M1.2") || (second && meridianVote)) && (
          <DemoRecord title="Demo team vote" />
        )}
      </Panel>
    );
  }
  const activeList = (
    <Panel title="Active shippers">
      {state === "M2.9" ? (
        <Empty
          title="No active shippers yet"
          text="A company shows up here after the team approves its starting limit."
        />
      ) : (
        [
          {
            name: "Northwind Freight Co.",
            limit: "3000000000",
            note: "Since Oct 21 · 12 bills",
            record: "100% on time",
          },
          {
            name: "Blue Ridge Logistics",
            limit: "2000000000",
            note: "Since Oct 23 · 7 bills",
            record: "86% on time",
          },
          {
            name: "Atlas Cargo",
            limit: "1500000000",
            note: "Since Nov 10 · No bills yet",
            record: "New",
          },
        ].map((c) => (
          <Link
            key={c.name}
            href={`/admin/shippers/${c.name.startsWith("Northwind") ? "northwind-freight.testnet" : c.name.startsWith("Blue") ? "blue-ridge.testnet" : "atlas-cargo.testnet"}`}
            className="focus-ring flex flex-wrap justify-between gap-8 rounded-row py-12"
          >
            <div>
              <p className="text-body font-medium">{c.name}</p>
              <p className="text-caption text-ds-muted">{c.note}</p>
            </div>
            <div className="text-right">
              <Money amount={c.limit} className="text-label" />
              <p className="text-caption text-ds-success">{c.record}</p>
            </div>
          </Link>
        ))
      )}
    </Panel>
  );
  const applications = (
    <div className="flex flex-col gap-24">
      {state === "M2.8" || applicationRejected.length === 2 ? (
        <Panel>
          <Empty title="No new applications" text="New companies show up here when they apply." />
        </Panel>
      ) : (
        ["Meridian Shipping", "Coastline Freight"]
          .filter((name) => !applicationRejected.includes(name))
          .map((name) => {
            const i = name === "Coastline Freight" ? 1 : 0;
            const approved = state === "M2.2" && name === requestedCompany;
            return (
              <Panel
                key={name}
                title={name}
                className="[&>div:first-child]:flex-col [&>div:first-child]:items-start md:[&>div:first-child]:flex-row"
                action={
                  <span
                    className={cn(
                      "rounded-full px-12 py-6 text-caption",
                      i
                        ? "bg-ds-warning-soft text-ds-warning"
                        : "bg-ds-success-soft text-ds-success",
                    )}
                  >
                    {approved
                      ? "1 of 2 approvals"
                      : i
                        ? "Needs a closer look"
                        : "Documents checked"}
                  </span>
                }
              >
                <p className="text-caption text-ds-muted">
                  {i
                    ? "Applied yesterday · Northgate · 25 trips a month"
                    : "Applied today · Port Ellis · 40 trips a month"}
                </p>
                <div className="grid gap-12 md:grid-cols-3">
                  {[
                    { label: "Registration ID", value: i ? "Doesn’t match" : "Verified" },
                    {
                      label: "Monthly spend",
                      value: <Money amount={i ? "6500000000" : "12000000000"} />,
                    },
                    { label: "Contact", value: i ? "Marcus, Owner" : "Priya, Finance" },
                  ].map((c) => (
                    <div key={c.label} className="rounded-row bg-ds-canvas p-12 text-label">
                      <p className="mb-4 text-caption text-ds-muted">{c.label}</p>
                      {c.value}
                    </div>
                  ))}
                </div>
                <p className="rounded-row bg-ds-brand-soft p-16 text-label">
                  {approved
                    ? `You approved a ${formatUsdc(BigInt(requestedLimit))} USDC starting limit. It goes live when one more team member approves.`
                    : i
                      ? "The assistant is unsure about two papers, so it gives no limit."
                      : "The assistant suggests a starting limit of 2,000.00 USDC."}
                </p>
                <div className="flex justify-between gap-12">
                  <ButtonLink
                    variant="secondary"
                    icon={<ArrowRight size={17} />}
                    href={`/admin/shippers/${i ? "coastline-freight.testnet" : "meridian-shipping.testnet"}`}
                  >
                    Details
                  </ButtonLink>
                  <Button
                    icon={<Scales size={17} />}
                    disabled={approved}
                    onClick={() => decide(name)}
                  >
                    {approved ? "You approved" : "Decide"}
                  </Button>
                </div>
              </Panel>
            );
          })
      )}
    </div>
  );
  const company = coast ? "Coastline Freight" : "Meridian Shipping";
  const application = (
    <div className="grid items-start gap-24 lg:grid-cols-[1fr_440px]">
      <div className="flex flex-col gap-24">
        <Panel title="Company">
          {[
            { label: "Registration ID", value: coast ? "8120 0045 7781 2" : "9120 0012 3456 7" },
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
        </Panel>
        <Panel title="Documents">
          {["Business registration.pdf", "Tax ID.pdf", "Bank statement, 3 months.pdf"].map(
            (name, i) => (
              <div key={name} className="flex items-center justify-between gap-12 py-8">
                <div>
                  <p className="text-label">{name}</p>
                  <p
                    className={cn(
                      "text-caption",
                      coast && i > 0 ? "text-ds-warning" : "text-ds-muted",
                    )}
                  >
                    {i === 0
                      ? "Matches company name"
                      : coast
                        ? i === 1
                          ? "Name does not match"
                          : "Hard to read"
                        : i === 1
                          ? "Valid"
                          : "Average outgoing payments are 14,200.00 USDC per month."}
                  </p>
                </div>
                <button
                  className="link focus-ring text-label"
                  onClick={() => {
                    setDocument(name);
                    setModal("document");
                  }}
                >
                  Open ↗
                </button>
              </div>
            ),
          )}
        </Panel>
        <Panel title="Shipping profile">
          <Fact label="Trips per month" value={coast ? "25" : "40"} />
          <Fact
            label="Spend per month"
            value={<Money amount={coast ? "6500000000" : "12000000000"} />}
          />
          <Fact
            label="Main routes"
            value={
              coast
                ? "Northgate to Westfield and Riverton"
                : "Port Ellis to Millbrook and Harbor City"
            }
          />
        </Panel>
      </div>
      <div className="flex flex-col gap-24">
        <Panel title="Assistant’s view">
          <span className="w-fit rounded-full bg-ds-brand-soft px-12 py-6 text-caption">
            {coast ? "Needs a closer look" : "Private check"}
          </span>
          <p className="text-caption text-ds-muted">Suggested starting limit</p>
          {coast ? (
            <p className="text-heading">No suggestion yet</p>
          ) : (
            <Money amount="2000000000" className="text-amount" />
          )}
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
                "A new company starts below the 10,000.00 USDC cap.",
                "The limit is reviewed after 3 bills are paid on time.",
              ]
          ).map((t) => (
            <p key={t} className="text-label text-ds-muted">
              {t}
            </p>
          ))}
          <DemoRecord title="Demo private check" />
        </Panel>
        <Panel title="Decision">
          <p className="text-label text-ds-muted">
            {coast
              ? "The assistant is unsure about this company. Check the papers before you decide."
              : "If you approve, the team gets a request for a starting limit. It goes live when 2 of 3 approve."}
          </p>
          <Button icon={<Scales size={17} />} onClick={() => decide(company)}>
            Decide
          </Button>
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
      <div className="grid items-start gap-24 lg:grid-cols-[1fr_440px]">
        <div className="flex flex-col gap-24">
          <Panel
            title="Credit"
            action={
              <span className="text-caption text-ds-success">
                {paused ? "Paused" : "Good standing"}
              </span>
            }
          >
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
            <Fact label="Fee per bill" value="2.5%" />
            <Fact label="Pays within" value="30 days" />
          </Panel>
          <Panel title="Payment record">
            <Fact label="Bills paid" value="12" />
            <Fact label="Paid on time" value="100%" />
            <Fact label="Paid early, on average" value="3 days" />
          </Panel>
          <Panel title="Open bills">
            <p className="text-caption text-ds-muted">8 bills · 2,400.00 USDC · Newest 4</p>
            {[
              { id: 1041, city: "Harbor City", amount: "300000000", due: "Dec 11" },
              { id: 1043, city: "Riverton", amount: "150000000", due: "Dec 13" },
              { id: 1044, city: "Westfield", amount: "210000000", due: "Dec 16" },
              { id: 1045, city: "Oakdale", amount: "292500000", due: "Dec 18" },
            ].map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap justify-between gap-10 border-b border-ds-line py-12"
              >
                <div>
                  <p className="text-label">Eastport to {r.city}</p>
                  <p className="text-caption text-ds-muted">
                    #{r.id} · Due {r.due}
                  </p>
                </div>
                <Money amount={r.amount} />
              </div>
            ))}
          </Panel>
        </div>
        <div className="flex flex-col gap-24">
          <Panel title="Limit history">
            {[
              "The assistant suggests 5,000.00 USDC.",
              "The limit rose to 3,000.00 USDC on Nov 9.",
              "The team approved 2,500.00 USDC on Oct 21.",
            ].map((t) => (
              <p key={t} className="py-8 text-label text-ds-muted">
                {t}
              </p>
            ))}
            <Link href="/admin" className="link focus-ring text-label">
              See it in Approvals ↗
            </Link>
          </Panel>
          <Panel title="Contact">
            <p className="text-label">Hannah Brooks · Finance</p>
            <p className="text-label text-ds-muted">+1 207 555 0142</p>
            <p className="break-all text-label text-ds-muted">hannah@northwindfreight.com</p>
            <p className="text-caption text-ds-muted">Documents were checked on Oct 21.</p>
          </Panel>
          <Panel title="Manage">
            <p className="text-label text-ds-muted">
              A limit change needs 2 of 3 team members. A pause starts right away.
            </p>
            <Button
              variant="danger"
              icon={<Pause size={17} />}
              disabled={paused}
              onClick={() => {
                setReason("");
                setModal("pause");
              }}
            >
              Pause new shipments
            </Button>
            <Button
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
          </Panel>
        </div>
      </div>
    );
  const pool = fixture.pool,
    empty = state === "M3.2",
    small = state === "M3.4";
  const poolContent = (
    <>
      <div className="grid gap-16 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "In the pool",
            value: String(BigInt(pool.cash) + BigInt(pool.lent)),
            context: empty ? "No investors yet" : small ? "3 investors" : "5 investors",
          },
          {
            label: "Lent out now",
            value: pool.lent,
            context: empty ? "Nothing lent yet" : small ? "94% of the pool" : "13% of the pool",
          },
          {
            label: "Overdue",
            value: state === "M3.3" ? "292500000" : "0",
            context: state === "M3.3" ? "1 bill · 3 days late" : "Nothing late",
          },
          {
            label: "Reserve",
            value: pool.reserve,
            context: empty ? "It builds up from fees." : "The reserve helps cover losses.",
          },
        ].map((s) => (
          <Stat
            key={s.label}
            /* The board paints the first card brand yellow and gives it the bank glyph. */
            tone={s.label === "In the pool" ? "brand" : "plain"}
            icon={s.label === "In the pool" ? <Bank size={16} /> : undefined}
            className={cn(
              "w-full",
              state === "M3.3" &&
                s.label === "Overdue" &&
                "bg-ds-danger-soft [&>span]:text-ds-danger",
            )}
            label={s.label}
            value={<Money amount={s.value} />}
            context={s.context}
          />
        ))}
      </div>
      <div className="grid items-start gap-24 lg:grid-cols-2">
        <Panel
          title="Investors"
          action={
            !empty ? (
              <span className="text-caption text-ds-muted">APY 8.4% · Last 30 days</span>
            ) : undefined
          }
        >
          {empty ? (
            <Empty
              title="No investors yet"
              text="Investors show up here after their first deposit."
            />
          ) : (
            [
              {
                name: "maya-harper.testnet",
                amount: small ? "2000000000" : "5009720000",
                pct: small ? "31%" : "20%",
              },
              {
                name: "orbit-ventures.testnet",
                amount: small ? "2400000000" : "8000000000",
                pct: small ? "38%" : "32%",
              },
              {
                name: "harbor-coop.testnet",
                amount: small ? "2000000000" : "6500000000",
                pct: small ? "31%" : "26%",
              },
              ...(!small
                ? [
                    { name: "leo-moreau.testnet", amount: "3000000000", pct: "12%" },
                    { name: "ana-silva.testnet", amount: "2490280000", pct: "10%" },
                  ]
                : []),
            ].map((i) => (
              <div
                key={i.name}
                className="flex flex-wrap justify-between gap-12 border-b border-ds-line py-12 last:border-0"
              >
                <div>
                  <p className="break-all text-label">{i.name}</p>
                  <p className="text-caption text-ds-muted">Since Nov 10</p>
                </div>
                <div className="text-right">
                  <Money amount={i.amount} />
                  <p className="text-caption text-ds-muted">{i.pct}</p>
                </div>
              </div>
            ))
          )}
        </Panel>
        <div className="flex flex-col gap-24">
          <Panel title="Recent activity">
            {empty ? (
              <Empty
                title="Nothing has happened yet"
                text="Deposits, advances and repayments will show up here."
              />
            ) : (
              [
                { title: "Advance · #1041", name: "Sam", amount: "-292500000" },
                { title: "Repaid · #1039", name: "Northwind", amount: "120000000" },
                { title: "Deposit", name: "Maya Harper", amount: "1000000000" },
              ].map((r) => (
                <div key={r.title} className="flex flex-wrap justify-between gap-10 py-12">
                  <div>
                    <p className="text-label">{r.title}</p>
                    <p className="text-caption text-ds-muted">{r.name}</p>
                    <a
                      href={ACCOUNT}
                      target="_blank"
                      rel="noreferrer"
                      className="link focus-ring text-caption"
                    >
                      See the record on NearBlocks ↗
                    </a>
                  </div>
                  <Money amount={r.amount} />
                </div>
              ))
            )}
          </Panel>
          <Panel title="Pool limits">
            <Fact label="Max advance rate" value="98%" />
            <Fact label="Max share for one shipper" value="25% of the pool" />
            <Fact label="Withdrawals when busy" value="Paid as repayments arrive" />
          </Panel>
        </div>
      </div>
    </>
  );
  return (
    <RoleShell
      role="admin"
      current={group === "M1" ? "/admin" : group === "M3" ? "/admin/pool" : "/admin/shippers"}
    >
      <div className="flex flex-col gap-24">
        {(activeDetail || applicationDetail) && (
          <Link href="/admin/shippers" className="focus-ring text-label text-ds-muted">
            ← Shippers
          </Link>
        )}
        <header className="flex flex-wrap items-center justify-between gap-12 md:items-end">
          <div>
            <h1 className="text-title">{title}</h1>
            <p className="mt-6 hidden text-label text-ds-muted md:block">
              {group === "M1"
                ? "Changes that need the team."
                : group === "M3"
                  ? "Where the investors’ money is right now."
                  : activeDetail
                    ? account === "northwind-freight.testnet"
                      ? "Active since Oct 21 · Eastport"
                      : "Active shipper"
                    : applicationDetail
                      ? coast
                        ? "Applied yesterday · Northgate"
                        : "Applied today · Port Ellis"
                      : "New applications and the companies already shipping."}
            </p>
          </div>
          <Button onClick={() => setModal("wallet")}>Open team wallet</Button>
        </header>
        {receipt && <DemoRecord title={receipt} />}
        <>
          {group === "M1" ? (
            <div className="grid items-start gap-24 lg:grid-cols-[1fr_420px]">
              <div className="flex flex-col gap-24">
                {state === "M1.3" ? (
                  <Panel>
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
                <div className="rounded-row bg-ds-danger-soft p-20">
                  <h2 className="text-heading text-ds-danger">
                    Blue Ridge Logistics is 3 days late on bill #1037
                  </h2>
                  <p className="mt-8 text-label">
                    They owe 292.50 USDC. If the bill remains unpaid for 14 days after its due date,
                    the team can use the reserve.
                  </p>
                  <Link
                    href="/admin/shippers/blue-ridge.testnet"
                    className="link-ink focus-ring mt-12 inline-block text-label underline"
                  >
                    See Blue Ridge Logistics ↗
                  </Link>
                </div>
              )}
              {small && (
                <div className="rounded-row bg-ds-warning-soft p-20">
                  <h2 className="text-heading">Almost all the money is lent out</h2>
                  <p className="mt-8 text-label">
                    Only 400.00 USDC is free. New advances wait until repayments come in.
                  </p>
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
              {/* Tabs, so they are plain pills with no circle (design/waybil.pen, M2). */}
              <div className="flex gap-8 lg:hidden">
                {["Waiting", "Active"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(
                      "press focus-ring rounded-full px-16 py-8 text-label transition-colors duration-150 ease-base",
                      tab === t ? "bg-ds-ink text-ds-bg" : "bg-ds-canvas text-ds-muted",
                    )}
                  >
                    {t} {t === "Waiting" ? (state === "M2.8" ? 0 : 2) : state === "M2.9" ? 0 : 3}
                  </button>
                ))}
              </div>
              <div className="grid items-start gap-24 lg:grid-cols-[1fr_420px]">
                <div className={cn("flex flex-col gap-20", tab !== "Waiting" && "hidden lg:flex")}>
                  <div className="hidden lg:block">{sectionTitle("Waiting for review")}</div>
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
                This is a sample document entry. Private uploaded files will open after sign-in and
                backend integration.
              </p>
              <Button onClick={close}>Done</Button>
            </>
          ) : (
            <>
              {showing === "decision" && (
                <div className="flex gap-10">
                  <Button
                    variant={!rejection ? "primary" : "quiet"}
                    icon={!rejection ? <Check size={17} weight="bold" /> : undefined}
                    onClick={() => setRejection(false)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant={rejection ? "danger" : "quiet"}
                    icon={rejection ? <X size={17} /> : undefined}
                    onClick={() => setRejection(true)}
                  >
                    Reject
                  </Button>
                </div>
              )}
              {(showing === "limit" || (showing === "decision" && !rejection)) && (
                <Input
                  label={showing === "limit" ? "New limit" : "Starting limit"}
                  suffix="USDC"
                  inputMode="decimal"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  error={
                    invalidLimit
                      ? "Enter a limit above zero and no more than 10,000.00 USDC."
                      : undefined
                  }
                  hint="The change needs approval from 2 of the 3 team members."
                />
              )}
              {(showing === "vote" ||
                showing === "pause" ||
                (showing === "decision" && rejection)) && (
                <fieldset className="flex flex-col gap-12">
                  <legend className="mb-12 text-label font-medium">Why?</legend>
                  {(showing === "pause"
                    ? ["Late bill", "Report to check", "Other"]
                    : showing === "decision"
                      ? ["Documents do not match", "Too new", "Payment risk", "Other"]
                      : REASONS
                  ).map((r) => (
                    <label
                      key={r}
                      className="flex cursor-pointer items-center gap-10 rounded-row bg-ds-canvas p-12 text-label"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                      />
                      {r}
                    </label>
                  ))}
                </fieldset>
              )}
              {showing !== "pause" && (
                <label className="flex flex-col gap-8 text-label">
                  {showing === "decision" ? "Note for the company" : "Note for the team"}
                  <textarea
                    className="focus-ring min-h-100 rounded-row bg-ds-canvas p-16 text-body"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
              )}
              <p className="text-label text-ds-muted">
                {showing === "pause"
                  ? "The pause starts right away. Open trips keep going and drivers still get paid. Turning it back on needs 2 of 3 team members."
                  : showing === "vote"
                    ? "The change closes when 2 team members reject it. The assistant then waits 7 days before suggesting it again."
                    : showing === "decision" && rejection
                      ? "The company sees your reason after a real review is submitted."
                      : "The new limit goes live when 2 of the 3 team members approve it."}
              </p>
              <div className="flex justify-end gap-10">
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
              <p className="text-caption text-ds-muted">
                This is a local demo. No wallet request or company email is sent.
              </p>
            </>
          )}
        </ActionSheet>
      )}
    </RoleShell>
  );
}
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-8 py-8 text-label">
      <span className="text-ds-muted">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid min-h-240 place-content-center gap-12 text-center">
      <h2 className="text-heading">{title}</h2>
      <p className="mx-auto max-w-340 text-label text-ds-muted">{text}</p>
    </div>
  );
}
