import { expect, it } from "vitest";
import preset from "../../config/credit-policy.testnet.json";
import { creditPolicy, targetLimit, type ExtractedPapers } from "./credit.schema";

const policy = creditPolicy.parse(preset);
function statements(amounts: string[], currency = "USD"): ExtractedPapers {
  return {
    readable: true,
    registrationCompany: "SAMPLE Freight",
    registrationNumber: "1234567890123",
    bankCompany: "SAMPLE Freight",
    currency,
    monthlyOutgoing: amounts.map((amount, i) => ({
      month: `2026-${String(i + 8).padStart(2, "0")}`,
      amount,
    })),
    reasons: [],
  };
}
it.each([
  [["6000", "12000", "18000"], "2400000000"],
  [["50000", "50000", "50000"], "10000000000"],
  [["60000", "90000", "120000"], "10000000000"],
  [["0", "0", "0"], "0"],
  [["0.000001", "0.000001", "0.000001"], "0"],
  [["49999.999999", "49999.999999", "49999.999999"], "9999999999"],
])(
  "applies the reviewed 20 percent policy to %j without exceeding its cap",
  (amounts, expected) => {
    expect(targetLimit(policy, statements(amounts))).toBe(expected);
  },
);
it("rejects missing months and other currencies instead of assuming a conversion", () => {
  expect(() => targetLimit(policy, statements(["12000", "12000"]))).toThrow();
  expect(() => targetLimit(policy, statements(["12000", "12000", "12000"], "IDR"))).toThrow();
});
