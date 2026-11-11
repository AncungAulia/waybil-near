import { parseUsdc } from "@waybil/shared";
import {
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  isValidPhoneNumber,
  Metadata,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import type { CompanyDraft } from "./fixtures";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** Every country with a phone code, sorted by name. */
export const PHONE_COUNTRIES = getCountries()
  .map((iso2) => ({
    iso2,
    name: regionNames.of(iso2) ?? iso2,
    code: `+${getCountryCallingCode(iso2)}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** "+62" for "ID". */
export const dialCode = (iso2: string) =>
  isSupportedCountry(iso2) ? `+${getCountryCallingCode(iso2)}` : "";

/** The main country for a dial code, so "+1" is the United States. */
export function countryForDialCode(code: string): CountryCode | undefined {
  /* The method exists at runtime (main country first) but is missing from the typings. */
  const metadata = new Metadata() as unknown as {
    getCountryCodesForCallingCode(code: string): CountryCode[] | undefined;
  };
  return metadata.getCountryCodesForCallingCode(code.replace(/\D/g, ""))?.[0];
}

/** The phone country for a country name from the places list, when one matches. */
export function countryForName(name: string): CountryCode | undefined {
  const wanted = name.trim().toLowerCase();
  return wanted ? PHONE_COUNTRIES.find((c) => c.name.toLowerCase() === wanted)?.iso2 : undefined;
}

/** `country` is an ISO2 code ("US") or a dial code ("+1"). */
function phoneCountry(country: string): CountryCode | undefined {
  if (country.startsWith("+")) return countryForDialCode(country);
  return isSupportedCountry(country) ? country : undefined;
}

/** The number in E.164 ("+12075550142"), or undefined when it is not a valid number. */
export function toE164(phone: string, country: string) {
  const iso2 = phoneCountry(country);
  const parsed = parsePhoneNumberFromString(phone, iso2 ? { defaultCountry: iso2 } : undefined);
  return parsed?.isValid() ? parsed.number : undefined;
}

export function phoneError(phone: string, country: string) {
  const iso2 = phoneCountry(country);
  if (iso2 && isValidPhoneNumber(phone, iso2)) return undefined;
  const name = iso2 ? regionNames.of(iso2) : undefined;
  return name ? `Enter a valid phone number for ${name}.` : "Enter a valid phone number.";
}

/** Fields the form fills on its own, so they never show "Fill in this field". */
const AUTOMATIC: (keyof CompanyDraft)[] = ["phoneCountry"];

/** `phoneCountry` is the picked phone country, as an ISO2 code ("US") or a dial code ("+1"). */
export function companyErrors(draft: CompanyDraft, phoneCountry: string) {
  const errors: Partial<Record<keyof CompanyDraft, string>> = {};
  for (const key of Object.keys(draft) as (keyof CompanyDraft)[])
    if (!AUTOMATIC.includes(key) && !draft[key].trim()) errors[key] = "Fill in this field.";
  if (draft.registration && draft.registration.replace(/\D/g, "").length !== 13)
    errors.registration = "Enter the 13 digits from your registration.";
  if (draft.phone && phoneError(draft.phone, phoneCountry))
    errors.phone = phoneError(draft.phone, phoneCountry);
  if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))
    errors.email = "Enter a valid work email.";
  if (
    draft.trips &&
    (!/^\d+$/.test(draft.trips) ||
      !Number.isSafeInteger(Number(draft.trips)) ||
      Number(draft.trips) <= 0)
  )
    errors.trips = "Enter a whole number above zero.";
  try {
    if (parseUsdc(draft.spend) <= 0n) errors.spend = "Enter an amount above zero.";
  } catch {
    errors.spend = "Enter a valid amount.";
  }
  return errors;
}
export function documentError(file: { size: number; type: string }) {
  if (file.size > 2 * 1024 * 1024) return "Use a file up to 2 MB, or take a smaller photo.";
  if (file.size === 0 || !["application/pdf", "image/jpeg", "image/png"].includes(file.type))
    return "Use a PDF, JPG or PNG file.";
  return undefined;
}
export function driverErrors(
  draft: { name: string; phone: string; plate: string },
  phoneCode: string,
) {
  return {
    name: draft.name.trim() ? undefined : "Enter your full name.",
    phone: phoneError(draft.phone, phoneCode),
    plate: /^[A-Z]{1,4}-\d{1,5}$/.test(draft.plate.trim())
      ? undefined
      : "Use the format on your plate, like NWF-204.",
  };
}
