import { parseUsdc } from "@waybil/shared";
import { COUNTRIES, type CompanyDraft } from "./fixtures";
export function phoneError(phone: string, code: string) {
  const digits = phone.replace(/\D/g, "");
  const country = COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
  return digits.length < country.min || digits.length > country.max
    ? `Enter a valid phone number for ${country.name}.`
    : undefined;
}
export function companyErrors(draft: CompanyDraft, phoneCode: string) {
  const errors: Partial<Record<keyof CompanyDraft, string>> = {};
  for (const key of Object.keys(draft) as (keyof CompanyDraft)[])
    if (!draft[key].trim()) errors[key] = "Fill in this field.";
  if (draft.registration && draft.registration.replace(/\D/g, "").length !== 13)
    errors.registration = "Enter the 13 digits from your registration.";
  if (draft.phone && phoneError(draft.phone, phoneCode))
    errors.phone = phoneError(draft.phone, phoneCode);
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
