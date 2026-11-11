"use client";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { SystemGlyph } from "@/components/elements/icons";
import { cn } from "@/lib/cn";
import type { OnboardingState } from "../../data/fixtures";

/** X1 to X5. Not found, errors, no access, offline and signed out. */
export function SystemStep({
  state,
  onRetry,
  onHome,
}: {
  state: OnboardingState;
  onRetry: () => void;
  onHome: () => void;
}) {
  const glyph =
    state === "X1"
      ? "compass"
      : state === "X2"
        ? "cloud-off"
        : state === "X3"
          ? "lock"
          : state === "X4"
            ? "wifi-off"
            : "log-out";
  const title =
    state === "X1"
      ? "Page not found"
      : state === "X2"
        ? "Something went wrong"
        : state === "X3"
          ? "You can’t open this page"
          : state === "X4"
            ? "You’re offline"
            : "You were signed out";
  const note =
    state === "X1"
      ? "This page does not exist or has moved. Check the link or go back home."
      : state === "X2"
        ? "We could not load this page. Try again in a moment."
        : state === "X3"
          ? "This page is for the Waybil team. If you are on the team, switch to your team wallet."
          : state === "X4"
            ? "Check your signal. Waybil opens the page when you are back online."
            : "Your session ended. Sign in again to continue.";
  return (
    <>
      <span
        className={cn(
          "mx-auto grid size-80 place-content-center rounded-full",
          state === "X2"
            ? "bg-ds-danger-result text-ds-danger"
            : "bg-ds-brand-soft text-ds-brand-deep",
        )}
      >
        <SystemGlyph name={glyph} size={34} />
      </span>
      <div className="text-center">
        <h1 className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em] md:text-[40px]">
          {title}
        </h1>
        <p className="mt-10 text-[14px] leading-[1.45] text-ds-muted md:text-[15px]">{note}</p>
      </div>
      <div className="mt-auto flex flex-col gap-20 md:mt-0 md:gap-24">
        <Button
          icon={
            state === "X1" || state === "X3" ? (
              <SystemGlyph name="house" size={17} />
            ) : state === "X5" ? (
              <ArrowRight size={17} />
            ) : (
              <SystemGlyph name="retry" size={17} />
            )
          }
          className="h-52 w-full justify-between"
          onClick={state === "X1" || state === "X3" ? onHome : onRetry}
        >
          {state === "X1" || state === "X3"
            ? "Go home"
            : state === "X5"
              ? "Continue with Google"
              : "Try again"}
        </Button>
        {state !== "X4" && state !== "X5" && (
          <Button
            variant="quiet"
            className="w-full justify-center"
            onClick={
              state === "X1"
                ? () => {
                    if (window.history.length > 1) window.history.back();
                    else onHome();
                  }
                : onHome
            }
          >
            {state === "X1" ? "Go back" : state === "X3" ? "Use a different wallet" : "Go home"}
          </Button>
        )}
      </div>
    </>
  );
}
