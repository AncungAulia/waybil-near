import {
  parseUsdc,
  type Application,
  type ApplicationResponse,
  type CompanyInput,
  type DocumentKind,
} from "@waybil/shared";
import { api } from "@/lib/api";
import type { CompanyFiles } from "../components/CompanySetup";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CompanyDraft } from "./fixtures";
import { countryForName, dialCode, toE164 } from "./validation";
import type { OnboardingState } from "./fixtures";

/* The live shipper application (#84): the form's draft to and from the backend's shape. */

/** Which screen each application state opens on. */
export const LIVE_STATE: Record<Application["state"], OnboardingState> = {
  draft: "C2",
  in_review: "C7",
  needs_more: "C9",
  approved: "C8",
  rejected: "C9",
};

/** The picked phone country, else the company's country, else the United States. */
const phoneCountryOf = (c: CompanyDraft) => c.phoneCountry || countryForName(c.country) || "US";

/** The form's draft as the backend wants it: 13 digits, E.164 phone, USDC base units. */
export function toCompanyInput(c: CompanyDraft): CompanyInput {
  return {
    name: c.name.trim(),
    registration: c.registration.replace(/\D/g, ""),
    country: c.country,
    province: c.province,
    city: c.city,
    address: c.address.trim(),
    postal: c.postal.trim(),
    contact: c.contact.trim(),
    job: c.job.trim(),
    phone:
      toE164(c.phone, phoneCountryOf(c)) ??
      `${dialCode(phoneCountryOf(c))}${c.phone.replace(/\D/g, "")}`,
    email: c.email.trim(),
    trips: Number(c.trips),
    shippingSpend: String(parseUsdc(c.spend.replace(/,/g, ""))),
    routes: c.routes.trim(),
  };
}

/** A saved application back in the form's shape. */
export function fromCompanyInput(c: CompanyInput): CompanyDraft {
  const parsed = parsePhoneNumberFromString(c.phone);
  return {
    name: c.name,
    registration: c.registration,
    country: c.country,
    province: c.province,
    city: c.city,
    address: c.address,
    postal: c.postal,
    contact: c.contact,
    job: c.job,
    phone: parsed ? String(parsed.nationalNumber) : c.phone,
    phoneCountry: parsed?.country ?? countryForName(c.country) ?? "",
    email: c.email,
    trips: String(c.trips),
    spend: String(Number(BigInt(c.shippingSpend)) / 1000000),
    routes: c.routes,
  };
}

/** Creates the application, or updates it while it is a draft or needs more. */
export async function saveApplication(current: Application | null, draft: CompanyDraft) {
  const body = toCompanyInput(draft);
  const result = current
    ? await api<ApplicationResponse>(`/applications/${current.id}`, { method: "PUT", body })
    : await api<ApplicationResponse>("/applications", { body });
  return result.application;
}

const KINDS: Record<string, DocumentKind> = {
  registration: "registration",
  bank: "bank_statement",
  tax: "tax_id",
};

/** Uploads each chosen paper, then submits the application for review. */
export async function sendPapers(id: string, files: CompanyFiles) {
  for (const [slot, info] of Object.entries(files)) {
    const kind = KINDS[slot];
    if (!info?.file || !kind) continue;
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", info.file);
    await api(`/applications/${id}/documents`, { body: form });
  }
  return (await api<ApplicationResponse>(`/applications/${id}/submit`, { body: {} })).application;
}
