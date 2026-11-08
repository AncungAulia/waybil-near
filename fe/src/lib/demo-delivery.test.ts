import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  confirmDemoDelivery,
  readDemoDelivery,
  readDemoReportJson,
  parseDemoReport,
  DEFAULT_REPORT,
  DELIVERY_KEY,
  settleDemoReport,
  repayDemoBill,
  readDemoSettlementJson,
  parseDemoSettlement,
} from "./demo-delivery";

describe("the delivery demo transport", () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    vi.stubGlobal("window", new EventTarget());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("publishes an automatic payout once and refuses a later report", () => {
    const notified = vi.fn();
    window.addEventListener("waybil-demo-delivery", notified);
    expect(confirmDemoDelivery("paid")).toBe(true);
    expect(readDemoDelivery()).toBe("paid");
    expect(notified).toHaveBeenCalledTimes(1);
    expect(confirmDemoDelivery("reported", { ...DEFAULT_REPORT, note: "A later report" })).toBe(
      false,
    );
    expect(readDemoDelivery()).toBe("paid");
    expect(parseDemoReport(readDemoReportJson()).note).toBe(DEFAULT_REPORT.note);
  });

  it("holds the payout and preserves the submitted count and note", () => {
    const report = { ...DEFAULT_REPORT, goodQty: 100, note: "Twenty crates are missing." };
    expect(confirmDemoDelivery("reported", report)).toBe(true);
    expect(readDemoDelivery()).toBe("reported");
    expect(parseDemoReport(readDemoReportJson())).toEqual(report);
    expect(confirmDemoDelivery("paid")).toBe(false);
  });

  it("does not publish a payout if storage fails", () => {
    const notified = vi.fn();
    window.addEventListener("waybil-demo-delivery", notified);
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new Error("Full");
      },
    });
    expect(() => confirmDemoDelivery("paid")).toThrow("Full");
    expect(notified).not.toHaveBeenCalled();
  });

  it("recovers from damaged local fixture data", () => {
    values.set(DELIVERY_KEY, "invalid");
    expect(readDemoDelivery()).toBe("road");
    expect(parseDemoReport("invalid")).toEqual(DEFAULT_REPORT);
    expect(parseDemoReport(JSON.stringify({ ...DEFAULT_REPORT, goodQty: 121 }))).toEqual(
      DEFAULT_REPORT,
    );
  });

  it("settles a report once, rounds the bill up and preserves the payout after repayment", () => {
    confirmDemoDelivery("reported", DEFAULT_REPORT);
    expect(settleDemoReport("250000000", "Agreed with Sam.")).toBe(true);
    expect(readDemoDelivery()).toBe("settled");
    expect(parseDemoSettlement(readDemoSettlementJson())).toMatchObject({
      active: true,
      amount: "250000000",
      bill: "256410257",
    });
    expect(settleDemoReport("273000000", "Another choice")).toBe(false);
    expect(repayDemoBill()).toBe(true);
    expect(repayDemoBill()).toBe(false);
    expect(parseDemoSettlement(readDemoSettlementJson()).amount).toBe("250000000");
  });
  it("refuses an amount above the advance and refuses repayment while a report is open", () => {
    confirmDemoDelivery("reported", DEFAULT_REPORT);
    expect(() => settleDemoReport("292500001", "Too much.")).toThrow("Invalid settlement");
    expect(repayDemoBill()).toBe(false);
    expect(readDemoDelivery()).toBe("reported");
  });
});
