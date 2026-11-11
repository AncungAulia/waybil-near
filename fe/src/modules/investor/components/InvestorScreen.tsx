"use client";
import { useState } from "react";
import { formatUsdc, parseUsdc } from "@waybil/shared";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { LIVE, USDC_CONTRACT, WAYBIL_CONTRACT } from "@/lib/env";
import { callContract, ensureUsdcStorage } from "@/lib/wallet";
import { useAuth } from "@/providers/AuthProvider";
import { useLivePool } from "../hooks/useLivePool";
import { saveDemoPool, useDemoPool } from "../hooks/useDemoPool";
import { toBalance } from "../data/live";
import { LiveDeliveries, LiveDelivery, LiveHistory } from "./LivePool";
import { INVESTOR_FIXTURES, type InvestorState } from "../data/fixtures";
import { changePoolBalance, INITIAL_BALANCE, type DemoPoolBalance } from "../data/demo";
import { PoolHome } from "./PoolHome";
import { DemoHistory } from "./DemoHistory";
import { DemoDeliveries } from "./DemoDeliveries";
import { DeliveryDetails } from "./DeliveryDetails";
import { RisksSheet, TransferSheet, type TransferReceipt } from "./TransferSheet";
/* Deposit and withdraw both send USDC on, so they get room for the token's callback. */
const TX_GAS = "100000000000000";
const EMPTY_BALANCE: DemoPoolBalance = {
  value: "0",
  wallet: "0",
  cash: "0",
  total: "0",
  queued: "0",
};
const wallError = (error: unknown) =>
  /reject|cancel|denied|closed/i.test(String(error))
    ? "You said no in your wallet. Nothing was sent."
    : "It didn’t go through. No money moved. Try again in a moment.";
