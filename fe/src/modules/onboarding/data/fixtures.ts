import type { Role, Shipper } from "@waybil/shared";
export const ONBOARDING_STATES = {
  A1: "Sign in",
  A2: "Waiting for your wallet",
  A3: "Connection declined",
  A4: "Wrong network",
  A5: "Checking your account",
  B1: "Nothing selected",
  B2: "Shipper selected",
  B3: "Google, truck owner selected",
  B4: "Investor selected",
  C1: "Details, empty",
  C2: "Details, ready",
  C3: "Errors while typing",
  C4: "Phone country picker",
  C5: "Province search",
  "C5.1": "Documents, empty",
  "C5.2": "Documents, ready",
  "C5.3": "File too big",
  C6: "Submitting",
  C7: "Under review",
  C8: "Approved",
  C9: "Needs one more thing",
  D1: "Details, empty",
  D2: "Details, ready",
  D3: "Errors while typing",
  D4: "Phone country picker",
  D5: "Saving",
  D6: "All set",
  E1: "Before you start",
  E2: "Ready",
  E3: "All set",
  F1: "Driver invite, not connected",
  F2: "Driver invite, connected",
  F3: "Invite accepted",
  F4: "Invite expired or used",
  F5: "Warehouse invite",
  F6: "Warehouse linked",
  G1: "Wallet menu",
  G2: "Get test USDC",
  G3: "Waiting for wallet",
  G4: "Added",
  G5: "Too soon",
  X1: "Page not found",
  X2: "Something went wrong",
  X3: "No access",
  X4: "Offline",
  X5: "Signed out",
  X6: "Request declined",
  X7: "Didn't go through",
} as const;
export type OnboardingState = keyof typeof ONBOARDING_STATES;
export const ONBOARDING_FIXTURES = Object.fromEntries(
  Object.keys(ONBOARDING_STATES).map((code) => [
    code,
    {
      role:
        code.startsWith("C") || code.startsWith("G")
          ? "shipper"
          : code.startsWith("D") || ["B3", "F1", "F2", "F3"].includes(code)
            ? "driver"
            : code.startsWith("E") || code === "B4"
              ? "investor"
              : code === "B2"
                ? "shipper"
                : code === "F5" || code === "F6"
                  ? "warehouse"
                  : null,
      shipper: {
        limit: "3000000000",
        owed: "0",
        committed: "0",
        paused: null,
        late_bills: 0,
        blocked_until: "0",
        raise_window_start: "0",
        raise_window_base: "3000000000",
      },
    },
  ]),
) as Record<OnboardingState, { role: Role | null; shipper: Shipper }>;
export const COUNTRIES = [
  {
    name: "United States",
    code: "+1",
    min: 10,
    max: 10,
    provinces: ["Maine", "Maryland", "Massachusetts"],
  },
  { name: "Indonesia", code: "+62", min: 9, max: 13, provinces: ["Jakarta"] },
  { name: "Malaysia", code: "+60", min: 9, max: 10, provinces: ["Selangor"] },
  { name: "Singapore", code: "+65", min: 8, max: 8, provinces: ["Singapore"] },
  { name: "Philippines", code: "+63", min: 10, max: 10, provinces: ["Metro Manila"] },
  { name: "Thailand", code: "+66", min: 9, max: 9, provinces: ["Bangkok"] },
  { name: "Vietnam", code: "+84", min: 9, max: 10, provinces: ["Hanoi"] },
] as const;
export const CITIES: Record<string, string[]> = {
  Jakarta: ["Jakarta"],
  Maine: ["Eastport", "Harbor City", "Riverton"],
  Maryland: ["Baltimore"],
  Massachusetts: ["Boston"],
  Selangor: ["Shah Alam"],
  Singapore: ["Singapore"],
  "Metro Manila": ["Manila"],
  Bangkok: ["Bangkok"],
  Hanoi: ["Hanoi"],
};
export const SAMPLE_COMPANY = {
  name: "Northwind Freight Co.",
  registration: "9120 0012 3456 7",
  country: "United States",
  province: "Maine",
  city: "Eastport",
  address: "21 Dock Road, Eastport",
  postal: "55284",
  contact: "Hannah Brooks",
  job: "Finance",
  phone: "207 555 0142",
  email: "hannah@northwindfreight.com",
  trips: "40",
  spend: "12000",
  routes: "Eastport to Harbor City and Riverton",
};
export type CompanyDraft = typeof SAMPLE_COMPANY;
export const EMPTY_COMPANY: CompanyDraft = Object.fromEntries(
  Object.keys(SAMPLE_COMPANY).map((key) => [key, ""]),
) as CompanyDraft;
