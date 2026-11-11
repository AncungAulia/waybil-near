"use client";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { type CompanyDraft, type OnboardingState } from "../data/fixtures";
import { companyErrors, countryForName, dialCode, documentError } from "../data/validation";
import { useRegions } from "../data/regions";
import { PhoneInput } from "./PhoneInput";
import { SearchPicker } from "./SearchPicker";
import { cn } from "@/lib/cn";
import { UploadSimple, FileX, FileText, Check } from "@phosphor-icons/react";
import { BackLink } from "@/components/elements/BackLink";
export function CompanySetup({
  state,
  draft,
  setDraft,
  onContinue,
  saving = false,
}: {
  state: OnboardingState;
  draft: CompanyDraft;
  setDraft: (draft: CompanyDraft) => void;
  onContinue: () => void;
  /** The details are being saved, so Continue shows it and can't be sent twice. */
  saving?: boolean;
}) {
  const regions = useRegions(draft.country, draft.province);
  /* The phone country follows the company's country until someone picks another one. */
  const phoneCountry =
    draft.phoneCountry ||
    (regions.iso2 && dialCode(regions.iso2) ? regions.iso2 : countryForName(draft.country)) ||
    "ID";
  const [touched, setTouched] = useState<Set<string>>(
    () => new Set(state === "C3" ? ["registration", "phone"] : []),
  );
  const errors = companyErrors(draft, phoneCountry);
  const edit = (key: keyof CompanyDraft, value: string) => {
    setTouched((t) => new Set(t).add(key));
    setDraft({ ...draft, [key]: value });
  };
  const field = (
    key: keyof CompanyDraft,
    label: string,
    placeholder: string,
    props: {
      suffix?: string;
      hint?: string;
      type?: string;
      inputMode?: "numeric" | "decimal" | "email" | "tel";
    } = {},
  ) => (
    <Input
      key={key}
      className="min-w-0"
      label={label}
      placeholder={placeholder}
      value={draft[key]}
      onChange={(e) => edit(key, e.target.value)}
      error={touched.has(key) ? errors[key] : undefined}
      {...props}
    />
  );
  return (
    <>
      <div className="flex flex-col gap-10">
        <h1 className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[40px]">
          Tell us about
          <br className="md:hidden" />
          <span className="hidden md:inline"> </span>your company
        </h1>
        <p className="text-[14px] leading-[1.45] text-ds-muted md:text-[15px]">
          We check every company because investors pay your truck owners before you do. It takes
          about one business day.
        </p>
      </div>
      <form
        className="flex flex-col gap-18 md:gap-20"
        onSubmit={(e) => {
          e.preventDefault();
          if (!Object.keys(errors).length) onContinue();
        }}
      >
        <div className="grid gap-18 md:grid-cols-2 md:gap-16">
          {field("name", "Company name", "Your company name")}
          {field("registration", "Business registration number", "13 digits", {
            hint: "Use your company’s official registration ID.",
            inputMode: "numeric",
          })}
        </div>
        <div className="grid gap-18 md:grid-cols-3 md:gap-16">
          <SearchPicker
            label="Country"
            appearance="company"
            placeholder="Select country"
            value={draft.country}
            options={regions.countries.map((c) => ({ value: c.name, label: c.name }))}
            allowCustom={!regions.loadingCountries}
            emptyText={
              regions.loadingCountries ? "Loading countries." : "Type the name of your country."
            }
            onChange={(value) => {
              const iso2 = regions.countries.find((c) => c.name === value)?.iso2;
              setDraft({
                ...draft,
                country: value,
                province: "",
                city: "",
                phoneCountry:
                  (iso2 && dialCode(iso2) ? iso2 : countryForName(value)) || draft.phoneCountry,
              });
            }}
          />
          <SearchPicker
            label="State / Province"
            appearance="company"
            value={draft.province}
            disabled={!draft.country}
            placeholder={
              draft.country
                ? state === "C5"
                  ? "Search provinces"
                  : "Select province"
                : "Pick a country first"
            }
            options={regions.provinces.map((p) => ({ value: p.name, label: p.name }))}
            allowCustom={!regions.loadingCountries}
            emptyText={
              regions.loadingCountries
                ? "Loading provinces."
                : "Type the name of your state or province."
            }
            onChange={(value) => setDraft({ ...draft, province: value, city: "" })}
            initialOpen={state === "C5"}
            initialQuery="Ma"
          />
          <SearchPicker
            label="City"
            appearance="company"
            value={draft.city}
            disabled={!draft.province}
            placeholder={draft.province ? "Select city" : "Pick a province first"}
            options={regions.cities.map((c) => ({ value: c, label: c }))}
            allowCustom={!regions.loadingCities}
            emptyText={regions.loadingCities ? "Loading cities." : "Type the name of your city."}
            onChange={(value) => edit("city", value)}
          />
        </div>
        <div className="grid gap-18 md:grid-cols-[minmax(0,1fr)_160px] md:gap-16">
          {field("address", "Street address", "Street, number and area")}
          {field("postal", "Postal code", "55284")}
        </div>
        <div className="grid gap-18 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)] md:gap-16">
          {field("contact", "Contact person", "Full name", {
            hint: "This is who we talk to about invoices.",
          })}
          {field("job", "Role", "Finance")}
          <div className="min-w-0">
            <PhoneInput
              appearance="company"
              popoverAlign="end"
              value={draft.phone}
              onChange={(value) => edit("phone", value)}
              code={dialCode(phoneCountry)}
              country={phoneCountry}
              onCodeChange={() => setTouched((previous) => new Set(previous).add("phone"))}
              onCountryChange={(iso2) => setDraft({ ...draft, phoneCountry: iso2 })}
              initialOpen={state === "C4"}
              error={touched.has("phone") ? errors.phone : undefined}
            />
          </div>
        </div>
        {field("email", "Work email", "name@company.com", { inputMode: "email", type: "email" })}
        <div className="grid gap-18 md:grid-cols-3 md:gap-16">
          {field("trips", "Trips per month", "40", {
            suffix: "trips",
            inputMode: "numeric",
            hint: "Use the average over the last 3 months.",
          })}
          {field("spend", "Shipping spend per month", "12000", {
            suffix: "USDC",
            inputMode: "decimal",
            hint: "This helps us size your credit limit.",
          })}
          {field("routes", "Main routes", "Eastport to Riverton")}
        </div>
        <div className="flex flex-col gap-14 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="order-2 text-center text-[13px] leading-[1.45] text-ds-muted md:order-none md:flex-1 md:text-left">
            Your details stay private. Investors only see your company name and limit.
          </p>
          <Button
            type="submit"
            disabled={!!Object.keys(errors).length}
            loading={saving}
            loadingLabel="Saving"
            className="h-52 w-full justify-between md:w-240 md:shrink-0"
          >
            Continue
          </Button>
        </div>
      </form>
    </>
  );
}
/** `file` is kept on the live path so the papers can be uploaded. */
export type FileInfo = { name: string; size: number; file?: File };
export type CompanyFiles = Partial<Record<string, FileInfo>>;
/* The papers each gallery state starts with. The screen keeps them when you go back. */
export function initialCompanyFiles(state: OnboardingState): CompanyFiles {
  return state === "C5.2" || state === "C6" || state === "C7" || state === "C8" || state === "C9"
    ? {
        registration: { name: "registration.pdf", size: 1258291 },
        bank: { name: "bank-statement.pdf", size: 1468006 },
      }
    : state === "C5.3"
      ? { registration: { name: "registration.pdf", size: 1258291 } }
      : {};
}
export function CompanyDocuments({
  state,
  files,
  setFiles,
  onSubmit,
  onBack,
}: {
  state: OnboardingState;
  /* Held by OnboardingScreen, so "Back to details" and "Edit details" keep the uploads. */
  files: CompanyFiles;
  setFiles: React.Dispatch<React.SetStateAction<CompanyFiles>>;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string | undefined>>(() =>
    state === "C5.3"
      ? { bank: "This file is 3.4 MB. Use a file up to 2 MB, or take a smaller photo." }
      : {},
  );
  const waiting = state === "C6";
  return (
    <>
      {/* Back sits at the top-left, where people look for it, not under the main action. */}
      <BackLink onClick={onBack} disabled={waiting} className="-mb-8">
        Back to details
      </BackLink>
      <div className="flex flex-col gap-10">
        <h1 className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[40px]">
          Add your
          <br className="md:hidden" />
          <span className="hidden md:inline"> </span>company papers
        </h1>
        <p className="text-[14px] leading-[1.45] text-ds-muted md:text-[15px]">
          The credit assistant reads these papers to suggest your starting limit. Only the Waybil
          team can open them.
        </p>
      </div>
      <div className="flex flex-col gap-12">
        {[
          {
            key: "registration",
            label: "Business registration",
            hint: "Your company’s registration certificate",
          },
          {
            key: "bank",
            label: "Bank statement",
            hint: "The last 3 months from your company account",
          },
          { key: "tax", label: "Tax ID", hint: "You can skip this. It helps us check faster." },
        ].map((slot) => (
          /* The whole row picks a file, not only the word on the right. */
          <label
            key={slot.key}
            className={cn(
              "tap flex cursor-pointer items-center gap-14 rounded-[16px] border border-ds-line p-16 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ds-brand hover:border-ds-ink",
              !files[slot.key] &&
                "border-[1.5px] border-ds-line-strong bg-ds-canvas hover:bg-ds-canvas-hover",
              errors[slot.key] && "border-ds-danger bg-ds-danger-result",
              waiting && "pointer-events-none opacity-60",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-44 shrink-0 place-items-center rounded-small",
                files[slot.key] ? "bg-ds-check-soft text-ds-check-ink" : "bg-ds-bg",
                errors[slot.key] && "text-ds-danger",
              )}
            >
              {errors[slot.key] ? (
                <FileX size={20} />
              ) : files[slot.key] ? (
                <span className="relative">
                  <FileText size={20} />
                  <Check size={10} className="absolute right-0 bottom-0 bg-ds-check-soft" />
                </span>
              ) : (
                <UploadSimple size={20} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-8">
                <p className="text-[15px] leading-[1.45] font-semibold">{slot.label}</p>
                {slot.key === "tax" && (
                  <span className="rounded-full bg-ds-bg px-8 py-2 text-[11px] text-ds-muted">
                    Optional
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "mt-3 break-words text-[13px] leading-[1.45]",
                  errors[slot.key]
                    ? "text-ds-danger"
                    : files[slot.key]
                      ? "text-ds-check-ink"
                      : "text-ds-muted",
                )}
              >
                {errors[slot.key] ??
                  (files[slot.key]
                    ? `${files[slot.key]?.name} · ${((files[slot.key]?.size ?? 0) / 1024 / 1024).toFixed(1)} MB`
                    : slot.hint)}
              </p>
            </div>
            <span className="shrink-0 rounded-full py-8 text-[14px] font-semibold">
              <span>{errors[slot.key] ? "Try again" : files[slot.key] ? "Replace" : "Upload"}</span>
              <input
                aria-label={slot.label}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="sr-only"
                disabled={waiting}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const error = documentError(file);
                  setErrors((prev) => ({ ...prev, [slot.key]: error }));
                  setFiles((prev) => {
                    const next = { ...prev };
                    delete next[slot.key];
                    if (!error) next[slot.key] = { name: file.name, size: file.size, file };
                    return next;
                  });
                  e.target.value = "";
                }}
              />
            </span>
          </label>
        ))}
        <p className="text-[13px] leading-[1.45] text-ds-muted">
          You can upload a PDF or a photo. Each file can be up to 2 MB.
        </p>
      </div>
      <div className="flex flex-col gap-14 pt-8 md:flex-row md:items-center md:justify-between">
        <p className="order-2 text-center text-[13px] leading-[1.45] text-ds-muted md:order-none md:flex-1 md:text-left">
          {waiting
            ? "Approve the request in your wallet to send your application."
            : "Your papers stay private. Investors never see them."}
        </p>
        <Button
          className="h-52 w-full justify-between md:w-240 md:shrink-0"
          disabled={!files.registration || !files.bank}
          loading={waiting}
          loadingLabel="Waiting for wallet"
          onClick={onSubmit}
        >
          Send for review
        </Button>
      </div>
    </>
  );
}
