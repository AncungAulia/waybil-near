"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { formatUsdc } from "@waybil/shared";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { Money } from "./Money";
import { DemoRecord } from "./DemoRecord";
export type DemoWalletState = "G1" | "G2" | "G3" | "G4" | "G5" | "X6" | "X7";
export function DemoWallet({
  initialState = "G1",
  role = "shipper",
  onClose,
}: {
  initialState?: DemoWalletState;
  role?: "shipper" | "investor" | "admin";
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState),
    [copied, setCopied] = useState(false),
    [claimed, setClaimed] = useState(false),
    [retryMinutes, setRetryMinutes] = useState(48);
  const initialBalance = role === "investor" ? 3450000000n : role === "admin" ? 0n : 120000000n;
  const shownBalance = initialBalance + (claimed || state === "G4" ? 1000000000n : 0n);
  const account =
    role === "investor"
      ? "maya-harper.testnet"
      : role === "admin"
        ? "risk.waybil.testnet"
        : "northwind-freight.testnet";
  function claim() {
    let last = 0;
    try {
      last = Number(localStorage.getItem("waybil-demo-faucet-v1") ?? 0);
    } catch {
      /* The local demo can still be viewed when storage is unavailable. */
    }
    if (Date.now() - last < 3600000) {
      setRetryMinutes(Math.ceil((3600000 - (Date.now() - last)) / 60000));
      setState("G5");
      return;
    }
    try {
      localStorage.setItem("waybil-demo-faucet-v1", String(Date.now()));
    } catch {
      /* No transaction is sent by this preview. */
    }
    setClaimed(true);
    setState("G4");
  }
  if (state === "G1")
    return (
      <Dialog.Root
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed top-88 right-16 left-16 z-50 flex flex-col gap-16 rounded-card border border-ds-line bg-ds-bg p-20 shadow-lg md:top-100 md:right-40 md:left-auto md:w-380"
          >
            <div className="flex items-center justify-between">
              <div>
                <Dialog.Title className="text-heading">
                  {role === "investor"
                    ? "Maya Harper"
                    : role === "admin"
                      ? "Risk lead"
                      : "Northwind Freight Co."}
                </Dialog.Title>
                <p className="break-all text-caption text-ds-muted">{account}</p>
              </div>
              <button
                aria-label="Close"
                className="press focus-ring rounded-full p-8"
                onClick={onClose}
              >
                <X size={18} />
              </button>
            </div>
            <div className="rounded-row bg-ds-canvas p-16">
              <p className="text-label">USDC</p>
              <Money amount={String(shownBalance)} className="text-amount" />
              <p className="text-caption text-ds-muted">For bills and deposits</p>
            </div>
            <Button
              variant="quiet"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(account);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy address"}
            </Button>
            <Button onClick={() => setState("G2")}>Get test USDC</Button>
            <Button
              variant="quiet"
              onClick={() => {
                onClose();
                router.push("/start");
              }}
            >
              Disconnect
            </Button>
            <p className="text-caption text-ds-muted">
              This preview shows a sample account. No wallet is connected.
            </p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  return (
    <ActionSheet
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
          <p className="text-label">
            Your sample balance is now {formatUsdc(shownBalance)} USDC. Test money has no real
            value.
          </p>
          <DemoRecord title="Demo test USDC receipt" />
          <Button className="justify-between" onClick={onClose}>
            Done
          </Button>
        </>
      ) : (
        <>
          <p className="text-label text-ds-muted">
            {state === "X6"
              ? "Nothing was sent and no money moved. You can try again when you’re ready."
              : state === "X7"
                ? "The request failed. No money moved. Try again in a moment."
                : "Test money is for trying Waybil on the test network. It has no real value."}
          </p>
          <div className="rounded-row bg-ds-canvas p-20">
            <p className="mb-8 text-caption text-ds-muted">You will get</p>
            <Money amount="1000000000" className="text-amount" />
          </div>
          {state === "G5" && (
            <p className="rounded-row bg-ds-warning-soft p-16 text-label">
              You can get test USDC once an hour. Try again in {retryMinutes} minutes.
            </p>
          )}
          <Button
            className="justify-between"
            disabled={state === "G5"}
            loading={state === "G3"}
            loadingLabel="Waiting for wallet"
            onClick={claim}
          >
            {state === "X6" || state === "X7" ? "Try again" : "Get 1,000 test USDC"}
          </Button>
          <p className="text-caption text-ds-muted">
            This local demo changes no real balance and sends no wallet request.
          </p>
        </>
      )}
    </ActionSheet>
  );
}
