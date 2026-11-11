"use client";
import type { Dispatch, SetStateAction } from "react";
import { Check } from "@phosphor-icons/react";
import type { Role } from "@waybil/shared";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { LIVE } from "@/lib/env";
import type { OnboardingState } from "../../data/fixtures";
import { GOOGLE_ROLES, WALLET_ROLES } from "../../data/steps";
import type { WalletSignIn } from "../../hooks/useWalletSignIn";
import { actionClass, StepHeading } from "./parts";

/** B1 to B4. A new account picks its role. */
export function RoleStep({
  state,
  setState,
  role,
  setRole,
  google,
  wallet,
}: {
  state: OnboardingState;
  setState: Dispatch<SetStateAction<OnboardingState>>;
  role: Role | null;
  setRole: Dispatch<SetStateAction<Role | null>>;
  /** B3 is the Google path with a truck owner chosen. Every other B state is the wallet path. */
  google: boolean;
  wallet: WalletSignIn;
}) {
  const { pending, walletFlow } = wallet;
  return (
    <>
      <StepHeading
        state={state}
        title="How will you use waybil?"
        note="Pick one. Your account keeps this role, so next time you go straight to your dashboard."
      />
      <fieldset className="grid w-full gap-10 md:gap-14 lg:mx-auto lg:max-w-680 lg:grid-cols-2 lg:gap-20">
        <legend className="sr-only">Choose your role</legend>
        {(google ? GOOGLE_ROLES : WALLET_ROLES).map((item) => (
          <label
            key={item.value}
            className={cn(
              "tap relative grid cursor-pointer grid-cols-[108px_minmax(0,1fr)_22px] items-center gap-12 rounded-[22px] border p-10 hover:border-ds-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ds-brand md:grid-cols-[136px_minmax(0,1fr)_22px] md:gap-18 md:rounded-[26px] md:p-14 lg:flex lg:flex-col lg:items-stretch lg:gap-14 lg:rounded-card lg:px-16 lg:pt-16 lg:pb-28",
              role === item.value
                ? "border-ds-ink bg-ds-ink text-ds-bg"
                : "border-ds-line bg-ds-bg text-ds-ink",
            )}
          >
            <div
              className={cn(
                "h-80 w-108 overflow-hidden rounded-[14px] md:h-102 md:w-136 lg:h-210 lg:w-full lg:rounded-row",
                role === item.value ? "bg-ds-bg" : "bg-ds-canvas",
              )}
            >
              <img
                src={`/illustrations/${item.value}.svg`}
                alt=""
                className={cn(
                  "h-full w-full object-contain",
                  role !== item.value && "mix-blend-multiply",
                )}
              />
            </div>
            <div className="min-w-0 lg:px-8 lg:pt-4">
              <h2 className="text-[17px] font-medium tracking-[-0.4px] md:text-[20px] lg:text-[24px] lg:tracking-[-0.6px]">
                {item.title}
              </h2>
              <p
                className={cn(
                  "mt-4 text-[12.5px] leading-[1.45] md:text-[13.5px] lg:mt-8 lg:text-[14px]",
                  role === item.value ? "text-ds-role-selected-muted" : "text-ds-muted",
                )}
              >
                {item.note}
              </p>
            </div>
            <input
              type="radio"
              name="role"
              value={item.value}
              checked={role === item.value}
              aria-label={item.title}
              className="peer sr-only"
              onChange={() => {
                setRole(item.value);
                setState(item.value === "shipper" ? "B2" : item.value === "investor" ? "B4" : "B3");
              }}
            />
            <span
              aria-hidden
              className={cn(
                "grid size-22 shrink-0 place-items-center rounded-full border-[1.5px] lg:absolute lg:top-28 lg:right-28",
                role === item.value
                  ? "border-ds-brand bg-ds-brand text-ds-ink"
                  : "border-ds-line-strong bg-ds-bg",
              )}
            >
              {role === item.value && <Check size={14} weight="bold" />}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="mt-auto flex w-full flex-col gap-14 md:mx-auto md:mt-0 lg:w-360">
        <Button
          className={cn(actionClass(state), "h-52")}
          disabled={!role}
          onClick={() =>
            LIVE && pending.current && (role === "shipper" || role === "investor")
              ? void walletFlow(role)
              : setState(
                  role === "shipper"
                    ? "C1"
                    : role === "driver"
                      ? "D1"
                      : role === "warehouse"
                        ? "F5"
                        : "E1",
                )
          }
        >
          {role === "warehouse"
            ? "Open the sample invite"
            : role
              ? `Continue as ${role}`
              : "Choose a role"}
        </Button>
        <p className="text-center text-[12.5px] leading-[1.45] text-ds-muted">
          {!google
            ? "Do you own a truck or receive goods? Go back and continue with Google."
            : role === "warehouse"
              ? "Warehouses join from the invite link a shipping company sends. This demo opens a sample invite from Northwind."
              : "Receiving goods at a warehouse? You can also open the invite link you got."}
        </p>
      </div>
    </>
  );
}
