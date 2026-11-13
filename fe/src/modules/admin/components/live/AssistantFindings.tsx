"use client";
import { CheckCircle, Warning } from "@phosphor-icons/react";
import type { CreditReviewInfo } from "@waybil/shared";
import { cn } from "@/lib/cn";

/*
 * What the credit assistant read from the papers. The backend sends it as `findings` on a
 * review. Older reviews and older backends have none, so every part here is optional.
 */
export interface Findings {
  currency: string | null;
  monthlyOutgoing: Array<{ month: string; amount: string }>;
  namesMatch: boolean;
  registrationMatches: boolean;
  monthsRecent: boolean;
  outgoingShareBps: number | null;
}

export const findingsOf = (review: CreditReviewInfo | null | undefined): Findings | null =>
  (review as (CreditReviewInfo & { findings?: Findings | null }) | null | undefined)?.findings ??
  null;

/* Reasons are written to the shipper. The team reads them about the shipper instead. */
export const forTeam = (reason: string) =>
  reason.replace(/^Your papers/, "The papers").replace(/^Your /, "The ");

const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthName = (month: string, style: "short" | "long" = "short") =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: style,
    ...(style === "long" ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
const months = (f: Findings) =>
  [...f.monthlyOutgoing]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ ...m, value: Number(m.amount) }))
    .filter((m) => Number.isFinite(m.value));

/* Three small bars, one per month of money going out. The tallest month fills the height. */
export function MonthBars({ findings, className }: { findings: Findings; className?: string }) {
  const list = months(findings);
  if (!list.length) return null;
  const top = Math.max(...list.map((m) => m.value)) || 1;
  return (
    <div
      className={cn("flex items-end gap-6", className)}
      role="img"
      aria-label={`Money out each month. ${list.map((m) => `${monthName(m.month, "long")} ${money(m.value)}`).join(". ")}.`}
    >
      {list.map((m) => (
        <div key={m.month} className="flex flex-col items-center gap-4">
          <div className="flex h-40 items-end">
            <span
              className="block w-16 rounded-[4px] bg-ds-brand-deep"
              style={{ height: `${Math.max(18, (m.value / top) * 100)}%` }}
            />
          </div>
          <span className="text-[11px] leading-13 text-ds-brand-deep">{monthName(m.month)}</span>
        </div>
      ))}
    </div>
  );
}

/* The three checks the server makes before any limit, each a plain sentence with a mark. */
export function FindingChecks({ findings }: { findings: Findings }) {
  const checks = [
    {
      ok: findings.namesMatch,
      yes: "The company name matches the papers.",
      no: "The company name does not match the papers.",
    },
    {
      ok: findings.registrationMatches,
      yes: "The registration number matches.",
      no: "The registration number does not match.",
    },
    {
      ok: findings.monthsRecent,
      yes: "The statement covers the last three months.",
      no: "The statement does not cover the last three months.",
    },
  ];
  return (
    <ul className="flex flex-col gap-8">
      {checks.map((c) => (
        <li key={c.yes} className="flex items-start gap-10 text-label">
          {c.ok ? (
            <CheckCircle size={18} weight="fill" className="mt-1 shrink-0 text-ds-success" />
          ) : (
            <Warning size={18} weight="fill" className="mt-1 shrink-0 text-ds-warning" />
          )}
          {c.ok ? c.yes : c.no}
        </li>
      ))}
    </ul>
  );
}

/* Each month's money out, and how the suggestion follows from their average. */
export function MonthTable({ findings }: { findings: Findings }) {
  const list = months(findings);
  if (!list.length) return null;
  const average = list.reduce((t, m) => t + m.value, 0) / list.length;
  const unit = findings.currency ?? "";
  return (
    <div className="flex flex-col gap-4 rounded-row bg-ds-canvas p-16">
      <p className="mb-4 text-label font-medium">Money out each month</p>
      {list.map((m) => (
        <div key={m.month} className="flex items-center justify-between gap-8 text-label">
          <span className="text-ds-muted">{monthName(m.month, "long")}</span>
          <span className="tabular-nums">
            {money(m.value)} {unit}
          </span>
        </div>
      ))}
      <div className="mt-6 flex items-center justify-between gap-8 border-t border-ds-line pt-10 text-label">
        <span className="text-ds-muted">Average</span>
        <span className="font-medium tabular-nums">
          {money(average)} {unit}
        </span>
      </div>
      {findings.outgoingShareBps !== null && (
        <p className="mt-4 text-caption text-ds-muted">
          The suggestion is {findings.outgoingShareBps / 100}% of the average, up to the policy cap.
        </p>
      )}
    </div>
  );
}
