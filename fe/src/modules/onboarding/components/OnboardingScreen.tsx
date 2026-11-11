"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  ArrowCounterClockwise,
  ArrowRight,
  PaperPlaneTilt,
  PencilSimple,
  Plus,
  Scan,
  UserPlus,
  CaretDown,
  Hourglass,
  SealCheck,
  FileMagnifyingGlass,
  WarningCircle,
  LinkSimple,
  ArrowLineDown,
  Handshake,
  X,
} from "@phosphor-icons/react";
import { FEE_BPS, type Role } from "@waybil/shared";
import { useOrigin } from "@/hooks/useOrigin";
import { Logo } from "@/components/layout/Logo";
import { RoleShell } from "@/components/layout/RoleShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { Avatar } from "@/components/elements/Avatar";
import {
  CircleXGlyph,
  LoaderGlyph,
  LinkOffGlyph,
  MailGlyph,
  SwapGlyph,
  SystemGlyph,
  WalletGlyph,
} from "@/components/elements/icons";
import { cn } from "@/lib/cn";
import { BASE_POOL } from "@/lib/demo-pool";
import { api, ApiError } from "@/lib/api";
import { LIVE } from "@/lib/env";
import { connectWallet, disconnectWallet, walletSignIn } from "@/lib/wallet";
import { getShipper } from "@/lib/near";
import type { Application, ApplicationResponse } from "@waybil/shared";
import { fromCompanyInput, LIVE_STATE, saveApplication, sendPapers } from "../data/application";
import { useAuth } from "@/providers/AuthProvider";
import {
  ONBOARDING_FIXTURES,
  SAMPLE_COMPANY,
  EMPTY_COMPANY,
  type OnboardingState,
  type CompanyDraft,
} from "../data/fixtures";
import {
  CompanySetup,
  CompanyDocuments,
  initialCompanyFiles,
  type CompanyFiles,
} from "./CompanySetup";
import { DriverSetup } from "./DriverSetup";
/* Shares of each bill from the shared fee split, for example "1.6%" and "97.5%". */
const POOL_PERCENT = `${Number(FEE_BPS.pool) / 100}%`;
const DRIVER_PERCENT = `${Number(FEE_BPS.driver) / 100}%`;
/* Drivers and warehouses use Google. Shippers and investors use a NEAR wallet. */
const WALLET_ROLES = [
  {
    value: "shipper" as const,
    title: "I ship goods",
    note: "Approve trips before the truck leaves and pay at the due date. Your drivers get paid on arrival.",
  },
  {
    value: "investor" as const,
    title: "I fund deliveries",
    note: "Deposit USDC into the pool and earn when shipping companies pay their bills.",
  },
];
/* Where each role lands after sign-in. */
const HOME: Partial<Record<Role, string>> = {
  shipper: "/shipper",
  investor: "/pool",
  admin: "/admin",
  driver: "/driver",
  warehouse: "/warehouse",
};
const GOOGLE_ROLES = [
  {
    value: "driver" as const,
    title: "I own a truck",
    note: "Confirm pickup, show a QR at the destination, and get paid the moment goods arrive.",
  },
  {
    value: "warehouse" as const,
    title: "I receive goods",
    note: "Scan the driver's QR when a truck arrives to confirm the delivery.",
  },
];
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
    /* B3 is the Google path with a truck owner chosen. Every other B state is the wallet path. */
    [google, setGoogle] = useState(initialState === "B3"),
    [files, setFiles] = useState<CompanyFiles>(() => initialCompanyFiles(initialState));
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
    connect = group === "A",
    centeredConnect = state === "A2" || state === "A5",
    documents = ["C5.1", "C5.2", "C5.3", "C6"].includes(state),
    review = ["C7", "C8", "C9"].includes(state),
    isRole = group === "B",
    driverForm = group === "D" && state !== "D6",
    driverReady = state === "D6",
    investor = group === "E",
    investorReady = state === "E3",
    invite = group === "F",
    inviteResult = ["F3", "F4", "F6"].includes(state),
    setup = ["A", "B", "C", "D", "E", "F", "X"].includes(group),
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
    if (preview || !["C6", "D5"].includes(state) || (LIVE && state === "C6")) return;
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

  /*
   * Live wallet sign-in (#82). A new account has no role yet, so the server answers
   * E_ROLE_REQUIRED, B1 asks for one, and the wallet signs a second challenge with it.
   */
  const { signIn, profile } = useAuth();

  /*
   * Live shipper application (#84). It loads the shipper's application once, saves the
   * details, uploads the papers, submits, and shows the real review state.
   */
  const liveCompany = LIVE && !preview && profile?.role === "shipper";
  const [application, setApplication] = useState<Application | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [startLimit, setStartLimit] = useState<string | null>(null);
  const loadedApplication = useRef(false);
  useEffect(() => {
    if (!liveCompany || group !== "C" || loadedApplication.current) return;
    loadedApplication.current = true;
    api<ApplicationResponse | null>("/applications/me")
      .then((found) => {
        if (!found) return;
        setApplication(found.application);
        setCompany(fromCompanyInput(found.application.company));
        setState(LIVE_STATE[found.application.state]);
      })
      .catch((e: unknown) => setApplicationError(e instanceof ApiError ? e.message : null));
  }, [liveCompany, group]);
  useEffect(() => {
    if (!liveCompany || state !== "C8" || !profile) return;
    getShipper(profile.accountId)
      .then((s) => setStartLimit(s?.limit ?? null))
      .catch(() => setStartLimit(null));
  }, [liveCompany, state, profile]);
  async function saveDetails() {
    setApplicationError(null);
    try {
      setApplication(await saveApplication(application, company));
      setState("C5.1");
    } catch (e) {
      setApplicationError(e instanceof ApiError ? e.message : "Your details could not be saved.");
    }
  }
  async function submitPapers() {
    if (!application) return;
    setApplicationError(null);
    setState("C6");
    try {
      setApplication(await sendPapers(application.id, files));
      setState("C7");
    } catch (e) {
      setApplicationError(e instanceof ApiError ? e.message : "Your papers could not be sent.");
      setState("C5.2");
    }
  }
  const [signInError, setSignInError] = useState<string | null>(null);
  const pending = useRef<Awaited<ReturnType<typeof connectWallet>> | null>(null);
  /* Cancel on A2 abandons the attempt that is still waiting on the wallet. */
  const attempt = useRef(0);
  async function walletFlow(role?: "shipper" | "investor") {
    const id = ++attempt.current;
    setSignInError(null);
    setState("A2");
    try {
      pending.current ??= await connectWallet();
      const { wallet, accountId } = pending.current;
      const session = await walletSignIn(wallet, accountId, role);
      if (id !== attempt.current) return;
      signIn(session);
      pending.current = null;
      if (role) setState(role === "shipper" ? "C1" : "E1");
      else dashboard(HOME[session.profile.role] ?? "/start");
    } catch (error) {
      if (id !== attempt.current) return;
      if (error instanceof ApiError && error.code === "E_ROLE_REQUIRED") {
        setRole(null);
        setGoogle(false);
        setState("B1");
        return;
      }
      setSignInError(
        !(error instanceof ApiError)
          ? null
          : error.status === 403
            ? "This account signs in with Google. Go back and continue with Google instead."
            : error.status === 401
              ? "Your sign-in request expired. Try again to get a new one."
              : error.message,
      );
      setState("A3");
    }
  }
  async function switchWallet() {
    attempt.current++;
    pending.current = null;
    await disconnectWallet();
    setState("A1");
  }
  const actionClass = cn("w-full justify-between", connect && "h-52");
  const heading = (title: string, note?: string) => (
    <div
      className={cn(
        "flex flex-col gap-12",
        ((!investor && !invite && group !== "C" && group !== "D") ||
          review ||
          driverReady ||
          investorReady ||
          inviteResult) &&
          "text-center",
        (connect || isRole || review || driverReady || investor || invite) && "gap-10",
      )}
    >
      <h1
        className={cn(
          "text-title md:text-[40px] md:leading-tight",
          (connect || isRole || review || driverReady || investor || invite) &&
            "text-[30px] leading-[1.1] tracking-[-0.03em] md:leading-[1.1]",
        )}
      >
        {connect && (state === "A2" || state === "A4") ? (
          <>
            {state === "A2" ? "Check your" : "Switch to the"}
            <br className={state === "A2" ? "md:hidden" : ""} />
            {state === "A2" ? (
              <>
                <span className="hidden md:inline"> </span>wallet
              </>
            ) : (
              "test network"
            )}
          </>
        ) : invite && ["F1", "F2", "F4", "F5"].includes(state) ? (
          <span className="flex flex-col gap-8">
            <span>
              {state === "F5" ? "Receive goods" : state === "F4" ? "This link" : "Northwind wants"}
            </span>
            <span>
              {state === "F5"
                ? "for Northwind"
                : state === "F4"
                  ? "has expired or was used"
                  : "to work with you"}
            </span>
          </span>
        ) : investor && !investorReady ? (
          <>
            Before you
            <br className="md:hidden" />
            <span className="hidden md:inline"> </span>deposit
          </>
        ) : driverReady ? (
          <>
            You're
            <br className="md:hidden" />
            <span className="hidden md:inline"> </span>ready to roll
          </>
        ) : state === "C7" ? (
          <span className="flex flex-col gap-8">
            <span>We're checking</span>
            <span>your company</span>
          </span>
        ) : state === "C9" ? (
          <>
            We need
            <br className="md:hidden" />
            <span className="hidden md:inline"> </span>one more thing
          </>
        ) : isRole ? (
          <>
            How will you
            <br className="md:hidden" />
            <span className="hidden md:inline"> </span>use waybil?
          </>
        ) : (
          title
        )}
      </h1>
      {note && (
        <p
          className={cn(
            "text-label text-ds-muted",
            (connect || isRole || review || driverReady || investor || invite) &&
              "text-[14px] leading-[1.45] font-normal md:text-[15px]",
          )}
        >
          {isRole ? (
            <>
              <span className="md:hidden">
                Pick one. You can't change it later with the same account.
              </span>
              <span className="hidden md:inline">{note}</span>
            </>
          ) : (
            note
          )}
        </p>
      )}
    </div>
  );
  const icon = (
    Icon: (props: { size?: number }) => React.ReactNode,
    tone: "brand" | "soft" | "danger" | "quiet" = "brand",
  ) => (
    <span
      className={cn(
        "mx-auto grid size-80 shrink-0 place-content-center rounded-full",
        tone === "danger"
          ? connect
            ? "bg-ds-danger-result text-ds-danger"
            : "bg-ds-danger-soft text-ds-danger"
          : tone === "soft"
            ? "bg-ds-brand-soft text-ds-brand-deep"
            : tone === "quiet"
              ? "bg-ds-canvas text-ds-ink"
              : "bg-ds-brand text-ds-ink",
      )}
    >
      <Icon size={34} />
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
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-ds-bg px-20 pt-20 pb-24 md:bg-ds-canvas md:px-40 md:pb-40",
        setup && "px-16 pt-12 md:px-32 md:pt-20 md:pb-32 lg:px-40 lg:pb-40",
      )}
    >
      <header
        className={cn(
          "relative flex h-40 shrink-0 items-center justify-between gap-20",
          setup && "h-auto min-h-56 px-4 py-8 md:px-8",
        )}
      >
        <Link href="/start" aria-label="Waybil sign in" className="focus-ring">
          {setup ? (
            <span className="flex items-center gap-12">
              <Image
                src="/brand/waybil-symbol.svg"
                alt=""
                width={37}
                height={32}
                className="h-32 w-37"
                loading="eager"
              />
              <span className="text-[34px] leading-[1.2] font-semibold tracking-[-0.8px]">
                waybil
              </span>
            </span>
          ) : (
            <Logo />
          )}
        </Link>
        {state === "A4" && (
          <div
            role="status"
            className="flex shrink-0 items-center gap-10 rounded-full border border-ds-line bg-ds-bg py-5 pr-14 pl-5"
          >
            <span className="grid size-32 place-items-center rounded-full bg-ds-brand text-caption font-medium">
              !
            </span>
            <span className="flex flex-col">
              <span className="text-label font-semibold">Connected</span>
              <span className="text-caption text-ds-danger">Wrong network</span>
            </span>
            {/* The caret is dropped on the smallest phones so the pill fits beside the logo. */}
            <CaretDown size={16} className="text-ds-muted max-[359px]:hidden" />
          </div>
        )}
        {steps.length > 0 && (
          <>
            <p className={cn("text-caption text-ds-muted md:hidden", setup && "text-label")}>
              Step {step} of {steps.length}
            </p>
            <ol
              aria-label="Setup progress"
              className={cn("hidden items-center gap-12 md:flex", setup && "gap-10")}
            >
              {steps.map((label, index) => (
                <li
                  key={label}
                  aria-current={index + 1 === step ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-8 whitespace-nowrap text-label",
                    setup && "text-[14px]",
                    setup &&
                      (index + 1 === step
                        ? "font-semibold"
                        : investor && index + 1 < step
                          ? "text-ds-ink"
                          : "text-ds-muted"),
                  )}
                >
                  <span
                    className={cn(
                      "grid size-28 place-content-center rounded-full border border-ds-line",
                      setup &&
                        "size-26 border-[1.5px] border-ds-line-strong text-[13px] font-semibold",
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
                  {index < steps.length - 1 && (
                    <span
                      className={cn(
                        "mx-4 h-1 w-28 bg-ds-line",
                        setup && "mx-2 h-2 rounded-full bg-ds-muted/40",
                      )}
                    />
                  )}
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
          connect &&
            "mt-20 max-w-none gap-0 md:mt-24 md:max-w-none md:items-center md:justify-center",
          centeredConnect && "justify-center",
          isRole && "mt-20 gap-0 md:mt-24 md:max-w-620 lg:max-w-1040",
          group === "C" && "mt-20 md:mt-24",
          review && "gap-0 md:max-w-560 lg:max-w-520",
          group === "D" && "mt-20 gap-0 md:mt-24 md:max-w-560 lg:max-w-520",
          driverForm && "lg:mt-48",
          investor && "mt-20 gap-0 md:mt-24 md:max-w-560 lg:max-w-520",
          invite && "mt-20 gap-0 md:mt-24 md:max-w-560 lg:max-w-520",
          system && "mt-20 gap-0 md:mt-24 md:max-w-560 lg:max-w-520",
        )}
      >
        <div
          className={cn(
            "flex flex-1 flex-col gap-24 md:flex-none md:rounded-card md:bg-ds-bg md:p-40",
            isRole && "gap-16 px-4 md:gap-28 md:bg-transparent md:px-4 md:py-0",
            wide && !isRole && "md:gap-24",
            group === "A" && "justify-center",
            system && "justify-center",
            connect && "gap-20 px-4 md:w-560 md:gap-24 md:rounded-[32px] md:p-40 lg:w-520",
            connect && (centeredConnect ? "flex-none" : "justify-start"),
            group === "C" && !review && "gap-18 px-4 md:gap-20 md:rounded-[32px] md:p-32 lg:p-40",
            review &&
              "gap-20 px-4 [&>span:first-child]:mt-auto md:gap-24 md:rounded-[32px] md:p-40 md:[&>span:first-child]:mt-0",
            group === "D" && "gap-20 px-4 md:gap-24 md:rounded-[32px] md:p-40",
            investor && "gap-20 px-4 md:gap-24 md:rounded-[32px] md:p-40",
            invite && "gap-20 px-4 md:gap-24 md:rounded-[32px] md:p-40",
            inviteResult && "[&>span:first-child]:mt-auto md:[&>span:first-child]:mt-0",
            system &&
              "gap-20 px-4 [&>span:first-child]:mt-auto md:gap-24 md:rounded-[32px] md:p-40 md:[&>span:first-child]:mt-0",
          )}
        >
          {group === "A" ? (
            <>
              <div
                className={cn(
                  "flex flex-1 flex-col justify-center gap-20 md:flex-none md:gap-24",
                  centeredConnect && "flex-none",
                )}
              >
                {/* Each A state carries the glyph and circle design/waybil.pen draws. */}
                {icon(
                  state === "A3"
                    ? CircleXGlyph
                    : state === "A4"
                      ? SwapGlyph
                      : state === "A2" || state === "A5"
                        ? LoaderGlyph
                        : WalletGlyph,
                  state === "A3"
                    ? "danger"
                    : state === "A4"
                      ? "soft"
                      : state === "A2" || state === "A5"
                        ? "quiet"
                        : "brand",
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
                    ? "Shippers and investors connect a NEAR wallet. Drivers and warehouses continue with Google. You don't need a password."
                    : state === "A2"
                      ? "Approve the connection in your wallet to continue."
                      : state === "A3"
                        ? (signInError ??
                          "The request was declined in your wallet. Nothing was shared.")
                        : state === "A4"
                          ? "Your wallet is on the main network. Waybil runs on the test network for now. One tap switches it."
                          : "Looking up your account.",
                )}
              </div>
              <div className="flex flex-col gap-20 md:gap-24">
                {state === "A1" ? (
                  <>
                    <Button
                      icon={<WalletGlyph size={17} />}
                      className={actionClass}
                      onClick={() => {
                        if (LIVE) return void walletFlow();
                        setRole(null);
                        setGoogle(false);
                        setState("B1");
                      }}
                    >
                      Connect NEAR wallet
                    </Button>
                    <div className="flex items-center gap-12 text-[13px] leading-normal text-ds-muted">
                      <span className="h-1 flex-1 bg-ds-line" />
                      or
                      <span className="h-1 flex-1 bg-ds-line" />
                    </div>
                    <Button
                      variant="secondary"
                      icon={<MailGlyph size={17} />}
                      className={cn(actionClass, "h-48")}
                      onClick={() => {
                        setRole(null);
                        setGoogle(true);
                        setState("B1");
                      }}
                    >
                      Continue with Google
                    </Button>
                    <p className="text-center text-label text-ds-muted">
                      Drivers and warehouses need no wallet and pay no fees.
                    </p>
                  </>
                ) : state === "A2" ? (
                  <Button
                    variant="secondary"
                    icon={<X size={17} />}
                    className={actionClass}
                    onClick={() => {
                      attempt.current++;
                      setState("A1");
                    }}
                  >
                    Cancel
                  </Button>
                ) : state === "A3" ? (
                  <>
                    <Button
                      icon={<ArrowCounterClockwise size={17} />}
                      className={actionClass}
                      onClick={() => (LIVE ? void walletFlow() : setState("A1"))}
                    >
                      Try again
                    </Button>
                    <Button
                      variant="quiet"
                      className="w-full justify-center"
                      onClick={() => (LIVE ? void switchWallet() : setState("A1"))}
                    >
                      Use a different wallet
                    </Button>
                  </>
                ) : state === "A4" ? (
                  <>
                    <Button className={actionClass} onClick={() => setState("B1")}>
                      Switch network
                    </Button>
                    <Button
                      variant="quiet"
                      className="w-full justify-center"
                      onClick={() => setState("A1")}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <div
                    role="status"
                    aria-label="Checking your account"
                    className="flex flex-col items-center gap-10"
                  >
                    <span className="h-12 w-full rounded-[6px] bg-ds-surface-3" />
                    <span className="h-12 w-220 max-w-full rounded-[6px] bg-ds-surface-3" />
                    <span className="h-12 w-160 max-w-full rounded-[6px] bg-ds-surface-3" />
                  </div>
                )}
              </div>
            </>
          ) : isRole ? (
            <>
              {heading(
                "How will you use waybil?",
                "Pick one. Your account keeps this role, so next time you go straight to your dashboard.",
              )}
              <fieldset className="grid w-full gap-10 md:gap-14 lg:mx-auto lg:max-w-680 lg:grid-cols-2 lg:gap-20">
                <legend className="sr-only">Choose your role</legend>
                {(google ? GOOGLE_ROLES : WALLET_ROLES).map((item) => (
                  <label
                    key={item.value}
                    className={cn(
                      "relative grid cursor-pointer grid-cols-[108px_minmax(0,1fr)_22px] items-center gap-12 rounded-[22px] border p-10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ds-brand md:grid-cols-[136px_minmax(0,1fr)_22px] md:gap-18 md:rounded-[26px] md:p-14 lg:flex lg:flex-col lg:items-stretch lg:gap-14 lg:rounded-card lg:px-16 lg:pt-16 lg:pb-28",
                      role === item.value
                        ? "border-ds-ink bg-ds-ink text-ds-bg"
                        : "border-ds-line bg-ds-bg text-ds-ink",
                    )}
                  >
                    <div
                      className={cn(
                        "h-80 w-108 overflow-hidden rounded-[14px] md:h-102 md:w-136 lg:h-210 lg:w-full lg:rounded-row",
                        role === item.value ? "bg-ds-bg" : "bg-ds-canvas",
                      )}
                    >
                      <img
                        src={`/illustrations/${item.value}.svg`}
                        alt=""
                        className={cn(
                          "h-full w-full object-contain",
                          role !== item.value && "mix-blend-multiply",
                        )}
                      />
                    </div>
                    <div className="min-w-0 lg:px-8 lg:pt-4">
                      <h2 className="text-[17px] font-medium tracking-[-0.4px] md:text-[20px] lg:text-[24px] lg:tracking-[-0.6px]">
                        {item.title}
                      </h2>
                      <p
                        className={cn(
                          "mt-4 text-[12.5px] leading-[1.45] md:text-[13.5px] lg:mt-8 lg:text-[14px]",
                          role === item.value ? "text-ds-role-selected-muted" : "text-ds-muted",
                        )}
                      >
                        {item.note}
                      </p>
                    </div>
                    <input
                      type="radio"
                      name="role"
                      value={item.value}
                      checked={role === item.value}
                      aria-label={item.title}
                      className="peer sr-only"
                      onChange={() => {
                        setRole(item.value);
                        setState(
                          item.value === "shipper" ? "B2" : item.value === "investor" ? "B4" : "B3",
                        );
                      }}
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-22 shrink-0 place-items-center rounded-full border-[1.5px] lg:absolute lg:top-28 lg:right-28",
                        role === item.value
                          ? "border-ds-brand bg-ds-brand text-ds-ink"
                          : "border-ds-line-strong bg-ds-bg",
                      )}
                    >
                      {role === item.value && <Check size={14} weight="bold" />}
                    </span>
                  </label>
                ))}
              </fieldset>
              <div className="mt-auto flex w-full flex-col gap-14 md:mx-auto md:mt-0 lg:w-360">
                <Button
                  className={cn(actionClass, "h-52")}
                  disabled={!role}
                  onClick={() =>
                    LIVE && pending.current && (role === "shipper" || role === "investor")
                      ? void walletFlow(role)
                      : setState(
                          role === "shipper"
                            ? "C1"
                            : role === "driver"
                              ? "D1"
                              : role === "warehouse"
                                ? "F5"
                                : "E1",
                        )
                  }
                >
                  {role === "warehouse"
                    ? "Open the sample invite"
                    : role
                      ? `Continue as ${role}`
                      : "Choose a role"}
                </Button>
                <p className="text-center text-[12.5px] leading-[1.45] text-ds-muted">
                  {!google
                    ? "Do you own a truck or receive goods? Go back and continue with Google."
                    : role === "warehouse"
                      ? "Warehouses join from the invite link a shipping company sends. This demo opens a sample invite from Northwind."
                      : "Receiving goods at a warehouse? You can also open the invite link you got."}
                </p>
              </div>
            </>
          ) : group === "C" && !review ? (
            <>
              {liveCompany && applicationError && (
                <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
                  {applicationError}
                </p>
              )}
              {documents ? (
                <CompanyDocuments
                  state={state}
                  files={files}
                  setFiles={setFiles}
                  onBack={() => setState("C2")}
                  onSubmit={() => (liveCompany ? void submitPapers() : setState("C6"))}
                />
              ) : (
                <CompanySetup
                  key={state === "C3" ? "errors" : "company"}
                  state={state}
                  draft={company}
                  setDraft={setCompany}
                  onContinue={() => (liveCompany ? void saveDetails() : setState("C5.1"))}
                />
              )}
            </>
          ) : driverForm ? (
            <DriverSetup
              state={state}
              onFinish={() => {
                setState("D5");
              }}
            />
          ) : group === "C" ? (
            <>
              {icon(
                state === "C8" ? SealCheck : state === "C9" ? FileMagnifyingGlass : Hourglass,
                state === "C9" ? "soft" : state === "C7" ? "quiet" : "brand",
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
                    ? liveCompany && application?.state === "rejected"
                      ? "The team did not approve your company this time."
                      : "Your review is on hold until this is fixed."
                    : `This usually takes one business day. We'll message ${company.contact.split(" ")[0]} on WhatsApp when it's done.`,
              )}
              {state === "C8" ? (
                <div className="bill-card flex flex-col items-center gap-6 overflow-hidden rounded-[22px] bg-ds-ink px-22 py-20 text-center text-ds-bg">
                  <p className="text-label text-ds-role-selected-muted">Your credit limit</p>
                  <Money
                    amount={
                      liveCompany && startLimit
                        ? startLimit
                        : ONBOARDING_FIXTURES[state].shipper.limit
                    }
                    className="text-[34px] leading-[1.1] font-medium tracking-[-0.035em] md:text-[40px]"
                  />
                  <p className="text-[12.5px] leading-[1.45] text-ds-brand">
                    It grows as you pay on time.
                  </p>
                </div>
              ) : state === "C9" ? (
                <div className="flex items-start gap-10 rounded-[16px] bg-ds-brand-soft px-16 py-14">
                  <WarningCircle size={18} className="mt-1 shrink-0 text-ds-brand-deep" />
                  <p className="text-[13.5px] leading-[1.45]">
                    {liveCompany && application?.rejection
                      ? application.rejection.note ||
                        `The reason was ${application.rejection.reason.replaceAll("_", " ")}.`
                      : liveCompany
                        ? "The team asked for more papers. Update your details and send them again."
                        : "The business registration number doesn't match the company name. Check the number on your registration certificate and send it again."}
                  </p>
                </div>
              ) : (
                <div className="rounded-row bg-ds-canvas px-18 py-4 [&>div]:py-9 [&>div]:text-[14px] [&>div>span:last-child]:font-medium [&>div+div]:border-t [&>div+div]:border-ds-line">
                  <Row label="Company" value={company.name} />
                  <Row
                    label="Sent"
                    value={
                      liveCompany && application
                        ? new Date(application.updatedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hourCycle: "h23",
                          })
                        : "Nov 11 · 14:31"
                    }
                  />
                  <Row label="Status" value="In review" />
                </div>
              )}
              <div className="mt-auto flex flex-col gap-20 md:mt-0 md:gap-24">
                {state === "C8" ? (
                  <>
                    <Button
                      className={cn(actionClass, "h-52")}
                      onClick={() => dashboard("/shipper")}
                    >
                      Go to dashboard
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-52 w-full justify-between"
                      icon={<UserPlus size={17} />}
                      onClick={() => dashboard("/shipper/network?invite=driver")}
                    >
                      Invite your first driver
                    </Button>
                  </>
                ) : (
                  <>
                    {/* The backend only takes edits in draft or needs_more, not in review. */}
                    {!(liveCompany && application?.state === "in_review") && (
                      <Button
                        variant={state === "C9" ? "primary" : "secondary"}
                        icon={state === "C9" ? undefined : <PencilSimple size={17} />}
                        className={cn(actionClass, "h-52")}
                        onClick={() => {
                          /* A rejected company applies again with a new application. */
                          if (liveCompany && application?.state === "rejected")
                            setApplication(null);
                          setState("C2");
                        }}
                      >
                        {state === "C9" ? "Update details" : "Edit details"}
                      </Button>
                    )}
                    {state === "C9" ? (
                      <a
                        className="press focus-ring flex h-48 items-center justify-center rounded-full bg-ds-canvas px-18 text-body font-medium text-ds-ink hover:bg-ds-surface-3"
                        href="https://wa.me/12075550142"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Talk to us on WhatsApp ↗
                      </a>
                    ) : (
                      <Button
                        variant="quiet"
                        className="w-full justify-center"
                        onClick={() => setState("A1")}
                      >
                        Log out
                      </Button>
                    )}
                  </>
                )}
              </div>
            </>
          ) : state === "D6" ? (
            <>
              <div className="mx-auto mt-auto h-210 w-280 max-w-full shrink-0 overflow-hidden rounded-row bg-ds-canvas md:mt-0">
                <img
                  src="/illustrations/driver.svg"
                  alt=""
                  className="h-full w-full object-contain mix-blend-multiply"
                />
              </div>
              {heading(
                "You’re ready to roll",
                "Send your link to the shipping companies you work with. Once they connect, their trips show up here.",
              )}
              <div className="flex items-center gap-10 rounded-[16px] bg-ds-canvas px-16 py-14">
                <LinkSimple size={16} className="shrink-0" />
                <span className="min-w-0 flex-1 break-all text-[14px] leading-[1.45]">
                  {shareLink.replace(/^https?:\/\//, "")}
                </span>
                <button
                  type="button"
                  className="link focus-visible:outline-ds-ink shrink-0 rounded-full text-label font-semibold"
                  onClick={copy}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="mt-auto flex flex-col gap-20 md:mt-0 md:gap-24">
                <ButtonLink
                  icon={<PaperPlaneTilt size={17} />}
                  className="h-52 w-full justify-between"
                  href={`https://wa.me/?text=${encodeURIComponent(`Connect with me on Waybil. ${shareLink}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Share on WhatsApp
                </ButtonLink>
                <Button
                  variant="quiet"
                  className="w-full justify-center"
                  onClick={() =>
                    inviteCode || initialState === "F1" ? setState("F2") : dashboard("/driver")
                  }
                >
                  {inviteCode || initialState === "F1"
                    ? "Continue to invitation"
                    : "Go to my trips"}
                </Button>
              </div>
            </>
          ) : group === "E" ? (
            <>
              {investorReady && (
                <div className="mx-auto mt-auto h-210 w-280 max-w-full shrink-0 overflow-hidden rounded-row bg-ds-canvas md:mt-0">
                  <img
                    src="/illustrations/investor.svg"
                    alt=""
                    className="h-full w-full object-contain mix-blend-multiply"
                  />
                </div>
              )}
              {heading(
                state === "E3" ? "You’re in" : "Before you deposit",
                state === "E3"
                  ? "Here’s how the pool is doing right now."
                  : "Here are three things worth knowing. It takes 30 seconds.",
              )}
              {state === "E3" ? (
                <>
                  <div className="rounded-row bg-ds-canvas px-18 py-4 [&>div]:py-9 [&>div]:text-[14px] [&>div>span:last-child]:font-medium [&>div+div]:border-t [&>div+div]:border-ds-line">
                    <Row
                      label="Total in the pool"
                      value={<Money amount={BASE_POOL.total_shares} />}
                    />
                    <Row label="Paid out early" value={<Money amount={BASE_POOL.lent} />} />
                    <Row label="Missed payments" value="0 of 9 trips" />
                  </div>
                  <div className="mt-auto flex flex-col gap-20 md:mt-0 md:gap-24">
                    <Button
                      icon={<Plus size={17} />}
                      className={cn(actionClass, "h-52")}
                      onClick={() => dashboard("/pool?deposit=on")}
                    >
                      Make your first deposit
                    </Button>
                    <Button
                      variant="quiet"
                      className="w-full justify-center"
                      onClick={() => dashboard("/pool")}
                    >
                      Look around first
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-10">
                    {[
                      {
                        Icon: ArrowLineDown,
                        title: "Your money pays truck owners early",
                        note: `The pool earns ${POOL_PERCENT} of each repaid bill. You receive your share of those earnings.`,
                      },
                      {
                        Icon: Hourglass,
                        title: "Some bills get paid late",
                        note: "If a company pays late or does not pay, you could lose part of your money.",
                      },
                      {
                        Icon: WalletGlyph,
                        title: "Withdraw anytime",
                        note: "The free part is paid now. The rest waits until bills are repaid.",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="flex items-start gap-14 rounded-[18px] bg-ds-canvas p-16"
                      >
                        <span className="grid size-36 shrink-0 place-items-center rounded-full bg-ds-bg">
                          <item.Icon size={17} />
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-body font-medium">{item.title}</h2>
                          <p className="mt-3 text-[13px] leading-[1.45] text-ds-muted">
                            {item.note}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <label className="flex cursor-pointer items-center gap-12 p-4 text-body">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={understood}
                      onChange={(e) => {
                        setUnderstood(e.target.checked);
                        setState(e.target.checked ? "E2" : "E1");
                      }}
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-22 shrink-0 place-items-center rounded-[7px] border-[1.5px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ds-ink",
                        understood
                          ? "border-ds-ink bg-ds-ink text-ds-bg"
                          : "border-ds-line-strong bg-ds-bg",
                      )}
                    >
                      {understood && <Check size={14} weight="bold" />}
                    </span>
                    I understand how the pool works
                  </label>
                  <Button
                    className={cn(actionClass, "mt-auto h-52 shrink-0 md:mt-0")}
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
              {state === "F3" && icon(Handshake)}
              {state === "F4" && icon(LinkOffGlyph, "quiet")}
              {state === "F6" && (
                <div className="mx-auto mt-auto h-210 w-280 max-w-full shrink-0 overflow-hidden rounded-row bg-ds-canvas md:mt-0">
                  <img
                    src="/illustrations/warehouse-invite.svg"
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
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
                    ? "Ask Northwind to send you a new link. It only takes them a few seconds."
                    : state === "F6"
                      ? "When a truck arrives at Harbor Hub, scan the QR on the driver’s phone to confirm."
                      : state === "F5"
                        ? "You will confirm deliveries that arrive at this address."
                        : "Accept to get trips from them. You get paid the moment a delivery is confirmed.",
              )}
              {["F1", "F2", "F5"].includes(state) && (
                <div className="flex flex-col gap-12 rounded-[22px] bg-ds-canvas p-20">
                  <div className="flex items-center gap-12">
                    <Avatar name="Northwind Freight Co." />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] leading-[1.45] font-medium">
                        Northwind Freight Co.
                      </p>
                      <p className="mt-2 text-[12.5px] leading-[1.45] text-ds-muted">
                        {state === "F5"
                          ? "You are invited to receive goods."
                          : "Shipping company · Eastport"}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-4 rounded-full bg-ds-success-soft px-10 py-4 text-caption font-medium text-ds-success">
                      <SealCheck size={13} />
                      Verified
                    </span>
                  </div>
                  <div className="[&>div]:py-9 [&>div]:text-[14px] [&>div>span:last-child]:max-w-[70%] [&>div>span:last-child]:text-right [&>div>span:last-child]:font-medium [&>div+div]:border-t [&>div+div]:border-ds-line">
                    {state === "F5" ? (
                      <>
                        <Row label="Destination" value="Harbor Hub" />
                        <Row label="Address" value="9 Pier Street" />
                      </>
                    ) : (
                      <>
                        <Row label="Credit limit" value={<Money amount="3000000000" />} />
                        <Row label="Paid on time" value="100% · 9 trips" />
                        <Row label="Payout" value={`You get ${DRIVER_PERCENT} on arrival.`} />
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-auto flex flex-col gap-20 md:mt-0 md:gap-24 [&>button:not([data-quiet])]:h-52">
                {state === "F1" ? (
                  <>
                    <Button
                      icon={<MailGlyph size={17} />}
                      className={actionClass}
                      onClick={() => setState("D1")}
                    >
                      Continue with Google
                    </Button>
                    <p className="text-center text-[13px] leading-[1.45] text-ds-muted md:text-left">
                      Are you new to Waybil? Setup takes about a minute.
                    </p>
                  </>
                ) : state === "F2" ? (
                  <>
                    <Button className={actionClass} onClick={() => setState("F3")}>
                      Accept
                    </Button>
                    <Button
                      data-quiet
                      variant="quiet"
                      className="w-full justify-center"
                      onClick={() => dashboard("/driver")}
                    >
                      Not now
                    </Button>
                  </>
                ) : state === "F3" ? (
                  <>
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
                      icon={<MailGlyph size={17} />}
                      className={actionClass}
                      onClick={() => setState("F6")}
                    >
                      Continue with Google
                    </Button>
                    <p className="text-center text-[13px] leading-[1.45] font-medium text-ds-muted">
                      You need no wallet, no app and no fees. Waybil covers the network cost.
                    </p>
                  </>
                ) : (
                  <>
                    <Button
                      icon={<Scan size={17} />}
                      className={actionClass}
                      onClick={() => dashboard("/warehouse/scan")}
                    >
                      Open scanner
                    </Button>
                    <Button
                      data-quiet
                      variant="quiet"
                      className="w-full justify-center"
                      onClick={() => dashboard("/warehouse")}
                    >
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
        {/* Live wallet sign-in is real, so the demo note stays off the sign-in steps. */}
        {!(LIVE && (group === "A" || group === "B")) && (
          <p className="mt-4 text-center text-caption text-ds-muted">
            This is a local demo. No sign-in, wallet connection or application is submitted.
          </p>
        )}
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
  const glyph =
    state === "X1"
      ? "compass"
      : state === "X2"
        ? "cloud-off"
        : state === "X3"
          ? "lock"
          : state === "X4"
            ? "wifi-off"
            : "log-out";
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
            ? "bg-ds-danger-result text-ds-danger"
            : "bg-ds-brand-soft text-ds-brand-deep",
        )}
      >
        <SystemGlyph name={glyph} size={34} />
      </span>
      <div className="text-center">
        <h1 className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[40px]">
          {title}
        </h1>
        <p className="mt-10 text-[14px] leading-[1.45] text-ds-muted md:text-[15px]">{note}</p>
      </div>
      <div className="mt-auto flex flex-col gap-20 md:mt-0 md:gap-24">
        <Button
          icon={
            state === "X1" || state === "X3" ? (
              <SystemGlyph name="house" size={17} />
            ) : state === "X5" ? (
              <ArrowRight size={17} />
            ) : (
              <SystemGlyph name="retry" size={17} />
            )
          }
          className="h-52 w-full justify-between"
          onClick={state === "X1" || state === "X3" ? onHome : onRetry}
        >
          {state === "X1" || state === "X3"
            ? "Go home"
            : state === "X5"
              ? "Continue with Google"
              : "Try again"}
        </Button>
        {state !== "X4" && state !== "X5" && (
          <Button
            variant="quiet"
            className="w-full justify-center"
            onClick={
              state === "X1"
                ? () => {
                    if (window.history.length > 1) window.history.back();
                    else onHome();
                  }
                : onHome
            }
          >
            {state === "X1" ? "Go back" : state === "X3" ? "Use a different wallet" : "Go home"}
          </Button>
        )}
      </div>
    </>
  );
}
