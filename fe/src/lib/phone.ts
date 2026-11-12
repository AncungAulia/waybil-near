/*
 * Phone numbers for every form: the country list with dial codes, and checks with
 * libphonenumber-js. The backend takes E.164 ("+12075550142").
 */
import {
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  isValidPhoneNumber,
  Metadata,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

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