export function InvestorScreen({
  initialState = "I1.1",
  preview = false,
  shipmentId = 1041,
}: {
  initialState?: InvestorState;
  preview?: boolean;
  shipmentId?: number;
}) {
  const [state, setState] = useState(initialState),
    [amount, setAmount] = useState(
      initialState === "I2.3" || initialState === "I2.6" ? "5000" : "1000",
    ),
    [filter, setFilter] = useState("All"),
    [risks, setRisks] = useState(false),
    [receipt, setReceipt] = useState<TransferReceipt | null>(null),
    [pending, setPending] = useState(false),
    [txError, setTxError] = useState<string | null>(null);
  const saved = useDemoPool();
  /* The live path reads testnet for the signed-in investor. The gallery keeps its fixtures. */
  const { profile } = useAuth();
  const live = LIVE && !preview && profile?.role === "investor" ? profile : null;
  const { data, failed, refresh } = useLivePool(live?.accountId);
  const fixture = INVESTOR_FIXTURES[initialState];
  const [previewBalance, setPreviewBalance] = useState<DemoPoolBalance | null>(null);
  const balance = live
    ? data
      ? toBalance(data)
      : EMPTY_BALANCE
    : preview
      ? (previewBalance ?? {
          ...INITIAL_BALANCE,
          value: fixture.investor.value,
          cash: fixture.pool.cash,
        })
      : saved;
  const busy = live
    ? BigInt(balance.value) > 0n && BigInt(balance.cash) < BigInt(balance.value)
    : state === "I1.3" || state === "I2.6";
  const firstVisit = live ? data?.shares === 0n : state === "I1.2";
  const name = live ? live.name.split(" ")[0] || live.accountId : "Maya";
  const lent = BigInt(balance.total) - BigInt(balance.cash);
  const utilization = Number((lent * 10000n) / (BigInt(balance.total) || 1n)) / 10000;
  const share =
    BigInt(balance.total) > 0n ? Number((BigInt(balance.value) * 100n) / BigInt(balance.total)) : 0;
  const current = state.startsWith("I3")
    ? state === "I3.3"
      ? "/pool/history"
      : "/pool/deliveries"
    : "/pool";
  const deposit = state.startsWith("I2") && !["I2.5", "I2.6", "I2.7"].includes(state),
    success = state === "I2.4" || state === "I2.7",
    transfer = state.startsWith("I2"),
    waiting = state === "I2.2" || pending;
  let units = 0n;
  try {
    units = parseUsdc(amount);
  } catch {
    /* Invalid demo input falls back to a disabled action or fixture. */
  }
  const ceiling = BigInt(deposit ? balance.wallet : balance.value);
  const error =
    units > ceiling
      ? deposit
        ? `That's more than your wallet has. You can deposit up to ${formatUsdc(ceiling)} USDC.`
        : "That's more than your money in the pool."
      : undefined;
  const paid = units < BigInt(balance.cash) ? units : BigInt(balance.cash),
    queued = deposit ? 0n : units - paid;
  /* The wallet cannot cover the amount, so the row and its figure turn red. */
  const walletShort = deposit && units > BigInt(balance.wallet);
  /* What the result sheet reports once the money has moved. */
  const settledValue =
    preview && !receipt ? (deposit ? "6009720000" : "4009720000") : balance.value;
  const settledTotal =
    preview && !receipt ? (deposit ? "26000000000" : "24000000000") : balance.total;
  const settledShare =
    Number(settledTotal) > 0 ? Math.round((Number(settledValue) / Number(settledTotal)) * 100) : 0;
  async function submitLive(accountId: string) {
    setTxError(null);
    setPending(true);
    try {
      const tx = deposit
        ? await ensureUsdcStorage(accountId).then(() =>
            callContract(
              USDC_CONTRACT,
              "ft_transfer_call",
              { receiver_id: WAYBIL_CONTRACT, amount: String(units), msg: "deposit" },
              { deposit: "1", gas: TX_GAS },
            ),
          )
        : await callContract(
            WAYBIL_CONTRACT,
            "withdraw",
            { amount: String(units) },
            { gas: TX_GAS },
          );
      setReceipt({ amount: String(units), paid: String(paid), queued: String(queued), tx });
      refresh();
      setState(deposit ? "I2.4" : "I2.7");
    } catch (failure) {
      setTxError(wallError(failure));
    } finally {
      setPending(false);
    }
  }
  async function payQueue() {
    try {
      await callContract(WAYBIL_CONTRACT, "process_queue", {}, { gas: TX_GAS });
      refresh();
    } catch (failure) {
      setTxError(wallError(failure));
    }
  }
  function submit() {
    if (units <= 0n || error) return;
    if (live) return void submitLive(live.accountId);
    const result = changePoolBalance(balance, deposit ? "deposit" : "withdraw", amount);
    if (preview) setPreviewBalance(result.balance);
    if (!preview) saveDemoPool(result.balance);
    setReceipt({ amount: String(units), paid: String(result.paid), queued: String(result.queued) });
    setState(deposit ? "I2.4" : "I2.7");
  }
  function quick(percent: number) {
    const base =
      percent === 100 && !deposit
        ? BigInt(balance.value) < BigInt(balance.cash)
          ? BigInt(balance.value)
          : BigInt(balance.cash)
        : ceiling;
    const value = (base * BigInt(percent)) / 100n;
    setAmount(`${value / 1000000n}.${(value % 1000000n).toString().padStart(6, "0")}`);
  }
  const close = () => {
    setTxError(null);
    setState("I1.1");
    setReceipt(null);
  };
  const home = (
    <PoolHome
      liveAccount={live ? live.accountId : null}
      data={data}
      balance={balance}
      firstVisit={firstVisit}
      name={name}
      share={share}
      utilization={utilization}
      lent={lent}
      busy={busy}
      onDeposit={() => {
        setAmount("1000");
        setState("I2.1");
      }}
      onWithdraw={() => {
        setAmount("1000");
        setState(busy ? "I2.6" : "I2.5");
      }}
      onPayQueue={() => void payQueue()}
    />
  );
  return (
    <RoleShell role="investor" current={current}>
      <div className="flex flex-col gap-24">
        {!state.startsWith("I3") ? (
          home
        ) : live && !data ? (
          <Panel className="grid min-h-240 place-content-center text-center">
            <p className="text-label text-ds-muted">
              {failed ? "We could not load the pool. Try again in a moment." : "Loading the pool."}
            </p>
            {failed && (
              <Button variant="secondary" className="mx-auto mt-12" onClick={refresh}>
                Try again
              </Button>
            )}
          </Panel>
        ) : live && data && state === "I3.3" ? (
          <LiveHistory accountId={live.accountId} queue={data.queue} />
        ) : state === "I3.3" ? (
          <DemoHistory />
        ) : live && data && state === "I3.2" ? (
          <LiveDelivery
            shipment={data.deliveries.find((s) => s.id === shipmentId)}
            value={balance.value}
            total={balance.total}
          />
        ) : live && data && (state === "I3.1" || state === "I3.4") ? (
          <LiveDeliveries deliveries={data.deliveries} />
        ) : state === "I3.2" || state === "I3.5" ? (
          <DeliveryDetails
            id={shipmentId}
            value={balance.value}
            total={balance.total}
            reserve={fixture.pool.reserve}
            covered={state === "I3.5"}
          />
        ) : (
          <DemoDeliveries empty={state === "I3.4"} filter={filter} onFilter={setFilter} />
        )}
        {!live && (
          <p className="text-center text-caption text-ds-muted">
            This demo uses sample data. It does not move money.
          </p>
        )}
      </div>
      {transfer && (
        <TransferSheet
          deposit={deposit}
          success={success}
          live={!!live}
          waiting={waiting}
          amount={amount}
          onAmount={setAmount}
          error={error}
          units={units}
          paid={paid}
          queued={queued}
          ceiling={ceiling}
          balance={balance}
          walletShort={walletShort}
          receipt={receipt}
          txError={txError}
          settledValue={settledValue}
          settledShare={settledShare}
          onClose={close}
          onSubmit={submit}
          onQuick={quick}
          onRisks={() => setRisks(true)}
        />
      )}
      {risks && <RisksSheet onClose={() => setRisks(false)} />}
    </RoleShell>
  );
}
