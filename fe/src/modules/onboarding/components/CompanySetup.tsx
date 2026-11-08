"use client";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { COUNTRIES, CITIES, type CompanyDraft, type OnboardingState } from "../data/fixtures";
import { companyErrors, documentError } from "../data/validation";
import { PhoneInput } from "./PhoneInput";
import { SearchPicker } from "./SearchPicker";
import { cn } from "@/lib/cn";
export function CompanySetup({
  state,
  draft,
  setDraft,
  onContinue,
}: {
  state: OnboardingState;
  draft: CompanyDraft;
  setDraft: (draft: CompanyDraft) => void;
  onContinue: () => void;
}) {
  const [phoneCode, setPhoneCode] = useState("+1");
  const [touched, setTouched] = useState<Set<string>>(
    () => new Set(state === "C3" ? ["registration", "phone"] : []),
  );
  const errors = companyErrors(draft, phoneCode);
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
      className={
        key === "name" || key === "registration"
          ? "md:col-span-3"
          : key === "address"
            ? "md:col-span-4"
            : key === "email"
              ? "md:col-span-6"
              : "md:col-span-2"
      }
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
      <div>
        <h1 className="text-title md:text-[40px] md:leading-tight">Tell us about your company</h1>
        <p className="mt-12 text-label text-ds-muted">
          We check every company because investors pay your truck owners before you do. It takes
          about one business day.
        </p>
      </div>
      <form
        className="grid gap-20 md:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!Object.keys(errors).length) onContinue();
        }}
      >
        {field("name", "Company name", "Your company name")}
        {field("registration", "Business registration number", "13 digits", {
          hint: "Use your company’s official registration ID.",
          inputMode: "numeric",
        })}
        <SearchPicker
          label="Country"
          className="md:col-span-2"
          value={draft.country}
          options={COUNTRIES.map((c) => ({ value: c.name, label: c.name }))}
          onChange={(value) => setDraft({ ...draft, country: value, province: "", city: "" })}
        />
        <SearchPicker
          label="State or province"
          className="md:col-span-2"
          value={draft.province}
          disabled={!draft.country}
          placeholder={draft.country ? "Select province" : "Pick a country first"}
          options={(COUNTRIES.find((c) => c.name === draft.country)?.provinces ?? []).map((p) => ({
            value: p,
            label: p,
          }))}
          onChange={(value) => setDraft({ ...draft, province: value, city: "" })}
          initialOpen={state === "C5"}
          initialQuery="Ma"
        />
        <SearchPicker
          label="City"
          className="md:col-span-2"
          value={draft.city}
          disabled={!draft.province}
          placeholder={draft.province ? "Select city" : "Pick a province first"}
          options={(CITIES[draft.province] ?? []).map((c) => ({ value: c, label: c }))}
          onChange={(value) => edit("city", value)}
        />
        {field("address", "Street address", "Street, number and area")}
        {field("postal", "Postal code", "55284")}
        {field("contact", "Contact person", "Full name", {
          hint: "This is who we talk to about invoices.",
        })}
        {field("job", "Role", "Finance")}
        <div className="md:col-span-2">
          <PhoneInput
            value={draft.phone}
            onChange={(value) => edit("phone", value)}
            code={phoneCode}
            onCodeChange={(code) => {
              setPhoneCode(code);
              setTouched((previous) => new Set(previous).add("phone"));
            }}
            initialOpen={state === "C4"}
            error={touched.has("phone") ? errors.phone : undefined}
          />
        </div>
        {field("email", "Work email", "name@company.com", { inputMode: "email", type: "email" })}
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
        <div className="flex flex-col gap-20 md:col-span-6 md:flex-row md:items-center md:justify-between">
          <p className="text-caption text-ds-muted">
            Your details stay private. Investors only see your company name and limit.
          </p>
          <Button
            type="submit"
            disabled={!!Object.keys(errors).length}
            className="justify-between md:min-w-220"
          >
            Continue
          </Button>
        </div>
      </form>
    </>
  );
}
type FileInfo = { name: string; size: number };
export function CompanyDocuments({
  state,
  onSubmit,
  onBack,
}: {
  state: OnboardingState;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const ready = state === "C5.2" || state === "C6";
  const [files, setFiles] = useState<Partial<Record<string, FileInfo>>>(() =>
    ready
      ? {
          registration: { name: "registration.pdf", size: 1258291 },
          bank: { name: "bank-statement.pdf", size: 1468006 },
        }
      : state === "C5.3"
        ? { registration: { name: "registration.pdf", size: 1258291 } }
        : {},
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>(() =>
    state === "C5.3"
      ? { bank: "This file is 3.4 MB. Use a file up to 2 MB, or take a smaller photo." }
      : {},
  );
  const waiting = state === "C6";
  return (
    <>
      <div>
        <h1 className="text-title md:text-[40px] md:leading-tight">Add your company papers</h1>
        <p className="mt-12 text-label text-ds-muted">
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
          { key: "tax", label: "Tax ID", hint: "This is optional. It helps us check faster." },
        ].map((slot) => (
          <div
            key={slot.key}
            className={cn(
              "flex flex-wrap items-center justify-between gap-16 rounded-row border border-ds-line p-16",
              !files[slot.key] && "bg-ds-canvas",
              errors[slot.key] && "border-ds-danger bg-ds-danger-soft",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-label font-medium">{slot.label}</p>
              <p
                className={cn(
                  "mt-4 break-all text-caption",
                  errors[slot.key]
                    ? "text-ds-danger"
                    : files[slot.key]
                      ? "text-ds-success"
                      : "text-ds-muted",
                )}
              >
                {errors[slot.key] ??
                  (files[slot.key]
                    ? `${files[slot.key]?.name} · ${((files[slot.key]?.size ?? 0) / 1024 / 1024).toFixed(1)} MB`
                    : slot.hint)}
              </p>
            </div>
            <label
              className={cn(
                "focus-ring cursor-pointer rounded-full px-12 py-8 text-label has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ds-brand",
                waiting && "pointer-events-none opacity-50",
              )}
            >
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
                    if (!error) next[slot.key] = { name: file.name, size: file.size };
                    return next;
                  });
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        ))}
      </div>
      <p className="text-caption text-ds-muted">
        Use a PDF, JPG or PNG file up to 2 MB. Use sample files in this preview. Files are never
        uploaded.
      </p>
      <div className="flex flex-col gap-16 md:flex-row md:items-center md:justify-between">
        <Button variant="quiet" disabled={waiting} onClick={onBack}>
          Back to details
        </Button>
        <Button
          className="justify-between md:min-w-240"
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
