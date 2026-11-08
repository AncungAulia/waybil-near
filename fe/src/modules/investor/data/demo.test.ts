import { describe, expect, it } from "vitest";
import { changePoolBalance, INITIAL_BALANCE } from "./demo";
describe("local investor flow", () => {
  it("adds a deposit without changing the amount already lent", () => {
    const r = changePoolBalance(INITIAL_BALANCE, "deposit", "1000.123456");
    expect(r.balance.value).toBe("6009843456");
    expect(BigInt(r.balance.total) - BigInt(r.balance.cash)).toBe(3294000000n);
    expect(r.balance.wallet).toBe("2449876544");
  });
  it("withdraws only free cash and queues the rest without paying twice", () => {
    const r = changePoolBalance({ ...INITIAL_BALANCE, cash: "2000000000" }, "withdraw", "5000");
    expect(r.paid).toBe(2000000000n);
    expect(r.queued).toBe(3000000000n);
    expect(r.balance.value).toBe("9720000");
    expect(r.balance.wallet).toBe("5450000000");
    expect(r.balance.cash).toBe("0");
    expect(() => changePoolBalance(r.balance, "withdraw", "5000")).toThrow();
  });
  it("rejects zero, malformed amounts and requests above owned balances", () => {
    for (const amount of ["0", "-1", "NaN", "1.0000001", "3450.000001"])
      expect(() => changePoolBalance(INITIAL_BALANCE, "deposit", amount)).toThrow();
    expect(() => changePoolBalance(INITIAL_BALANCE, "withdraw", "5009.720001")).toThrow();
  });
});
