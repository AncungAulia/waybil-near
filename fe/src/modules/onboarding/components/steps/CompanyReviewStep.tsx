"use client";
import type { Dispatch, SetStateAction } from "react";
import {
  FileMagnifyingGlass,
  Hourglass,
  PencilSimple,
  SealCheck,
  UserPlus,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Application } from "@waybil/shared";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/elements/Money";
import { cn } from "@/lib/cn";
import { ONBOARDING_FIXTURES, type CompanyDraft, type OnboardingState } from "../../data/fixtures";
import { actionClass, Row, StepHeading, StepIcon } from "./parts";

/** C7 to C9. The company's application is in review, approved, or needs one more thing. */
export function CompanyReviewStep({
  state,
  setState,
  company,
  liveCompany,
  application,
  setApplication,
  startLimit,
  dashboard,
}: {
  state: OnboardingState;
  setState: Dispatch<SetStateAction<OnboardingState>>;
  company: CompanyDraft;
  liveCompany: boolean;
  application: Application | null;
  setApplication: Dispatch<SetStateAction<Application | null>>;
  startLimit: string | null;
  dashboard: (path: string) => void;
}) {
  const action = actionClass(state);
  return (
    <>
      <StepIcon
        state={state}
        icon={state === "C8" ? SealCheck : state === "C9" ? FileMagnifyingGlass : Hourglass}
        tone={state === "C9" ? "soft" : state === "C7" ? "quiet" : "brand"}
      />
      <StepHeading
        state={state}
        title={
          state === "C8"
            ? "You’re approved"
            : state === "C9"
              ? "We need one more thing"
              : "We’re checking your company"
        }
        note={
          state === "C8"
            ? `${company.name} can now approve trips. Your drivers get paid early, up to your limit.`
            : state === "C9"
              ? liveCompany && application?.state === "rejected"
                ? "The team did not approve your company this time."
                : "Your review is on hold until this is fixed."
              : `This usually takes one business day. We'll message ${company.contact.split(" ")[0]} on WhatsApp when it's done.`
        }
      />
      {state === "C8" ? (
        <div className="bill-card flex flex-col items-center gap-6 overflow-hidden rounded-[22px] bg-ds-ink px-22 py-20 text-center text-ds-bg">
          <p className="text-label text-ds-role-selected-muted">Your credit limit</p>
          <Money
            amount={
              liveCompany && startLimit ? startLimit : ONBOARDING_FIXTURES[state].shipper.limit
            }
            className="text-[34px] leading-[1.1] font-medium tracking-[-0.035em] md:text-[40px]"
          />
          <p className="text-[12.5px] leading-[1.45] text-ds-brand">It grows as you pay on time.</p>
        </div>
      ) : state === "C9" ? (
        <div className="flex items-start gap-10 rounded-[16px] bg-ds-brand-soft px-16 py-14">
          <WarningCircle size={18} className="mt-1 shrink-0 text-ds-brand-deep" />
          <p className="text-[13.5px] leading-[1.45]">
            {liveCompany && application?.rejection
              ? application.rejection.note ||
                `The reason was ${application.rejection.reason.replaceAll("_", " ")}.`
              : liveCompany
                ? "The team asked for more papers. Update your details and send them again."
                : "The business registration number doesn't match the company name. Check the number on your registration certificate and send it again."}
          </p>
        </div>
      ) : (
        <div className="rounded-row bg-ds-canvas px-18 py-4 [&>div]:py-9 [&>div]:text-[14px] [&>div>span:last-child]:font-medium [&>div+div]:border-t [&>div+div]:border-ds-line">
          <Row label="Company" value={company.name} />
          <Row
            label="Sent"
            value={
              liveCompany && application
                ? new Date(application.updatedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                  })
                : "Nov 11 · 14:31"
            }
          />
          <Row label="Status" value="In review" />
        </div>
      )}
      <div className="mt-auto flex flex-col gap-20 md:mt-0 md:gap-24">
        {state === "C8" ? (
          <>
            <Button className={cn(action, "h-52")} onClick={() => dashboard("/shipper")}>
              Go to dashboard
            </Button>
            <Button
              variant="secondary"
              className="h-52 w-full justify-between"
              icon={<UserPlus size={17} />}
              onClick={() => dashboard("/shipper/network?invite=driver")}
            >
              Invite your first driver
            </Button>
          </>
        ) : (
          <>
            {/* The backend only takes edits in draft or needs_more, not in review. */}
            {!(liveCompany && application?.state === "in_review") && (
              <Button
                variant={state === "C9" ? "primary" : "secondary"}
                icon={state === "C9" ? undefined : <PencilSimple size={17} />}
                className={cn(action, "h-52")}
                onClick={() => {
                  /* A rejected company applies again with a new application. */
                  if (liveCompany && application?.state === "rejected") setApplication(null);
                  setState("C2");
                }}
              >
                {state === "C9" ? "Update details" : "Edit details"}
              </Button>
            )}
            {state === "C9" ? (
              <a
                className="press focus-ring flex h-48 items-center justify-center rounded-full bg-ds-canvas px-18 text-body font-medium text-ds-ink hover:bg-ds-canvas-hover"
                href="https://wa.me/12075550142"
                target="_blank"
                rel="noreferrer"
              >
                Talk to us on WhatsApp ↗
              </a>
            ) : (
              <Button
                variant="quiet"
                className="w-full justify-center"
                onClick={() => setState("A1")}
              >
                Log out
              </Button>
            )}
          </>
        )}
      </div>
    </>
  );
}
