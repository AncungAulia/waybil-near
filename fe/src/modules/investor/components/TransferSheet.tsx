import { formatUsdc } from "@waybil/shared";
import { ArrowUpRight, Check, CircleNotch, Info, SealCheck, Wallet } from "@phosphor-icons/react";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Money } from "@/components/elements/Money";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { ProofLink } from "@/components/elements/ProofLink";
import { cn } from "@/lib/cn";
import type { DemoPoolBalance } from "../data/demo";
import { POOL_PERCENT } from "../data/pool";

export interface TransferReceipt {
  amount: string;
  paid: string;
  queued: string;
  tx?: string;
}

/* The deposit and withdraw sheet (I2), from the amount through to the result. */
export function TransferSheet({
  deposit,
  success,
  live,
  waiting,
  amount,
  onAmount,
  error,
  units,
  paid,
  queued,
  ceiling,
  balance,
  walletShort,
  receipt,
  txError,
  settledValue,
  settledShare,
  onClose,
  onSubmit,
  onQuick,
  onRisks,
}: {
  deposit: boolean;
  success: boolean;
  live: boolean;
  waiting: boolean;
  amount: string;
  onAmount: (amount: string) => void;
  error: string | undefined;
  units: bigint;
  paid: bigint;
  queued: bigint;
  ceiling: bigint;
  balance: DemoPoolBalance;
  walletShort: boolean;
  receipt: TransferReceipt | null;
  txError: string | null;
  settledValue: string;
  settledShare: number;
  onClose: () => void;
  onSubmit: () => void;
  onQuick: (percent: number) => void;
  onRisks: () => void;
}) {
  return (
    <ActionSheet
      title={
        success ? (deposit ? "Deposit received" : "Withdrawn") : deposit ? "Deposit" : "Withdraw"
      }
      stamp={success ? <SealCheck size={34} /> : undefined}
      stampTone="brand"
      onClose={onClose}
    >
      {success ? (
        <>
          <Money amount={receipt?.amount ?? "1000000000"} className="text-amount" />
          <p className="text-label text-ds-muted">
            {deposit
              ? "It starts paying truck owners on the next delivery."
              : live
                ? "The available part is on its way to your wallet."
                : "The available part was sent in this local demo."}
          </p>
          {BigInt(receipt?.queued ?? "0") > 0n && (
            <p className="rounded-row bg-ds-warning-soft p-16 text-label">
              {formatUsdc(BigInt(receipt!.paid))} USDC is available now.{" "}
              {formatUsdc(BigInt(receipt!.queued))} USDC is waiting for bills to be paid.
            </p>
          )}
          {receipt?.tx ? (
            <ProofLink tx={receipt.tx} />
          ) : (
            <DemoRecord title={deposit ? "Demo deposit receipt" : "Demo withdrawal receipt"} />
          )}
          <div className="w-full rounded-row bg-ds-canvas p-16 text-label">
            <div className="flex justify-between gap-12 py-4">
              <span className="text-ds-muted">Your money in the pool</span>
              <Money amount={settledValue} />
            </div>
            <div className="flex justify-between gap-12 py-4">
              <span className="text-ds-muted">Your share</span>
              <span>{settledShare}%</span>
            </div>
          </div>
          <Button icon={<ArrowUpRight size={17} />} className="w-full" onClick={onClose}>
            Done
          </Button>
        </>
      ) : (
        <>
          <Input
            label="Amount"
            suffix="USDC"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmount(e.target.value)}
            error={error}
            disabled={waiting}
          />
          {/* Small grey chips, the size the board draws them, not full buttons. */}
          <div className="flex flex-wrap gap-8">
            {[25, 50, 100].map((n) => (
              <button
                key={n}
                type="button"
                disabled={waiting}
                onClick={() => onQuick(n)}
                className="tap focus-ring rounded-full bg-ds-canvas px-12 py-6 text-caption hover:bg-ds-canvas-hover disabled:text-ds-off-ink"
              >
                {n === 100 ? (deposit ? "Max" : "Max now") : `${n}%`}
              </button>
            ))}
          </div>
          {waiting ? (
            <div className="flex flex-col gap-10">
              {[
                {
                  title: deposit ? "Allow the deposit" : "Allow the withdrawal",
                  note: "Done in your wallet",
                  done: true,
                },
                {
                  title: `Send ${formatUsdc(units)} USDC`,
                  note: "Approve it in your wallet",
                  done: false,
                },
              ].map((step) => (
                <div
                  key={step.title}
                  className={cn(
                    "flex items-center gap-12 rounded-row p-14",
                    step.done ? "bg-ds-canvas" : "bg-ds-brand-soft",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-26 shrink-0 place-items-center rounded-full",
                      step.done ? "bg-ds-ink text-ds-bg" : "bg-ds-brand text-ds-ink",
                    )}
                  >
                    {step.done ? (
                      <Check size={14} weight="bold" />
                    ) : (
                      <CircleNotch size={14} className="animate-spin motion-reduce:animate-none" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-label">{step.title}</span>
                    <span className="block text-caption text-ds-muted">{step.note}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="text-label text-ds-muted">
                {deposit
                  ? `Your money pays truck owners early. The pool earns ${POOL_PERCENT} of each bill, and you get your share.`
                  : queued > 0n
                    ? `Only ${formatUsdc(paid)} USDC is free right now. The rest is paying truck owners.`
                    : `You can withdraw up to ${formatUsdc(ceiling < BigInt(balance.cash) ? ceiling : BigInt(balance.cash))} USDC right now.`}
              </p>
              {queued > 0n ? (
                <div className="flex gap-12 rounded-row bg-ds-brand-soft p-16">
                  <Info size={18} className="shrink-0 text-ds-brand-deep" />
                  <p className="text-label">
                    You get {formatUsdc(paid)} USDC now. The other {formatUsdc(queued)} USDC comes
                    to you on its own as bills are paid.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-12 rounded-row border border-ds-line p-14">
                  <Wallet size={18} className="shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-label">
                      {deposit ? "From your wallet" : "To your wallet"}
                    </span>
                    <span
                      className={cn(
                        "block text-caption",
                        deposit && walletShort ? "text-ds-danger" : "text-ds-muted",
                      )}
                    >
                      {deposit
                        ? `${formatUsdc(BigInt(balance.wallet))} USDC available`
                        : "Arrives in under a second"}
                    </span>
                  </span>
                </div>
              )}
            </>
          )}
          {txError && (
            <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
              {txError}
            </p>
          )}
          <Button
            disabled={!!error || units <= 0n}
            loading={waiting}
            loadingLabel="Waiting for wallet"
            onClick={onSubmit}
          >
            {error || units <= 0n
              ? deposit
                ? "Deposit"
                : "Withdraw"
              : `${deposit ? "Deposit" : "Withdraw"} ${formatUsdc(units)} USDC`}
          </Button>
          {deposit && !waiting && (
            <button className="link focus-ring text-caption" onClick={onRisks}>
              How the pool works and its risks
            </button>
          )}
          {(waiting || !live) && (
            <p className="text-caption text-ds-muted">
              {waiting
                ? "Two quick approvals. The first one only happens once."
                : "This is a local demo. No wallet request is sent."}
            </p>
          )}
        </>
      )}
    </ActionSheet>
  );
}

export function RisksSheet({ onClose }: { onClose: () => void }) {
  return (
    <ActionSheet title="How the pool works" onClose={onClose}>
      <p className="text-label">
        Your money pays drivers after a warehouse confirms delivery. Companies repay their bills
        later.
      </p>
      <p className="text-label">
        Returns depend on repayments. Missed bills can reduce the value of your share. Withdrawals
        can wait while money is lent out. The reserve may not cover every loss.
      </p>
      <Button onClick={onClose}>I understand</Button>
    </ActionSheet>
  );
}
