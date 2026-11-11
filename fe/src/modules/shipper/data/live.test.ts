import { expect, test } from "vitest";
import type { Invite, Shipment } from "@waybil/shared";
import { toCompanyInput, fromCompanyInput } from "@/modules/onboarding/data/application";
import { SAMPLE_COMPANY } from "@/modules/onboarding/data/fixtures";
import { billsToPay, dueAt, repayMessage, toRow, waitingToAdd, type LiveShipperData } from "./live";

const DAY = 86400000;
const now = Date.parse("2026-11-12T00:00:00Z");
const ns = (ms: number) => String(BigInt(ms) * 1000000n);
const ship = (id: number, status: Shipment["status"], dueIn: number) =>
  ({
    id,
    status,
    driver: "sam.users.waybil.testnet",
    destination: 2,
    qty: 120,
    unit: "crates",
    bill: "300000000",
    due_at: ns(now + dueIn * DAY),
    repaid_at: null,
  }) as unknown as Shipment;
const invite = (type: Invite["type"], name: string, acceptedBy: string | null) =>
  ({ type, name, acceptedBy, address: "9 Pier Street", code: name }) as Invite;
const data: LiveShipperData = {
  account: "northwind.testnet",
  shipper: null,
  network: {
    drivers: ["sam.users.waybil.testnet"],
    destinations: [{ id: 2, shipper: "x", warehouse: "lena.users.waybil.testnet" }],
  },
  shipments: [],
  invites: [
    invite("driver", "Sam", "sam.users.waybil.testnet"),
    invite("warehouse", "Harbor Hub", "lena.users.waybil.testnet"),
    invite("driver", "Jordan", "jordan.users.waybil.testnet"),
  ],
  wallet: 0n,
};

test("rows use the invite names and say when a bill is due", () => {
  const row = toRow(ship(7, "Paid", 2), data, now);
  expect(row).toMatchObject({
    route: "To Harbor Hub",
    driver: "Sam",
    cargo: "120 crates",
    due: "Due in 2 days",
  });
});

test("bills to pay count only Paid shipments, and the week ones apart", () => {
  const bills = billsToPay([ship(1, "Paid", 2), ship(2, "Paid", 20), ship(3, "Repaid", 1)], now);
  expect(bills).toEqual({ count: 2, total: 600000000n, weekCount: 1, weekTotal: 300000000n });
});

test("repay message, due date and invites waiting to be added", () => {
  expect(repayMessage(1041)).toBe('{"repay":1041}');
  expect(dueAt("2026-12-11")).toBe(ns(Date.parse("2026-12-11T23:59:59Z")));
  expect(waitingToAdd(data).map((i) => i.name)).toEqual(["Jordan"]);
});

test("the company form maps to the backend's shape and back", () => {
  const input = toCompanyInput(SAMPLE_COMPANY);
  expect(input).toMatchObject({
    registration: "9120001234567",
    phone: "+12075550142",
    trips: 40,
    shippingSpend: "12000000000",
  });
  expect(fromCompanyInput(input)).toMatchObject({
    phone: "2075550142",
    spend: "12000",
    trips: "40",
  });
});
