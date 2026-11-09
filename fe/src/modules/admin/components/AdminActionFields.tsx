"use client";

import { Check, Envelope, Info, Truck, Users } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export function AdminActionFields({
  kind,
  selected,
  rejection,
  onRejection,
  reason,
  onReason,
  note,
  onNote,
  limit,
  onLimit,
  invalidLimit,
}: {
  kind: "vote" | "decision" | "limit" | "pause";
  selected: string;
  rejection: boolean;
  onRejection: (value: boolean) => void;
  reason: string;
  onReason: (value: string) => void;
  note: string;
  onNote: (value: string) => void;
  limit: string;
  onLimit: (value: string) => void;
  invalidLimit: boolean;
}) {
  const coast = selected === "Coastline Freight";
  const [wholeLimit = "", ...fraction] = limit.split(".");
  const displayedLimit = [wholeLimit.replace(/\B(?=(\d{3})+(?!\d))/g, ","), ...fraction].join(".");
  const countField = (
    <Input
      className="admin-limit-field"
      label={kind === "limit" ? "New limit" : "Starting limit"}
      suffix="USDC"
      inputMode="decimal"
      value={displayedLimit}
      onChange={(e) => onLimit(e.target.value.replaceAll(",", ""))}
      error={invalidLimit ? "Enter a limit above zero and no more than 10,000.00 USDC." : undefined}
      hint={
        kind === "limit"
          ? `That is ${Math.round((Number(limit) / 3000 - 1) * 100)}% more. It cannot go above 10,000.00 USDC.`
          : coast
            ? "Check the papers and choose a starting limit."
            : "The assistant suggests 2,000.00 USDC. You can change it."
      }
    />
  );
  const noteField = (
    <label className="admin-note flex flex-col gap-8 text-[14px] leading-17">
      {kind === "decision"
        ? "Note for the company"
        : kind === "limit"
          ? "Reason"
          : "Note for the team"}
      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        className="min-h-96 w-full resize-y rounded-[14px] bg-ds-canvas p-12 text-[14px] leading-17 outline-none focus-visible:outline-2 focus-visible:outline-ds-ink"
      />
    </label>
  );
  const reasons =
    kind === "pause"
      ? ["Late bill", "Report to check", "Other"]
      : kind === "decision"
        ? ["Documents do not match", "Too new", "Payment risk", "Other"]
        : ["Too big a jump", "Needs more history", "Payment risk", "Other"];
  const reasonChoice = (item: string) => (
    <label
      key={item}
      className={cn(
        "press relative flex cursor-pointer items-center gap-6 rounded-full px-14 py-8 text-[13px] leading-16 font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ds-ink",
        reason === item
          ? "bg-ds-ink text-ds-bg"
          : kind === "decision"
            ? "bg-ds-bg"
            : "bg-ds-canvas",
      )}
    >
      <input
        className="sr-only"
        type="radio"
        name="reason"
        checked={reason === item}
        onChange={() => onReason(item)}
      />
      {reason === item && <Check size={14} />}
      {kind === "decision" && item === "Documents do not match" ? "Documents don’t match" : item}
    </label>
  );
  const reasonField = (
    <fieldset className="flex flex-col gap-12">
      <legend className="mb-12 text-[13px] font-medium">
        {kind === "decision" ? "Why are you rejecting it?" : "Why?"}
      </legend>
      {kind === "decision" ? (
        <div className="flex flex-col gap-8">
          {[reasons.slice(0, 2), reasons.slice(2)].map((row, index) => (
            <div key={index} className="flex flex-wrap gap-8">
              {row.map(reasonChoice)}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-6">{reasons.map(reasonChoice)}</div>
      )}
    </fieldset>
  );
  return (
    <>
      <p className="admin-sheet-subtitle text-[13px] leading-16 text-ds-muted">
        {kind === "vote"
          ? selected === "Meridian Shipping"
            ? "Start Meridian Shipping · 2,000.00 USDC"
            : "Raise Northwind’s limit · 3,000.00 → 5,000.00 USDC"
          : kind === "limit"
            ? "Now 3,000.00 USDC · 2,400.00 in use"
            : kind === "pause"
              ? "They cannot approve new trips until the team turns it back on."
              : coast
                ? "Applied yesterday · 25 trips a month"
                : "Applied today · 40 trips a month"}
      </p>
      {kind === "decision" ? (
        <div className="flex flex-col gap-10">
          <div
            className={cn(
              "admin-decision-option rounded-[16px] border-[1.5px] p-16",
              !rejection ? "border-ds-ink bg-ds-brand-soft" : "border-ds-line bg-ds-canvas",
            )}
          >
            <label className="flex cursor-pointer items-center gap-10 text-[16px] leading-20 font-semibold">
              <input
                type="radio"
                name="decision"
                checked={!rejection}
                onChange={() => onRejection(false)}
                className="size-20 accent-ds-ink"
              />
              Approve
              {rejection && (
                <span className="text-[13px] font-normal text-ds-muted">
                  · {displayedLimit || "0"} USDC starting limit
                </span>
              )}
            </label>
            {!rejection && <div className="mt-16">{countField}</div>}
          </div>
          <div
            className={cn(
              "admin-decision-option rounded-[16px] border-[1.5px] p-16",
              rejection
                ? "admin-decision-rejected border-ds-danger bg-ds-danger-stamp"
                : "border-transparent bg-ds-canvas",
            )}
          >
            <label className="flex cursor-pointer items-center gap-10 text-[16px] leading-20 font-semibold">
              <input
                type="radio"
                name="decision"
                checked={rejection}
                onChange={() => onRejection(true)}
                className="size-20 accent-ds-danger"
              />
              Reject
            </label>
            {rejection ? (
              <div className="mt-16 flex flex-col gap-16">
                {reasonField}
                {noteField}
              </div>
            ) : (
              <p className="mt-2 ml-30 text-[12px] text-ds-muted">
                You will pick a reason. The company sees it.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          {kind === "limit" ? countField : reasonField}
          {kind !== "pause" && noteField}
        </>
      )}
      <div className="flex gap-10 rounded-[14px] bg-ds-canvas p-14 text-[13px] leading-16 text-ds-ink-2">
        {kind === "pause" ? (
          <Truck size={18} className="shrink-0" />
        ) : kind === "limit" ? (
          <Users size={18} className="shrink-0" />
        ) : kind === "decision" ? (
          rejection ? (
            <Envelope size={18} className="shrink-0" />
          ) : (
            <Users size={18} className="shrink-0" />
          )
        ) : (
          <Info size={18} className="shrink-0" />
        )}
        <p>
          {kind === "pause"
            ? "It starts right away. Turning it back on needs 2 of 3 team members. Open trips keep going and drivers still get paid."
            : kind === "vote"
              ? "The change closes when 2 team members reject it. The assistant then waits 7 days before suggesting it again."
              : kind === "decision" && rejection
                ? "The company sees your reason after a real review is submitted. It can apply again after fixing the papers."
                : "The new limit goes live when 2 of the 3 team members approve it."}
        </p>
      </div>
    </>
  );
}
