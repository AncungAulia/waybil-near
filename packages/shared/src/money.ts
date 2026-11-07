// Money helpers that match the waybil contract (docs/specs/contract.md).
// Amounts are USDC base units as bigint. 1 USDC = 1_000_000 base units.

export const USDC_DECIMALS = 6;
const UNIT = 10n ** BigInt(USDC_DECIMALS);
const BPS = 10_000n;

/** Fee split in basis points. Must stay equal to the contract defaults. */
export const FEE_BPS = {
  driver: 9_750n,
  pool: 160n,
  reserve: 40n,
  waybil: 50n,
} as const;

export interface BillSplit {
  driver: bigint;
  pool: bigint;
  reserve: bigint;
  waybil: bigint;
}

/** Parses "300", "300.5" or "300.50" into base units. Throws on bad input. */
export function parseUsdc(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(value.trim());
  if (!match) throw new Error(`E_BAD_AMOUNT: ${value}`);
  const whole = BigInt(match[1] ?? "0");
  const fraction = BigInt((match[2] ?? "").padEnd(USDC_DECIMALS, "0"));
  return whole * UNIT + fraction;
}

/** Formats base units as "1,234.50" (two decimals, no currency). */
export function formatUsdc(amount: bigint): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const cents = (abs + UNIT / 200n) / (UNIT / 100n); // round half up to cents
  const whole = (cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (cents % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/** Splits a repaid bill. Rounding leftovers go to the reserve, like the contract. */
export function splitBill(bill: bigint): BillSplit {
  const driver = (bill * FEE_BPS.driver) / BPS;
  const pool = (bill * FEE_BPS.pool) / BPS;
  const waybil = (bill * FEE_BPS.waybil) / BPS;
  const reserve = bill - driver - pool - waybil;
  return { driver, pool, reserve, waybil };
}

/** What the driver gets on arrival for a bill. */
export function advanceFor(bill: bigint): bigint {
  return splitBill(bill).driver;
}

/** New bill after a report is settled with a driver amount (rounded up). */
export function billForDriverAmount(driverAmount: bigint): bigint {
  return (driverAmount * BPS + FEE_BPS.driver - 1n) / FEE_BPS.driver;
}

/** Driver amount for "pay for what arrived": good units out of all units. */
export function driverAmountForGoodUnits(bill: bigint, goodQty: number, qty: number): bigint {
  if (qty <= 0 || goodQty < 0 || goodQty > qty) throw new Error("E_BAD_QTY");
  return (advanceFor(bill) * BigInt(goodQty)) / BigInt(qty);
}
