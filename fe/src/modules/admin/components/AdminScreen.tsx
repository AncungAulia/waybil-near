"use client";
import { useState } from "react";
import { parseUsdc, formatUsdc } from "@waybil/shared";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Scales } from "@phosphor-icons/react";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { cn } from "@/lib/cn";
import { BackLink } from "@/components/elements/BackLink";
import { Segmented } from "@/components/ui/Segmented";
import { ADMIN_FIXTURES, activeCompanyFor, type AdminState } from "../data/fixtures";
import { Empty } from "./AdminParts";
import { TeamPanel } from "./demo/TeamPanel";
import { RecentPanel } from "./demo/RecentPanel";
import { ProposalPanel } from "./demo/ProposalPanel";
import { ActiveList } from "./demo/ActiveList";
import { Applications } from "./demo/Applications";
import { ApplicationDetail } from "./demo/ApplicationDetail";
import { ActiveShipper } from "./demo/ActiveShipper";
import { PoolAlerts, PoolContent } from "./demo/PoolContent";
import { AdminSheet, type AdminModal } from "./demo/AdminSheet";
import "./admin.css";

/* The shared pieces moved to AdminParts. They stay exported here for older imports. */
export { AdminBadge, AdminTiles, Empty, Fact } from "./AdminParts";

/** The 23 gallery states (M1 to M3). Every transition stays in this component's memory. */
export function AdminScreen({
  initialState = "M1.1",
  account = "northwind-freight.testnet",
}: {
  initialState?: AdminState;
  account?: string;
  preview?: boolean;
}) {
  const [state, setState] = useState(initialState),
    [modal, setModal] = useState<AdminModal | null>(null),
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
  const activeCompany = activeCompanyFor(account);
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
  const company = coast ? "Coastline Freight" : "Meridian Shipping";
  function rejectProposal(second: boolean) {
    setSelected(second ? "Meridian Shipping" : "Northwind Freight");
    setReason("");
    setNote("");
    setModal("vote");
  }
  function approveProposal(second: boolean) {
    if (second) {
      setMeridianVote("approved");
      setReceipt("Demo approval vote");
    } else {
      setState("M1.2");
      setReceipt("Demo limit approval");
    }
  }
  function confirmSheet() {
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
  }

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
                      <ProposalPanel
                        name="Raise Northwind’s limit"
                        state={state}
                        meridianVote={meridianVote}
                        note={note}
                        onReject={() => rejectProposal(false)}
                        onApprove={() => approveProposal(false)}
                      />
                      <ProposalPanel
                        name="Start Meridian Shipping"
                        second
                        state={state}
                        meridianVote={meridianVote}
                        note={note}
                        onReject={() => rejectProposal(true)}
                        onApprove={() => approveProposal(true)}
                      />
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-24">
                  <TeamPanel state={state} />
                  <RecentPanel state={state} />
                </div>
              </div>
            ) : group === "M3" ? (
              <>
                <PoolAlerts state={state} />
                <PoolContent state={state} pool={fixture.pool} />
              </>
            ) : activeDetail ? (
              <ActiveShipper
                account={account}
                activeCompany={activeCompany}
                paused={paused}
                onPause={() => {
                  setReason("");
                  setModal("pause");
                }}
                onChangeLimit={() => {
                  setLimit("4000");
                  setReason("");
                  setNote("");
                  setModal("limit");
                }}
              />
            ) : applicationDetail ? (
              <ApplicationDetail
                coast={coast}
                onOpenDocument={(name) => {
                  setDocument(name);
                  setModal("document");
                }}
                onDecide={() => decide(company)}
              />
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
                    <Applications
                      state={state}
                      applicationRejected={applicationRejected}
                      requestedCompany={requestedCompany}
                      requestedLimit={requestedLimit}
                      onDecide={decide}
                    />
                  </div>
                  <div className={cn(tab !== "Active" && "hidden lg:block")}>
                    <ActiveList state={state} />
                  </div>
                </div>
              </>
            )}
          </>
          <p className="text-center text-caption text-ds-muted">
            This demo uses sample data. No real votes or changes are sent.
          </p>
        </div>
        {showing && (
          <AdminSheet
            showing={showing}
            selected={selected}
            document={document}
            rejection={rejection}
            onRejection={setRejection}
            reason={reason}
            onReason={setReason}
            note={note}
            onNote={setNote}
            limit={limit}
            onLimit={setLimit}
            invalidLimit={invalidLimit}
            onClose={close}
            onConfirm={confirmSheet}
          />
        )}
      </RoleShell>
    </div>
  );
}
