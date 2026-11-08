import { parseUsdc } from "@waybil/shared";
export interface DemoPoolBalance {
  value: string;
  wallet: string;
  cash: string;
  total: string;
  queued: string;
}
export const INITIAL_BALANCE: DemoPoolBalance = {
  value: "5009720000",
  wallet: "3450000000",
  cash: "21706000000",
  total: "25000000000",
  queued: "0",
};
export function changePoolBalance(
  balance: DemoPoolBalance,
  direction: "deposit" | "withdraw",
  input: string,
) {
  const amount = parseUsdc(input);
  if (amount <= 0n) throw new Error("Enter an amount above zero.");
  const value = BigInt(balance.value),
    wallet = BigInt(balance.wallet),
    cash = BigInt(balance.cash),
    total = BigInt(balance.total);
  if (direction === "deposit") {
    if (amount > wallet) throw new Error("That is more than your wallet has.");
    return {
      balance: {
        ...balance,
        value: String(value + amount),
        wallet: String(wallet - amount),
        cash: String(cash + amount),
        total: String(total + amount),
      },
      paid: amount,
      queued: 0n,
    };
  }
  if (amount > value) throw new Error("That is more than your money in the pool.");
  const paid = amount < cash ? amount : cash,
    queued = amount - paid;
  return {
    balance: {
      ...balance,
      value: String(value - amount),
      wallet: String(wallet + paid),
      cash: String(cash - paid),
      total: String(total - amount),
      queued: String(BigInt(balance.queued) + queued),
    },
    paid,
    queued,
  };
}
