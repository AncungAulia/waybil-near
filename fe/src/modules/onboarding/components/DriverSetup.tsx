"use client";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { type OnboardingState } from "../data/fixtures";
import { driverErrors } from "../data/validation";
import { PhoneInput } from "./PhoneInput";
export function DriverSetup({
  state,
  onFinish,
}: {
  state: OnboardingState;
  onFinish: (name: string) => void;
}) {
  const filled = state !== "D1";
  const [draft, setDraft] = useState({
      name: filled ? "Sam Carter" : "",
      phone: filled ? "207 555 0199" : "",
      plate: state === "D3" ? "AB1234" : filled ? "NWF-204" : "",
    }),
    [phoneCode, setPhoneCode] = useState("+1"),
    [touched, setTouched] = useState<Set<string>>(() => new Set(state === "D3" ? ["plate"] : []));
  const errors = driverErrors(draft, phoneCode);
  const waiting = state === "D5";
  function edit(key: keyof typeof draft, value: string) {
    setDraft({ ...draft, [key]: value });
    setTouched((t) => new Set(t).add(key));
  }
  return (
    <>
      <div>
        <h1 className="text-title md:text-[40px] md:leading-tight">
          A bit about you and your truck
        </h1>
        <p className="mt-12 text-label text-ds-muted">
          Shipping companies see this when they hire you. It takes about a minute.
        </p>
      </div>
      <form
        className="flex flex-col gap-20"
        onSubmit={(e) => {
          e.preventDefault();
          if (!Object.values(errors).some(Boolean)) onFinish(draft.name);
        }}
      >
        <Input
          label="Full name"
          placeholder="Your name"
          value={draft.name}
          disabled={waiting}
          onChange={(e) => edit("name", e.target.value)}
          error={touched.has("name") ? errors.name : undefined}
        />
        <PhoneInput
          value={draft.phone}
          onChange={(value) => edit("phone", value)}
          code={phoneCode}
          onCodeChange={(code) => {
            setPhoneCode(code);
            setTouched((previous) => new Set(previous).add("phone"));
          }}
          initialOpen={state === "D4"}
          disabled={waiting}
          error={touched.has("phone") ? errors.phone : undefined}
        />
        <Input
          label="Truck plate number"
          placeholder="NWF-204"
          value={draft.plate}
          disabled={waiting}
          onChange={(e) => edit("plate", e.target.value.toUpperCase())}
          error={touched.has("plate") ? errors.plate : undefined}
          hint="Write it as it appears on the plate."
        />
        <div className="rounded-row bg-ds-canvas p-16">
          <p className="text-caption text-ds-muted">Payout account</p>
          <p className="mt-4 break-all text-label">sam.users.waybil.testnet</p>
          <p className="mt-8 text-caption text-ds-muted">
            Every payment lands here automatically after setup.
          </p>
        </div>
        <Button
          className="justify-between"
          type="submit"
          disabled={Object.values(errors).some(Boolean)}
          loading={waiting}
          loadingLabel="Saving"
        >
          Finish setup
        </Button>
      </form>
    </>
  );
}
