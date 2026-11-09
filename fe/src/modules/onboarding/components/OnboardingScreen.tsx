"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Truck,
  Check,
  Warning,
  CircleNotch,
  WifiSlash,
  Buildings,
  ChartPie,
  Clock,
  ArrowUpRight,
  ArrowCounterClockwise,
  ArrowRight,
  Envelope,
  House,
  PaperPlaneTilt,
  PencilSimple,
  Plus,
  Scan,
  UserPlus,
  X,
} from "@phosphor-icons/react";
import type { Role } from "@waybil/shared";
import { useOrigin } from "@/hooks/useOrigin";
import { Logo } from "@/components/layout/Logo";
import { RoleShell } from "@/components/layout/RoleShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { cn } from "@/lib/cn";
import {
  ONBOARDING_FIXTURES,
  SAMPLE_COMPANY,
  EMPTY_COMPANY,
  type OnboardingState,
  type CompanyDraft,
} from "../data/fixtures";
import { CompanySetup, CompanyDocuments } from "./CompanySetup";
import { DriverSetup } from "./DriverSetup";
export function OnboardingScreen({
  initialState = "A1",
  preview = false,
  inviteCode,
  onRetry,
}: {
  initialState?: OnboardingState;
  preview?: boolean;
  inviteCode?: string;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState),
    [role, setRole] = useState<Role | null>(ONBOARDING_FIXTURES[initialState].role),
    [understood, setUnderstood] = useState(initialState === "E2"),
    [copied, setCopied] = useState(false),
    [driverName, setDriverName] = useState("Sam Carter");
  const [company, setCompany] = useState<CompanyDraft>(() =>
    initialState === "C1" || initialState.startsWith("A") || initialState.startsWith("B")
      ? { ...EMPTY_COMPANY }
      : initialState === "C3"
        ? { ...SAMPLE_COMPANY, registration: "9120 0012 34", phone: "207 55" }
        : initialState === "C5"
          ? { ...SAMPLE_COMPANY, province: "", city: "" }
          : { ...SAMPLE_COMPANY },
  );
  const group = state[0],
    documents = ["C5.1", "C5.2", "C5.3", "C6"].includes(state),
    review = ["C7", "C8", "C9"].includes(state),
    isRole = group === "B",
    driverForm = group === "D" && state !== "D6",
    system = group === "X" && !["X6", "X7"].includes(state),
    wide = (group === "C" && !review) || isRole;
  const steps =
    group === "C"
      ? ["Role", "Details", "Documents", "Review"]
      : group === "E"
        ? ["Role", "Before you start", "Done"]
        : group === "D"
          ? ["Role", "Details", "Done"]
          : isRole
            ? ["Role", "Details", "Review"]
            : [];
  const step =
    group === "C"
      ? review
        ? 4
        : documents
          ? 3
          : 2
      : group === "D"
        ? state === "D6"
          ? 3
          : 2
        : group === "E"
          ? state === "E3"
            ? 3
            : 2
          : 1;
  useEffect(() => {
    if (preview || !["C6", "D5"].includes(state)) return;
    const timer = setTimeout(() => setState(state === "C6" ? "C7" : "D6"), 350);
    return () => clearTimeout(timer);
  }, [state, preview]);
  useEffect(() => {
    if (state !== "X4" || preview) return;
    const online = () => router.push("/start");
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [state, preview, router]);
  const dashboard = (path: string) => router.push(path);
  const actionClass = "w-full justify-between";
  const heading = (title: string, note?: string) => (
    <div className={cn("flex flex-col gap-12", group !== "C" && group !== "D" && "text-center")}>
      <h1 className="text-title md:text-[40px] md:leading-tight">{title}</h1>
      {note && <p className="text-label text-ds-muted">{note}</p>}
    </div>
  );
  const icon = (Icon: typeof Wallet, tone: "brand" | "soft" | "danger" = "brand") => (
    <span
      className={cn(
        "mx-auto grid size-80 shrink-0 place-content-center rounded-full",
        tone === "danger"
          ? "bg-ds-danger-soft text-ds-danger"
          : tone === "soft"
            ? "bg-ds-brand-soft text-ds-brand-deep"
            : "bg-ds-brand text-ds-ink",
      )}
    >
      <Icon size={32} />
    </span>
  );
  const shareLink = `${useOrigin()}/c/sam`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  if (group === "G" || state === "X6" || state === "X7")
    return (
      <RoleShell
        role="shipper"
        current="/shipper"
        walletPreview={state as "G1" | "G2" | "G3" | "G4" | "G5" | "X6" | "X7"}
      >
        <header>
          <h1 className="text-title">Good morning, Northwind</h1>
          <p className="mt-6 text-label text-ds-muted">Thursday, Nov 12</p>
        </header>
        <div aria-hidden className="mt-24 grid h-560 gap-16 lg:grid-cols-[1fr_400px]">
          <div className="rounded-card bg-ds-bg p-24">
            <div className="h-20 w-160 rounded-full bg-ds-canvas" />
            <div className="mt-24 h-300 rounded-card bg-ds-canvas" />
          </div>
          <div className="rounded-card bg-ds-bg p-24">
            <div className="h-20 w-160 rounded-full bg-ds-canvas" />
          </div>
        </div>
      </RoleShell>
    );
  return (
    <div className="flex min-h-dvh flex-col bg-ds-bg px-20 pt-20 pb-24 md:bg-ds-canvas md:px-40 md:pb-40">
      <header className="relative flex h-40 shrink-0 items-center justify-between gap-20">
        <Link href="/start" aria-label="Waybil sign in" className="focus-ring">
          <Logo />
        </Link>
        {steps.length > 0 && (
          <>
            <p className="text-caption text-ds-muted md:hidden">
              Step {step} of {steps.length}
            </p>
            <ol aria-label="Setup progress" className="hidden items-center gap-12 md:flex">
              {steps.map((label, index) => (
                <li
                  key={label}
                  aria-current={index + 1 === step ? "step" : undefined}
                  className="flex items-center gap-8 whitespace-nowrap text-label"
                >
                  <span
                    className={cn(
                      "grid size-28 place-content-center rounded-full border border-ds-line",
                      index + 1 < step
                        ? "bg-ds-ink text-ds-bg"
                        : index + 1 === step
                          ? "border-ds-brand bg-ds-brand"
                          : "bg-ds-bg text-ds-muted",
                    )}
                  >
                    {index + 1 < step ? <Check size={14} /> : index + 1}
                  </span>
                  {label}
                  {index < steps.length - 1 && <span className="mx-4 h-1 w-28 bg-ds-line" />}
                </li>
              ))}
            </ol>
            <span aria-hidden className="hidden w-76 shrink-0 md:block" />
          </>
        )}
      </header>
      <main
        className={cn(
          "mx-auto mt-28 flex w-full flex-1 flex-col gap-24",
          wide
            ? isRole
              ? "max-w-1040 md:justify-center"
              : "max-w-900 md:flex-none"
            : "max-w-520 md:justify-center",
          driverForm && "md:flex-none",
        )}
      >
        <div
          className={cn(
            "flex flex-1 flex-col gap-24 md:flex-none md:rounded-card md:bg-ds-bg md:p-40",
            isRole && "md:bg-transparent md:p-0",
            wide && !isRole && "md:gap-24",
            group === "A" && "justify-center",
            system && "justify-center",
          )}
        >
          {group === "A" ? (
            <>
              <div className="flex flex-1 flex-col justify-center gap-24 md:flex-none">
                {icon(
                  state === "A3" || state === "A4"
                    ? Warning
                    : state === "A5"
                      ? CircleNotch
                      : Wallet,
                  state === "A3" ? "danger" : state === "A4" ? "soft" : "brand",
                )}
                {heading(
                  state === "A1"
                    ? "Welcome to waybil"
                    : state === "A2"
                      ? "Check your wallet"
                      : state === "A3"
                        ? "Not connected"
                        : state === "A4"
                          ? "Switch to the test network"
                          : "One moment",
                  state === "A1"
                    ? "Shippers and investors connect a NEAR wallet. Drivers and warehouses continue with Google. You don’t need a password."
                    : state === "A2"
                      ? "Approve the connection in your wallet to continue."
                      : state === "A3"
                        ? "The request was declined in your wallet. Nothing was shared."
                        : state === "A4"
                          ? "Waybil runs on the test network. Switch networks to continue."
                          : "We are looking up your account.",
                )}
              </div>
              <div className="mt-auto flex flex-col gap-24 pt-24 md:mt-0 md:pt-0">
                {state === "A1" ? (
                  <>
                    <Button
                      icon={<Wallet size={17} />}
                      className={actionClass}
                      onClick={() => {
                        setRole(null);
                        setState("B1");
                      }}
                    >
                      Connect NEAR wallet
                    </Button>
                    <div className="flex items-center gap-12 text-caption text-ds-muted">
                      <span className="h-1 flex-1 bg-ds-line" />
                      or
                      <span className="h-1 flex-1 bg-ds-line" />
                    </div>
                    <Button
                      variant="secondary"
                      icon={<Envelope size={17} />}
                      className={actionClass}
                      onClick={() => {
                        setRole("driver");
                        setState("D1");
                      }}
                    >
                      Continue with Google
                    </Button>
                    <p className="text-center text-caption text-ds-muted">
                      Drivers and warehouses need no wallet and pay no fees.
                    </p>
                  </>
                ) : state === "A2" ? (
                  <Button
                    variant="secondary"
                    icon={<X size={17} />}
                    className={actionClass}
                    onClick={() => setState("A1")}
                  >
                    Cancel
                  </Button>
                ) : state === "A3" ? (
                  <>
                    <Button
                      icon={<ArrowCounterClockwise size={17} />}
                      className={actionClass}
                      onClick={() => setState("A1")}
                    >
                      Try again
                    </Button>
                    <Button variant="quiet" onClick={() => setState("A1")}>
                      Use a different wallet
                    </Button>
                  </>
                ) : state === "A4" ? (
                  <>
                    <Button className={actionClass} onClick={() => setState("B1")}>
                      Switch network
                    </Button>
                    <Button variant="quiet" onClick={() => setState("A1")}>
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <p role="status" className="text-center text-label text-ds-muted">
                    Checking your account
                  </p>
                )}
              </div>
            </>
          ) : isRole ? (
            <>
              {heading(
                "How will you use waybil?",
                "Pick one. Your account keeps this role, so next time you go straight to your dashboard.",
              )}
              <fieldset className="grid gap-12 md:grid-cols-3 md:gap-20">
                <legend className="sr-only">Choose your role</legend>
                {[
                  {
                    value: "shipper" as const,
                    title: "I ship goods",
                    note: "Approve trips before the truck leaves and pay at the due date. Your drivers get paid on arrival.",
                  },
                  {
                    value: "driver" as const,
                    title: "I own a truck",
                    note: "Confirm pickup, show a QR at the destination, and get paid the moment goods arrive.",
                  },
                  {
                    value: "investor" as const,
                    title: "I fund deliveries",
                    note: "Deposit USDC into the pool and earn when shipping companies pay their bills.",
                  },
                ].map((item) => (
                  <label
                    key={item.value}
                    className={cn(
                      "relative grid cursor-pointer grid-cols-[100px_1fr] items-center gap-12 rounded-card border bg-ds-bg p-10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ds-brand md:flex md:flex-col md:items-stretch md:p-16",
                      role === item.value
                        ? "border-ds-brand ring-1 ring-ds-brand"
                        : "border-ds-line",
                    )}
                  >
                    <img
                      src={`/illustrations/${item.value}.svg`}
                      alt=""
                      className="h-80 w-100 rounded-row bg-ds-canvas object-contain p-8 md:h-210 md:w-full md:p-24"
                    />
                    <div className="pr-20 md:p-8">
                      <h2 className="text-body font-medium md:text-heading">{item.title}</h2>
                      <p className="mt-6 text-caption text-ds-muted md:text-label">{item.note}</p>
                    </div>
                    <input
                      type="radio"
                      name="role"
                      value={item.value}
                      checked={role === item.value}
                      className="absolute top-1/2 right-12 size-20 accent-ds-brand md:top-28 md:right-28"
                      onChange={() => {
                        setRole(item.value);
                        setState(
                          item.value === "shipper" ? "B2" : item.value === "driver" ? "B3" : "B4",
                        );
                      }}
                    />
                  </label>
                ))}
              </fieldset>
              <div className="mt-auto flex flex-col gap-16 pt-24 md:mx-auto md:mt-0 md:w-360">
                <Button
                  className={actionClass}
                  disabled={!role}
                  onClick={() =>
                    setState(role === "shipper" ? "C1" : role === "driver" ? "D1" : "E1")
                  }
                >
                  {role ? `Continue as ${role}` : "Choose a role"}
                </Button>
                <p className="text-center text-caption text-ds-muted">
                  Receiving goods at a warehouse? Use the invite link you got.
                </p>
              </div>
            </>
          ) : group === "C" && !review ? (
            documents ? (
              <CompanyDocuments
                state={state}
                onBack={() => setState("C2")}
                onSubmit={() => setState("C6")}
              />
            ) : (
              <CompanySetup
                key={state === "C3" ? "errors" : "company"}
                state={state}
                draft={company}
                setDraft={setCompany}
                onContinue={() => setState("C5.1")}
              />
            )
          ) : driverForm ? (
            <DriverSetup
              state={state}
              onFinish={(name) => {
                setDriverName(name);
                setState("D5");
              }}
            />
          ) : group === "C" ? (
            <>
              {icon(
                state === "C8" ? Check : state === "C9" ? Warning : Clock,
                state === "C9" ? "soft" : "brand",
              )}
              {heading(
                state === "C8"
                  ? "You’re approved"
                  : state === "C9"
                    ? "We need one more thing"
                    : "We’re checking your company",
                state === "C8"
                  ? `${company.name} can now approve trips. Your drivers get paid early, up to your limit.`
                  : state === "C9"
                    ? "Your review is on hold until this is fixed."
                    : "This usually takes one business day. We will let your contact know when it is done.",
              )}
              {state === "C8" ? (
                <div className="rounded-card bg-ds-ink p-24 text-center text-ds-bg">
                  <p className="mb-12 text-label text-ds-line">Your credit limit</p>
                  <Money
                    amount={ONBOARDING_FIXTURES[state].shipper.limit}
                    className="text-amount"
                  />
                  <p className="mt-12 text-caption text-ds-brand">It grows as you pay on time.</p>
                </div>
              ) : state === "C9" ? (
                <p className="rounded-row bg-ds-warning-soft p-20 text-label">
                  The business registration number does not match the company name. Check the number
                  on your registration certificate and send it again.
                </p>
              ) : (
                <div className="rounded-row bg-ds-canvas p-20 text-label">
                  <Row label="Company" value={company.name} />
                  <Row label="Sent" value="Nov 11 · 14:31" />
                  <Row label="Status" value="In review" />
                  <DemoRecord title="Demo application receipt" />
                </div>
              )}
              <div className="mt-auto flex flex-col gap-12">
                {state === "C8" ? (
                  <>
                    <Button className={actionClass} onClick={() => dashboard("/shipper")}>
                      Go to dashboard
                    </Button>
                    <Button
                      variant="secondary"
                      icon={<UserPlus size={17} />}
                      onClick={() => dashboard("/shipper/network?invite=driver")}
                    >
                      Invite your first driver
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant={state === "C9" ? "primary" : "secondary"}
                      icon={state === "C9" ? undefined : <PencilSimple size={17} />}
                      className={actionClass}
                      onClick={() => setState("C2")}
                    >
                      {state === "C9" ? "Update details" : "Edit details"}
                    </Button>
                    {state === "C9" ? (
                      <a
                        className="link focus-ring text-center text-label"
                        href="https://wa.me/12075550142"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Talk to us on WhatsApp ↗
                      </a>
                    ) : (
                      <Button variant="quiet" onClick={() => setState("A1")}>
                        Log out
                      </Button>
                    )}
                  </>
                )}
              </div>
            </>
          ) : state === "D6" ? (
            <>
              {icon(Check)}
              {heading(
                "You’re ready to roll",
                `${driverName}, send your link to the shipping companies you work with. Once they connect, their trips show up here.`,
              )}
              <div className="flex items-center gap-12 rounded-row bg-ds-canvas p-16">
                <span className="min-w-0 flex-1 break-all text-label">{shareLink}</span>
                <Button variant="quiet" onClick={copy}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <ButtonLink
                icon={<PaperPlaneTilt size={17} />}
                className="justify-between"
                href={`https://wa.me/?text=${encodeURIComponent(`Connect with me on Waybil. ${shareLink}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                Share on WhatsApp
              </ButtonLink>
              <Button
                variant="quiet"
                onClick={() =>
                  inviteCode || initialState === "F1" ? setState("F2") : dashboard("/driver")
                }
              >
                {inviteCode || initialState === "F1" ? "Continue to invitation" : "Go to my trips"}
              </Button>
            </>
          ) : group === "E" ? (
            <>
              {icon(state === "E3" ? Check : ChartPie)}
              {heading(
                state === "E3" ? "You’re in" : "Before you deposit",
                state === "E3"
                  ? "Here’s how the pool is doing right now."
                  : "Here are three things worth knowing. It takes 30 seconds.",
              )}
              {state === "E3" ? (
                <>
                  <div className="rounded-row bg-ds-canvas p-20">
                    <Row label="Total in the pool" value={<Money amount="25000000000" />} />
                    <Row label="Paid out early" value={<Money amount="3294000000" />} />
                    <Row label="Missed payments" value="0 of 9 trips" />
                  </div>
                  <DemoRecord title="Demo investor setup" />
                  <Button
                    icon={<Plus size={17} />}
                    className={actionClass}
                    onClick={() => dashboard("/pool?deposit=on")}
                  >
                    Make your first deposit
                  </Button>
                  <Button variant="quiet" onClick={() => dashboard("/pool")}>
                    Look around first
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-20">
                    {[
                      {
                        Icon: Truck,
                        title: "Your money pays truck owners early",
                        note: "The pool earns 1.6% of each repaid bill. You receive your share of those earnings.",
                      },
                      {
                        Icon: Clock,
                        title: "Some bills get paid late",
                        note: "If a company pays late or does not pay, you could lose part of your money.",
                      },
                      {
                        Icon: ArrowUpRight,
                        title: "Withdraw anytime",
                        note: "The free part is paid now. The rest waits until bills are repaid.",
                      },
                    ].map((item) => (
                      <div key={item.title} className="flex gap-12">
                        <item.Icon className="mt-4 shrink-0" size={24} />
                        <div>
                          <h2 className="text-label font-medium">{item.title}</h2>
                          <p className="mt-6 text-label text-ds-muted">{item.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <label className="mt-auto flex items-center gap-12 rounded-row bg-ds-canvas p-16 text-label">
                    <input
                      type="checkbox"
                      className="size-20 accent-ds-brand"
                      checked={understood}
                      onChange={(e) => {
                        setUnderstood(e.target.checked);
                        setState(e.target.checked ? "E2" : "E1");
                      }}
                    />
                    I understand how the pool works
                  </label>
                  <Button
                    className={actionClass}
                    disabled={!understood}
                    onClick={() => setState("E3")}
                  >
                    {understood ? "Continue to the pool" : "Continue"}
                  </Button>
                </>
              )}
            </>
          ) : group === "F" ? (
            <>
              {icon(
                state === "F3" || state === "F6" ? Check : state === "F4" ? Warning : Buildings,
              )}
              {heading(
                state === "F3"
                  ? "You’re connected"
                  : state === "F4"
                    ? "This link has expired or was used"
                    : state === "F6"
                      ? "You’re all set"
                      : state === "F5"
                        ? "Receive goods for Northwind"
                        : "Northwind wants to work with you",
                state === "F3"
                  ? "Northwind can now send you trips. You will see them on your trips page."
                  : state === "F4"
                    ? "Ask Northwind to send you a new link. Links last 7 days and work once."
                    : state === "F6"
                      ? "When a truck arrives at Harbor Hub, scan the QR on the driver’s phone to confirm."
                      : state === "F5"
                        ? "You will confirm deliveries that arrive at this address."
                        : "Accept to get trips from them. You get paid the moment a delivery is confirmed.",
              )}
              {["F1", "F2", "F5"].includes(state) && (
                <div className="rounded-card border border-ds-line p-20">
                  <div className="mb-16 flex items-center gap-12">
                    <span className="grid size-40 place-content-center rounded-full bg-ds-canvas text-label">
                      NF
                    </span>
                    <div>
                      <p className="text-label font-medium">Northwind Freight Co.</p>
                      <p className="text-caption text-ds-success">Verified</p>
                    </div>
                  </div>
                  {state === "F5" ? (
                    <>
                      <Row label="Destination" value="Harbor Hub" />
                      <Row label="Address" value="9 Pier Street" />
                    </>
                  ) : (
                    <>
                      <Row label="Credit limit" value={<Money amount="3000000000" />} />
                      <Row label="Paid on time" value="100% · 9 trips" />
                      <Row label="You get" value="97.5% on arrival" />
                    </>
                  )}
                </div>
              )}
              <div className="mt-auto flex flex-col gap-12">
                {state === "F1" ? (
                  <Button
                    icon={<Envelope size={17} />}
                    className={actionClass}
                    onClick={() => setState("D1")}
                  >
                    Continue with Google
                  </Button>
                ) : state === "F2" ? (
                  <>
                    <Button className={actionClass} onClick={() => setState("F3")}>
                      Accept
                    </Button>
                    <Button variant="quiet" onClick={() => dashboard("/driver")}>
                      Not now
                    </Button>
                  </>
                ) : state === "F3" ? (
                  <>
                    <DemoRecord title="Demo invite acceptance" />
                    <Button className={actionClass} onClick={() => dashboard("/driver")}>
                      Go to my trips
                    </Button>
                  </>
                ) : state === "F4" ? (
                  <Button
                    variant="secondary"
                    icon={<ArrowRight size={17} />}
                    className={actionClass}
                    onClick={() => setState("A1")}
                  >
                    Go to Waybil
                  </Button>
                ) : state === "F5" ? (
                  <>
                    <Button
                      icon={<Envelope size={17} />}
                      className={actionClass}
                      onClick={() => setState("F6")}
                    >
                      Continue with Google
                    </Button>
                    <p className="text-center text-caption text-ds-muted">
                      You need no wallet, no app and no fees.
                    </p>
                  </>
                ) : (
                  <>
                    <DemoRecord title="Demo receiver setup" />
                    <Button
                      icon={<Scan size={17} />}
                      className={actionClass}
                      onClick={() => dashboard("/warehouse/scan")}
                    >
                      Open scanner
                    </Button>
                    <Button variant="quiet" onClick={() => dashboard("/warehouse")}>
                      I’ll do it later
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : system ? (
            <SystemContent
              state={state}
              onRetry={() => {
                if (onRetry) onRetry();
                else if (state === "X2" || state === "X4") window.location.reload();
                else setState("A1");
              }}
              onHome={() => dashboard("/start")}
            />
          ) : null}
        </div>
        <p className="mt-4 text-center text-caption text-ds-muted">
          This is a local demo. No sign-in, wallet connection or application is submitted.
        </p>
      </main>
    </div>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-8 py-10 text-label">
      <span className="text-ds-muted">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  );
}
function SystemContent({
  state,
  onRetry,
  onHome,
}: {
  state: OnboardingState;
  onRetry: () => void;
  onHome: () => void;
}) {
  const Icon = state === "X4" ? WifiSlash : Warning;
  const title =
    state === "X1"
      ? "Page not found"
      : state === "X2"
        ? "Something went wrong"
        : state === "X3"
          ? "You can’t open this page"
          : state === "X4"
            ? "You’re offline"
            : "You were signed out";
  const note =
    state === "X1"
      ? "This page does not exist or has moved. Check the link or go back home."
      : state === "X2"
        ? "We could not load this page. Try again in a moment."
        : state === "X3"
          ? "This page is for the Waybil team. If you are on the team, switch to your team wallet."
          : state === "X4"
            ? "Check your signal. Waybil opens the page when you are back online."
            : "Your session ended. Sign in again to continue.";
  return (
    <>
      <span
        className={cn(
          "mx-auto grid size-80 place-content-center rounded-full",
          state === "X2"
            ? "bg-ds-danger-soft text-ds-danger"
            : "bg-ds-brand-soft text-ds-brand-deep",
        )}
      >
        <Icon size={32} />
      </span>
      <div className="text-center">
        <h1 className="text-title md:text-[40px] md:leading-tight">{title}</h1>
        <p className="mt-12 text-label text-ds-muted">{note}</p>
      </div>
      <div className="mt-auto flex flex-col gap-12 md:mt-0">
        <Button
          icon={
            state === "X1" || state === "X3" ? (
              <House size={17} />
            ) : state === "X5" ? (
              <ArrowRight size={17} />
            ) : (
              <ArrowCounterClockwise size={17} />
            )
          }
          className="justify-between"
          onClick={state === "X1" || state === "X3" ? onHome : onRetry}
        >
          {state === "X1" || state === "X3"
            ? "Go home"
            : state === "X5"
              ? "Continue with Google"
              : "Try again"}
        </Button>
        <Button
          variant="quiet"
          onClick={
            state === "X1"
              ? () => {
                  if (window.history.length > 1) window.history.back();
                  else onHome();
                }
              : onHome
          }
        >
          {state === "X1" ? "Go back" : "Go home"}
        </Button>
      </div>
    </>
  );
}
