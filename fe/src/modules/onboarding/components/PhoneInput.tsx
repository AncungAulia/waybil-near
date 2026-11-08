"use client";
import { Input } from "@/components/ui/Input";
import { SearchPicker } from "./SearchPicker";
import { COUNTRIES } from "../data/fixtures";
export function PhoneInput({
  value,
  onChange,
  code,
  onCodeChange,
  error,
  disabled = false,
  initialOpen = false,
}: {
  value: string;
  onChange: (value: string) => void;
  code: string;
  onCodeChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  initialOpen?: boolean;
}) {
  return (
    <Input
      label="Phone or WhatsApp"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode="tel"
      placeholder="207 555 0142"
      error={error}
      disabled={disabled}
      hint="Type it the way you say it."
      prefix={
        <SearchPicker
          className="w-68 shrink-0 gap-0 border-r border-ds-line pr-8 [&>span]:sr-only [&>button]:h-40 [&>button]:rounded-none [&>button]:px-0"
          label="Phone code"
          value={code}
          options={COUNTRIES.map((c) => ({ value: c.code, label: `${c.name} ${c.code}` }))}
          onChange={onCodeChange}
          initialOpen={initialOpen}
          disabled={disabled}
        />
      }
    />
  );
}
