"use client";
import Link from "next/link";
import Image from "next/image";
import { CaretDown, Check } from "@phosphor-icons/react";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/cn";
import type { OnboardingState } from "../data/fixtures";
import { progress, stateFlags } from "../data/steps";

/** The logo, the wrong-network pill on A4 and the setup progress. */
export function OnboardingHeader({ state }: { state: OnboardingState }) {
  const { setup, investor } = stateFlags(state);
  const { steps, step } = progress(state);
  return (
    <header
      className={cn(
        "relative flex h-40 shrink-0 items-center justify-between gap-20",
        setup && "h-auto min-h-56 px-4 py-8 md:px-8",
      )}
    >
      <Link href="/start" aria-label="Waybil sign in" className="focus-ring">
        {setup ? (
          <span className="flex items-center gap-12">
            <Image
              src="/brand/waybil-symbol.svg"
              alt=""
              width={37}
              height={32}
              className="h-32 w-37"
              loading="eager"
            />
            <span className="text-[34px] leading-[1.2] font-semibold tracking-[-0.8px]">
              waybil
            </span>
          </span>
        ) : (
          <Logo />
        )}
      </Link>
      {state === "A4" && (
        <div
          role="status"
          className="flex shrink-0 items-center gap-10 rounded-full border border-ds-line bg-ds-bg py-5 pr-14 pl-5"
        >
          <span className="grid size-32 place-items-center rounded-full bg-ds-brand text-caption font-medium">
            !
          </span>
          <span className="flex flex-col">
            <span className="text-label font-semibold">Connected</span>
            <span className="text-caption text-ds-danger">Wrong network</span>
          </span>
          {/* The caret is dropped on the smallest phones so the pill fits beside the logo. */}
          <CaretDown size={16} className="text-ds-muted max-[359px]:hidden" />
        </div>
      )}
      {steps.length > 0 && (
        <>
          <p className={cn("text-caption text-ds-muted md:hidden", setup && "text-label")}>
            Step {step} of {steps.length}
          </p>
          <ol
            aria-label="Setup progress"
            className={cn("hidden items-center gap-12 md:flex", setup && "gap-10")}
          >
            {steps.map((label, index) => (
              <li
                key={label}
                aria-current={index + 1 === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-8 whitespace-nowrap text-label",
                  setup && "text-[14px]",
                  setup &&
                    (index + 1 === step
                      ? "font-semibold"
                      : investor && index + 1 < step
                        ? "text-ds-ink"
                        : "text-ds-muted"),
                )}
              >
                <span
                  className={cn(
                    "grid size-28 place-content-center rounded-full border border-ds-line",
                    setup &&
                      "size-26 border-[1.5px] border-ds-line-strong text-[13px] font-semibold",
                    index + 1 < step
                      ? "bg-ds-ink text-ds-bg"
                      : index + 1 === step
                        ? "border-ds-brand bg-ds-brand"
                        : "bg-ds-bg text-ds-muted",
                  )}
                >
                  {index + 1 < step ? <Check size={14} /> : index + 1}
                </span>
                {label}
                {index < steps.length - 1 && (
                  <span
                    className={cn(
                      "mx-4 h-1 w-28 bg-ds-line",
                      setup && "mx-2 h-2 rounded-full bg-ds-muted/40",
                    )}
                  />
                )}
              </li>
            ))}
          </ol>
          <span aria-hidden className="hidden w-76 shrink-0 md:block" />
        </>
      )}
    </header>
  );
}
