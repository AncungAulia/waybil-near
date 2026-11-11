import { Coins, Package, Truck, Warehouse } from "@phosphor-icons/react";
import { FEE_BPS, type Role } from "@waybil/shared";
import { EMPTY_COMPANY, SAMPLE_COMPANY, type CompanyDraft, type OnboardingState } from "./fixtures";

/* Shares of each bill from the shared fee split, for example "1.6%" and "97.5%". */
export const POOL_PERCENT = `${Number(FEE_BPS.pool) / 100}%`;
export const DRIVER_PERCENT = `${Number(FEE_BPS.driver) / 100}%`;
/* Drivers and warehouses use Google. Shippers and investors use a NEAR wallet. */
export const WALLET_ROLES = [
  {
    value: "shipper" as const,
    title: "I ship goods",
    note: "Approve trips before the truck leaves and pay at the due date. Your drivers get paid on arrival.",
  },
  {
    value: "investor" as const,
    title: "I fund deliveries",
    note: "Deposit USDC into the pool and earn when shipping companies pay their bills.",
  },
];
/* Where each role lands after sign-in. */
export const HOME: Partial<Record<Role, string>> = {
  shipper: "/shipper",
  investor: "/pool",
  admin: "/admin",
  driver: "/driver",
  warehouse: "/warehouse",
};
export const GOOGLE_ROLES = [
  {
    value: "driver" as const,
    title: "I own a truck",
    note: "Confirm pickup, show a QR at the destination, and get paid the moment goods arrive.",
  },
  {
    value: "warehouse" as const,
    title: "I receive goods",
    note: "Scan the driver's QR when a truck arrives to confirm the delivery.",
  },
];
/*
 * A1 asks what the person does first, then signs them in the way that role uses, so a truck
 * owner never lands on the wallet path. Shippers and investors use a NEAR wallet, drivers use
 * Google, and warehouses join from a shipper's invite link.
 */
export const START = [
  {
    value: "shipper" as const,
    title: "I ship goods",
    note: "Sign in with a NEAR wallet.",
    icon: Package,
  },
  {
    value: "investor" as const,
    title: "I fund deliveries",
    note: "Sign in with a NEAR wallet.",
    icon: Coins,
  },
  {
    value: "driver" as const,
    title: "I own a truck",
    note: "Continue with Google. You need no wallet and pay no fees.",
    icon: Truck,
  },
  {
    value: "warehouse" as const,
    title: "I receive goods",
    note: "Join from the link a shipping company sends you.",
    icon: Warehouse,
  },
];
export type StartRole = (typeof START)[number]["value"];

/** The flags every part of the screen derives from the state code, for example "C5.1". */
export function stateFlags(state: OnboardingState) {
  const group = state[0],
    review = ["C7", "C8", "C9"].includes(state),
    isRole = group === "B";
  return {
    group,
    connect: group === "A",
    centeredConnect: state === "A2" || state === "A5",
    documents: ["C5.1", "C5.2", "C5.3", "C6"].includes(state),
    review,
    isRole,
    driverForm: group === "D" && state !== "D6",
    driverReady: state === "D6",
    investor: group === "E",
    investorReady: state === "E3",
    invite: group === "F",
    inviteResult: ["F3", "F4", "F6"].includes(state),
    setup: ["A", "B", "C", "D", "E", "F", "X"].includes(group),
    system: group === "X" && !["X6", "X7"].includes(state),
    wide: (group === "C" && !review) || isRole,
  };
}

/** The progress labels in the header and the step the state is on. */
export function progress(state: OnboardingState) {
  const { group, isRole, review, documents } = stateFlags(state);
  const steps =
    group === "C"
      ? ["Role", "Details", "Documents", "Review"]
      : group === "E"
        ? ["Role", "Before you start", "Done"]
        : group === "D"
          ? ["Role", "Details", "Done"]
          : isRole
            ? ["Role", "Details", "Review"]
            : [];
  const step =
    group === "C"
      ? review
        ? 4
        : documents
          ? 3
          : 2
      : group === "D"
        ? state === "D6"
          ? 3
          : 2
        : group === "E"
          ? state === "E3"
            ? 3
            : 2
          : 1;
  return { steps, step };
}

/** The company form each gallery state starts with. */
export function initialCompany(initialState: OnboardingState): CompanyDraft {
  return initialState === "C1" || initialState.startsWith("A") || initialState.startsWith("B")
    ? { ...EMPTY_COMPANY }
    : initialState === "C3"
      ? { ...SAMPLE_COMPANY, registration: "9120 0012 34", phone: "207 55" }
      : initialState === "C5"
        ? { ...SAMPLE_COMPANY, province: "", city: "" }
        : { ...SAMPLE_COMPANY };
}
