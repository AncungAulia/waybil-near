"use client";
import { Input } from "@/components/ui/Input";
import { SearchPicker } from "./SearchPicker";
import { COUNTRIES } from "../data/fixtures";
import { cn } from "@/lib/cn";
const COUNTRY_FLAGS: Record<string, string> = {
  "+62": "/flags/id.svg",
  "+1": "/flags/us.svg",
  "+60": "/flags/my.svg",
  "+65": "/flags/sg.svg",
  "+63": "/flags/ph.svg",
  "+66": "/flags/th.svg",
  "+84": "/flags/vn.svg",
};
export function PhoneInput({
  value,
  onChange,
  code,
  onCodeChange,
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
  error?: string;
  disabled?: boolean;
  initialOpen?: boolean;
  appearance?: "company";
  showHint?: boolean;
  popoverAlign?: "start" | "end";
}) {
  return (
    <Input
      label="Phone or WhatsApp"
      className={appearance === "company" ? "[&>div]:gap-12 [&>div]:pr-16 [&>div]:pl-6" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode="tel"
      placeholder={code === "+62" ? "812 3456 7890" : "207 555 0142"}
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
          value={code}
          options={COUNTRIES.map((c) => ({
            value: c.code,
            label: appearance === "company" ? c.name : `${c.name} ${c.code}`,
            flag: COUNTRY_FLAGS[c.code],
          }))}
          onChange={onCodeChange}
          initialOpen={initialOpen}
          disabled={disabled}
        />
      }
    />
  );
}
