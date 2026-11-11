"use client";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { SearchPicker } from "./SearchPicker";
import { countryForDialCode, dialCode, PHONE_COUNTRIES } from "../data/validation";
import { cn } from "@/lib/cn";
/* Drawn flags for the countries the demo uses most. Every other country shows its emoji flag. */
const FLAG_IMAGES: Record<string, string> = {
  ID: "/flags/id.svg",
  US: "/flags/us.svg",
  MY: "/flags/my.svg",
  SG: "/flags/sg.svg",
  PH: "/flags/ph.svg",
  TH: "/flags/th.svg",
  VN: "/flags/vn.svg",
};
const emojiFlag = (iso2: string) =>
  String.fromCodePoint(...[...iso2].map((letter) => 0x1f1a5 + letter.charCodeAt(0)));
/*
 * A phone field with a searchable country code picker that lists every country.
 * `code` is the dial code ("+62"). Pass `country` (ISO2) as well when several countries
 * share a code, like "+1". Without it the main country for the code is shown.
 */
export function PhoneInput({
  value,
  onChange,
  code,
  onCodeChange,
  country,
  onCountryChange,
  error,
  disabled = false,
  initialOpen = false,
  appearance,
  showHint = true,
  popoverAlign,
}: {
  value: string;
  onChange: (value: string) => void;
  code: string;
  onCodeChange: (value: string) => void;
  country?: string;
  onCountryChange?: (iso2: string) => void;
  error?: string;
  disabled?: boolean;
  initialOpen?: boolean;
  appearance?: "company";
  showHint?: boolean;
  popoverAlign?: "start" | "end";
}) {
  /* Remembers the pick when the parent only keeps the dial code. */
  const [picked, setPicked] = useState<string>();
  const iso2 =
    country ||
    (picked && dialCode(picked) === code ? picked : undefined) ||
    countryForDialCode(code) ||
    "";
  return (
    <Input
      label="Phone or WhatsApp"
      className={appearance === "company" ? "[&>div]:gap-12 [&>div]:pr-16 [&>div]:pl-6" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode="tel"
      placeholder={
        iso2 === "ID" ? "812 3456 7890" : iso2 === "US" ? "207 555 0142" : "Phone number"
      }
      error={error}
      disabled={disabled}
      hint={
        !showHint || (appearance === "company" && value && !initialOpen)
          ? undefined
          : "Type it the way you say it."
      }
      prefix={
        <SearchPicker
          className={cn(
            "w-68 shrink-0 gap-0 border-r border-ds-line pr-8 [&>span]:sr-only [&>button]:h-40 [&>button]:rounded-none [&>button]:px-0",
            appearance === "company" &&
              "w-104 border-ds-line-strong [&>button]:border-0 [&>button]:bg-transparent [&>button]:px-4 [&>button]:text-[15px]",
          )}
          appearance={appearance}
          popoverAlign={popoverAlign}
          label="Phone code"
          value={iso2}
          options={PHONE_COUNTRIES.map((c) => ({
            value: c.iso2,
            label: appearance === "company" ? c.name : `${c.name} ${c.code}`,
            detail: c.code,
            flag: FLAG_IMAGES[c.iso2] ?? emojiFlag(c.iso2),
          }))}
          onChange={(next) => {
            setPicked(next);
            onCountryChange?.(next);
            onCodeChange(dialCode(next));
          }}
          initialOpen={initialOpen}
          disabled={disabled}
        />
      }
    />
  );
}
