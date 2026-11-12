"use client";
import { formatUsdc } from "@waybil/shared";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Check, SignOut, GasPump, Clock, SealCheck } from "@phosphor-icons/react";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Money } from "./Money";
import { ArrowUpRightGlyph, SystemGlyph } from "./icons";
import { cn } from "@/lib/cn";
import { USDC_CONTRACT } from "@/lib/env";
import { usdcBalance, view } from "@/lib/near";
import { callContract, disconnectWallet } from "@/lib/wallet";
import { useAuth } from "@/providers/AuthProvider";
import { Skeleton } from "./Skeleton";
export type DemoWalletState = "G1" | "G2" | "G3" | "G4" | "G5" | "X6" | "X7";

/*
 * When the sample account last got test USDC. The balance and the one hour wait both read
 * this one timestamp, so reopening the menu during the wait still shows the added money.
 * A copy in memory keeps the demo working when storage is blocked.
 */
const FAUCET_KEY = "waybil-demo-faucet-v1";
const FAUCET_WAIT_MS = 3600000;
let claimedInMemory = 0;
const claimListeners = new Set<() => void>();

function readClaim(): number {
  try {
    return Number(localStorage.getItem(FAUCET_KEY) ?? 0) || claimedInMemory;
  } catch {
    return claimedInMemory;
  }
}

function saveClaim(time: number) {
  claimedInMemory = time;
  try {
    localStorage.setItem(FAUCET_KEY, String(time));
  } catch {
    /* The local preview still works when storage is unavailable. */
  }
  claimListeners.forEach((listener) => listener());
}

