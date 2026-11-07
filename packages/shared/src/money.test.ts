import { describe, expect, it } from "vitest";
import {
  advanceFor,
  billForDriverAmount,
  driverAmountForGoodUnits,
  formatUsdc,
  parseUsdc,
  splitBill,
} from "./money";

const usdc = (v: string) => parseUsdc(v);

describe("money", () => {
  it("parses and formats USDC", () => {
    expect(usdc("300")).toBe(300_000_000n);
    expect(usdc("292.5")).toBe(292_500_000n);
    expect(formatUsdc(usdc("1234.5"))).toBe("1,234.50");
    expect(() => usdc("1.2345678")).toThrow("E_BAD_AMOUNT");
  });

  it("splits a 300 USDC bill like decision 0003", () => {
    const split = splitBill(usdc("300"));
    expect(formatUsdc(split.driver)).toBe("292.50");
    expect(formatUsdc(split.pool)).toBe("4.80");
    expect(formatUsdc(split.reserve)).toBe("1.20");
    expect(formatUsdc(split.waybil)).toBe("1.50");
  });

  it("sends rounding leftovers to the reserve", () => {
    const bill = 333_333n;
    const s = splitBill(bill);
    expect(s.driver + s.pool + s.reserve + s.waybil).toBe(bill);
  });

  it("pays for what arrived: 112 of 120 boxes", () => {
    const driver = driverAmountForGoodUnits(usdc("300"), 112, 120);
    expect(formatUsdc(driver)).toBe("273.00");
    expect(formatUsdc(billForDriverAmount(driver))).toBe("280.00");
  });

  it("pays a different amount: 250 to the driver", () => {
    expect(formatUsdc(billForDriverAmount(usdc("250")))).toBe("256.41");
  });

  it("keeps the advance at 97.5%", () => {
    expect(formatUsdc(advanceFor(usdc("1200")))).toBe("1,170.00");
  });
});
