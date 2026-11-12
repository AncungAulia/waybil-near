"use client";
import { useEffect, useState } from "react";
import { normalizePlate } from "@waybil/shared";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { type OnboardingState } from "../data/fixtures";
import { driverErrors } from "../data/validation";
import { PhoneInput } from "@/components/elements/PhoneInput";
import { WalletGlyph } from "@/components/elements/icons";
import { cn } from "@/lib/cn";
import { LIVE } from "@/lib/env";
export function DriverSetup({
  state,
  onFinish,
  initialName,
  payoutAccount,
}: {
  state: OnboardingState;
  /** The signed-in driver's account, where payouts land. The demo shows Sam's. */
  payoutAccount?: string;
  /** The name to start with on D1, for example the one from Google. */
  initialName?: string;
  /** `phone` is in E.164, for example "+12075550199". */
  onFinish: (driver: { name: string; phone: string; plate: string }) => void;
}) {
  const filled = state !== "D1";
  const [draft, setDraft] = useState({
      name: filled ? "Sam Carter" : (initialName ?? ""),
      phone: filled ? "207 555 0199" : "",
      plate: state === "D3" ? "1234" : filled ? "NWF-204" : "",
    }),
    [phoneCode, setPhoneCode] = useState(filled ? "+1" : "+62"),
    [touched, setTouched] = useState<Set<string>>(() => new Set(state === "D3" ? ["plate"] : []));
  /* The signed-in name arrives a moment after the form opens. It fills an empty name only. */
  useEffect(() => {
    if (initialName) setDraft((d) => (d.name ? d : { ...d, name: initialName }));
  }, [initialName]);
  const errors = driverErrors(draft, phoneCode);
  const waiting = state === "D5";
  function edit(key: keyof typeof draft, value: string) {
    setDraft({ ...draft, [key]: value });
    setTouched((t) => new Set(t).add(key));
  }
  return (
    <>
      <div className="flex flex-col gap-10">
        <h1 className="flex flex-col gap-8 text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[40px]">
          <span>A bit about</span>
          <span>you and your truck</span>
        </h1>
        <p className="text-[14px] leading-[1.45] text-ds-muted md:text-[15px]">
          Shipping companies see this when they hire you. It takes about a minute.
        </p>
      </div>
      <form
        className="flex flex-1 flex-col gap-20 md:flex-none md:gap-24"
        onSubmit={(e) => {
          e.preventDefault();
          if (!Object.values(errors).some(Boolean))
            onFinish({
              name: draft.name.trim(),
              phone: `${phoneCode}${draft.phone.replace(/\D/g, "")}`,
              plate: normalizePlate(draft.plate),
            });
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
          appearance="company"
          showHint={false}
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
          className={cn(touched.has("plate") && errors.plate && "[&>div]:bg-ds-bg")}
          label="Truck plate number"
          placeholder="B 1234 EOF"
          value={draft.plate}
          disabled={waiting}
          onChange={(e) => edit("plate", e.target.value.toUpperCase())}
          error={touched.has("plate") ? errors.plate : undefined}
          hint="Write it as it appears on the plate."
        />
        <div className="flex flex-col gap-6">
          <p className="text-[13px] leading-[1.45] text-ds-muted">Payout account</p>
          <p className="flex items-center gap-8 text-[15px] leading-[1.45] font-semibold">
            <WalletGlyph size={16} className="shrink-0" />
            <span className="break-all">
              {payoutAccount ??
                (LIVE ? "Shown after you sign in with Google" : "sam.users.waybil.testnet")}
            </span>
          </p>
          <p className="text-[13px] leading-[1.45] text-ds-muted">
            Every payment lands here automatically after setup.
          </p>
        </div>
        <div className="mt-auto flex flex-col gap-20 md:mt-0 md:gap-24">
          <Button
            className="h-52 w-full justify-between"
            type="submit"
            disabled={Object.values(errors).some(Boolean)}
            loading={waiting}
            loadingLabel="Saving"
          >
            Finish setup
          </Button>
          {waiting && (
            <p role="status" className="text-[13px] leading-[1.45]">
              Saving your details. It takes a second.
            </p>
          )}
        </div>
      </form>
    </>
  );
}