function subscribeClaim(listener: () => void) {
  claimListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    claimListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function minutes(n: number) {
  if (n >= 60) {
    const hours = Math.round(n / 60);
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return n === 1 ? "1 minute" : `${n} minutes`;
}

/** The real USDC balance. `refresh` reads it again after a transaction. */
function useUsdcBalance(accountId: string | undefined) {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!accountId) return;
    let stale = false;
    usdcBalance(accountId)
      .then((value) => !stale && setBalance(BigInt(value)))
      .catch(() => !stale && setBalance(null));
    return () => {
      stale = true;
    };
  }, [accountId, version]);
  return { balance, refresh: () => setVersion((v) => v + 1) };
}
export function DemoWallet({
  initialState = "G1",
  role = "shipper",
  live,
  onClose,
}: {
  initialState?: DemoWalletState;
  role?: "shipper" | "investor" | "admin";
  /** The signed-in account. Without it the menu shows the sample account. */
  live?: { accountId: string; name: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const { signOut } = useAuth();
  const real = useUsdcBalance(live?.accountId);
  const [state, setState] = useState(initialState),
    [copied, setCopied] = useState(false),
    [retryMinutes, setRetryMinutes] = useState(48),
    [agoMinutes, setAgoMinutes] = useState(12);
  /* The server and the first render see no claim, so hydration always matches. */
  const claimedAt = useSyncExternalStore(subscribeClaim, readClaim, () => 0);
  const claimed = claimedAt > 0;
  const initialBalance = role === "investor" ? 3450000000n : role === "admin" ? 0n : 120000000n;
  const shownBalance = live
    ? (real.balance ?? 0n)
    : initialBalance + (claimed || state === "G4" ? 1000000000n : 0n);
  const account = live
    ? live.accountId
    : role === "investor"
      ? "maya-harper.testnet"
      : role === "admin"
        ? "risk.waybil.testnet"
        : "northwind-freight.testnet";
  useEffect(() => {
    if (live || state !== "G3" || initialState === "G3") return;
    const timer = window.setTimeout(() => {
      saveClaim(Date.now());
      setState("G4");
    }, 750);
    return () => window.clearTimeout(timer);
  }, [state, initialState]);
  async function claimLive(accountId: string) {
    try {
      const at = Number(
        BigInt(
          await view<string>("faucet_available_at", { account_id: accountId }, USDC_CONTRACT),
        ) / 1000000n,
      );
      if (at > Date.now()) {
        setRetryMinutes(Math.max(1, Math.ceil((at - Date.now()) / 60000)));
        setAgoMinutes(Math.floor((Date.now() - (at - 86400000)) / 60000));
        setState("G5");
        return;
      }
      setState("G3");
      await callContract(USDC_CONTRACT, "faucet", {});
      real.refresh();
      setState("G4");
    } catch (error) {
      setState(/reject|cancel|denied|closed/i.test(String(error)) ? "X6" : "X7");
    }
  }
  function claim() {
    if (live) return void claimLive(live.accountId);
    const since = Date.now() - readClaim();
    if (since < FAUCET_WAIT_MS) {
      setRetryMinutes(Math.max(1, Math.ceil((FAUCET_WAIT_MS - since) / 60000)));
      setAgoMinutes(Math.floor(since / 60000));
      setState("G5");
      return;
    }
    setState("G3");
  }
  if (state === "G1")
    return (
      <ActionSheet
        title="Account menu"
        onClose={onClose}
        appearance="wallet"
        hideHeader
        overlayClassName="md:bg-transparent"
        className="gap-16 md:top-100 md:right-40 md:bottom-auto md:left-auto md:w-380 md:translate-x-0 md:translate-y-0 md:gap-12 md:rounded-[24px] md:border md:border-ds-line md:p-16 md:shadow-lg"
      >
        <div className="flex items-center gap-12 p-4">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-8 gap-y-2 text-body font-medium">
              <span className="break-words">
                {live
                  ? live.name || live.accountId
                  : role === "investor"
                    ? "Maya Harper"
                    : role === "admin"
                      ? "Risk lead"
                      : "Northwind Freight Co."}
              </span>
              <Tag>{role === "admin" ? "Admin" : role === "investor" ? "Investor" : "Shipper"}</Tag>
            </p>
            <p className="mt-2 break-words text-[12.5px] leading-[1.45] text-ds-muted">{account}</p>
          </div>
          <button
            type="button"
            aria-label={copied ? "Address copied" : "Copy address"}
            className="press focus-ring grid size-32 shrink-0 place-items-center rounded-full text-ds-muted before:absolute before:-inset-6 hover:bg-ds-canvas hover:text-ds-ink"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(account);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <img
            src={`/illustrations/${role}-avatar.svg`}
            alt=""
            className="size-40 shrink-0 rounded-full"
          />
        </div>
        <div className="flex flex-col gap-4 rounded-[16px] bg-ds-canvas px-16 py-14">
          <p className="text-[12.5px] leading-[1.45] text-ds-muted">USDC</p>
          {/* Until the real balance arrives, a shimmer holds its place instead of a false 0.00. */}
          {live && real.balance === null ? (
            <span role="status" aria-busy="true" className="flex h-[26.4px] items-center">
              <Skeleton className="h-20 w-160 bg-ds-surface-3" />
              <span className="sr-only">Loading your USDC balance.</span>
            </span>
          ) : (
            <Money
              amount={String(shownBalance)}
              className="text-[22px] leading-[1.2] font-medium"
            />
          )}
          <p className="text-[11.5px] leading-[1.45] text-ds-muted">For bills and deposits</p>
        </div>
        <div className="h-1 bg-ds-line" />
        <button
          type="button"
          className="press focus-ring flex items-center gap-12 rounded-[14px] p-12 text-left hover:bg-ds-canvas"
          onClick={() => setState("G2")}
        >
          <span className="grid size-36 shrink-0 place-items-center rounded-full bg-ds-canvas">
            <Plus size={16} />
          </span>
          <span>
            <span className="block text-[14.5px] leading-[1.45] font-medium">Get test USDC</span>
            <span className="mt-2 block text-caption text-ds-muted">
              Free test money for the demo
            </span>
          </span>
        </button>
        <button
          type="button"
          className="press focus-ring flex items-center gap-12 rounded-[14px] p-12 text-left hover:bg-ds-canvas"
          onClick={async () => {
            onClose();
            if (live) {
              await signOut().catch(() => {});
              await disconnectWallet();
            }
            router.push("/start");
          }}
        >
          <span className="grid size-36 shrink-0 place-items-center rounded-full bg-ds-danger-result text-ds-danger">
            <SignOut size={16} />
          </span>
          <span className="text-[14.5px] font-medium text-ds-danger">Disconnect</span>
        </button>
        {!live && (
          <p className="text-caption text-ds-muted">
            This preview shows a sample account. No wallet is connected.
          </p>
        )}
      </ActionSheet>
    );
  return (
    <ActionSheet
      appearance="wallet"
      className={cn(
        "md:w-440",
        (state === "X6" || state === "X7") &&
          "right-8 bottom-8 left-8 rounded-[32px] md:rounded-card",
      )}
      stamp={state === "G4" ? <SealCheck size={34} /> : undefined}
      stampTone="brand"
      title={
        state === "G4"
          ? "1,000.00 test USDC added"
          : state === "X6"
            ? "You said no in your wallet"
            : state === "X7"
              ? "It didn’t go through"
              : "Get test USDC"
      }
      onClose={onClose}
    >
      {state === "G4" ? (
        <>
          <p className="text-[14px] leading-[1.45] text-ds-muted">
            Your {live ? "" : "sample "}balance is now {formatUsdc(shownBalance)} USDC. Test money
            has no real value.
          </p>
          <Button className="h-52 w-full justify-between" onClick={onClose}>
            Done
          </Button>
        </>
      ) : (
        <>
          <p className="text-[14px] leading-[1.45] text-ds-muted">
            {state === "X6"
              ? "Nothing was sent and no money moved. You can try again when you’re ready."
              : state === "X7"
                ? "The request failed. No money moved. Try again in a moment."
                : "Test money is for trying Waybil on the test network. It has no real value."}
          </p>
          {state !== "X6" && state !== "X7" && (
            <div className="flex items-center justify-between gap-12 rounded-[16px] bg-ds-canvas px-20 py-16">
              <p className="text-body text-ds-muted">You will get</p>
              <Money amount="1000000000" className="text-[17px] leading-[1.45] font-medium" />
            </div>
          )}
          {!live && (state === "G2" || state === "G3") && (
            <div className="flex items-center gap-10 rounded-[16px] border border-ds-line px-14 py-12">
              <GasPump size={16} className="shrink-0" />
              <p className="text-[13px] leading-[1.45]">
                There are no network fees. Waybil covers them for you.
              </p>
            </div>
          )}
          {state === "G5" && (
            <div className="flex items-start gap-10 rounded-[16px] bg-ds-brand-soft px-16 py-14">
              <Clock size={18} className="mt-1 shrink-0 text-ds-brand-deep" />
              <p className="text-[13.5px] leading-[1.45]">
                You got test USDC {agoMinutes < 1 ? "just now" : `${minutes(agoMinutes)} ago`}. You
                can get more in {minutes(retryMinutes)}.
              </p>
            </div>
          )}
          <Button
            className={cn(
              "h-52 w-full justify-between",
              state === "G5" &&
                "[&>span:last-child]:bg-ds-line-strong [&>span:last-child]:text-ds-bg",
            )}
            icon={
              state === "X6" || state === "X7" ? (
                <SystemGlyph name="retry" size={17} />
              ) : state === "G5" ? (
                <ArrowUpRightGlyph size={17} />
              ) : (
                <Plus size={17} />
              )
            }
            disabled={state === "G5"}
            loading={state === "G3"}
            loadingLabel="Waiting for wallet"
            onClick={claim}
          >
            {state === "X6" || state === "X7" ? "Try again" : "Get 1,000 test USDC"}
          </Button>
          {state === "G3" && (
            <p className="text-center text-[12.5px] leading-[1.45] text-ds-muted">
              {live
                ? "Approve it in your wallet."
                : "Approve it in your wallet. Waybil covers the network fees."}
            </p>
          )}
          {(state === "X6" || state === "X7") && (
            <p className="text-center text-[12.5px] leading-[1.45] text-ds-muted">
              {state === "X6"
                ? "Your wallet will ask you again."
                : "If it keeps failing, wait a few minutes."}
            </p>
          )}
          {!live && (
            <p className="text-caption text-ds-muted">
              This local demo changes no real balance and sends no wallet request.
            </p>
          )}
        </>
      )}
    </ActionSheet>
  );
}
