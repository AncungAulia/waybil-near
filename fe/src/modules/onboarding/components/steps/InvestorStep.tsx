"use client";
import type { Dispatch, SetStateAction } from "react";
import { ArrowLineDown, Check, Hourglass, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { WalletGlyph } from "@/components/elements/icons";
import { cn } from "@/lib/cn";
import { BASE_POOL } from "@/lib/demo-pool";
import type { OnboardingState } from "../../data/fixtures";
import { POOL_PERCENT } from "../../data/steps";
import { actionClass, Row, StepHeading } from "./parts";

/** E1 to E3. An investor reads the risks before the first deposit. */
export function InvestorStep({
  state,
  setState,
  understood,
  setUnderstood,
  dashboard,
}: {
  state: OnboardingState;
  setState: Dispatch<SetStateAction<OnboardingState>>;
  understood: boolean;
  setUnderstood: Dispatch<SetStateAction<boolean>>;
  dashboard: (path: string) => void;
}) {
  const investorReady = state === "E3";
  const action = actionClass(state);
  return (
    <>
      {investorReady && (
        <div className="mx-auto mt-auto h-210 w-280 max-w-full shrink-0 overflow-hidden rounded-row bg-ds-canvas md:mt-0">
          <img
            src="/illustrations/investor.svg"
            alt=""
            className="h-full w-full object-contain mix-blend-multiply"
          />
        </div>
      )}
      <StepHeading
        state={state}
        title={state === "E3" ? "You’re in" : "Before you deposit"}
        note={
          state === "E3"
            ? "Here’s how the pool is doing right now."
            : "Here are three things worth knowing. It takes 30 seconds."
        }
      />
      {state === "E3" ? (
        <>
          <div className="rounded-row bg-ds-canvas px-18 py-4 [&>div]:py-9 [&>div]:text-[14px] [&>div>span:last-child]:font-medium [&>div+div]:border-t [&>div+div]:border-ds-line">
            <Row label="Total in the pool" value={<Money amount={BASE_POOL.total_shares} />} />
            <Row label="Paid out early" value={<Money amount={BASE_POOL.lent} />} />
            <Row label="Missed payments" value="0 of 9 trips" />
          </div>
          <div className="mt-auto flex flex-col gap-20 md:mt-0 md:gap-24">
            <Button
              icon={<Plus size={17} />}
              className={cn(action, "h-52")}
              onClick={() => dashboard("/pool?deposit=on")}
            >
              Make your first deposit
            </Button>
            <Button
              variant="quiet"
              className="w-full justify-center"
              onClick={() => dashboard("/pool")}
            >
              Look around first
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-10">
            {[
              {
                Icon: ArrowLineDown,
                title: "Your money pays truck owners early",
                note: `The pool earns ${POOL_PERCENT} of each repaid bill. You receive your share of those earnings.`,
              },
              {
                Icon: Hourglass,
                title: "Some bills get paid late",
                note: "If a company pays late or does not pay, you could lose part of your money.",
              },
              {
                Icon: WalletGlyph,
                title: "Withdraw anytime",
                note: "The free part is paid now. The rest waits until bills are repaid.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-14 rounded-[18px] bg-ds-canvas p-16"
              >
                <span className="grid size-36 shrink-0 place-items-center rounded-full bg-ds-bg">
                  <item.Icon size={17} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-body font-medium">{item.title}</h2>
                  <p className="mt-3 text-[13px] leading-[1.45] text-ds-muted">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-12 p-4 text-body">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={understood}
              onChange={(e) => {
                setUnderstood(e.target.checked);
                setState(e.target.checked ? "E2" : "E1");
              }}
            />
            <span
              aria-hidden
              className={cn(
                "grid size-22 shrink-0 place-items-center rounded-[7px] border-[1.5px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ds-ink",
                understood
                  ? "border-ds-ink bg-ds-ink text-ds-bg"
                  : "border-ds-line-strong bg-ds-bg",
              )}
            >
              {understood && <Check size={14} weight="bold" />}
            </span>
            I understand how the pool works
          </label>
          <Button
            className={cn(action, "mt-auto h-52 shrink-0 md:mt-0")}
            disabled={!understood}
            onClick={() => setState("E3")}
          >
            {understood ? "Continue to the pool" : "Continue"}
          </Button>
        </>
      )}
    </>
  );
}
