import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import { parseUsdc, type ProposalKind, type Shipper } from "@waybil/shared";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { Skeleton, SkeletonGroup, SkeletonRow } from "@/components/elements/Skeleton";
import { ApiError } from "@/lib/api";
import { Empty } from "../AdminParts";

/* Helpers and small states shared by the live team screens. */

export const REASON_WORDS: Record<string, string> = {
  too_big_jump: "too big a jump",
  needs_history: "needs more history",
  payment_risk: "payment risk",
  unclear_documents: "the documents do not match",
  late_bills: "late bills",
  other: "another reason",
};
/* Proposals, votes and pauses are small calls. */
export const GAS = "50000000000000";

export function day(value: string | null | undefined) {
  if (!value) return "";
  const ms = /^\d+$/.test(value) ? Number(BigInt(value) / 1000000n) : Date.parse(value);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(ms));
}
export function failure(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return /reject|cancel|denied|closed/i.test(String(error))
    ? "You said no in your wallet. Nothing was sent."
    : "It didn’t go through. Nothing changed. Try again in a moment.";
}
export function toUnits(value: string) {
  try {
    return parseUsdc(value);
  } catch {
    return 0n;
  }
}
export const asInput = (units: bigint) => String(Number(units) / 1000000);

/**
 * Loads a team page from the shared cache (providers/QueryProvider) and on reload. Errors
 * become a plain sentence. `key` names the page and what it shows, for example "approvals".
 */
export function useLoad<T>(load: () => Promise<T>, key: string) {
  const query = useQuery({ queryKey: qk.admin(key), queryFn: load });
  const { refetch } = query;
  const error = query.error;
  return {
    data: query.data,
    error:
      query.data === undefined && error
        ? error instanceof ApiError
          ? error.message
          : "We could not load this page. Try again in a moment."
        : undefined,
    reload: useCallback(() => void refetch(), [refetch]),
  };
}

/** What a proposal changes, in plain words. */
export function describe(
  kind: ProposalKind,
  shippers: Record<string, Shipper | null>,
  name: (accountId: string) => string = (accountId) => accountId,
) {
  if ("StartShipper" in kind)
    return {
      title: `Start ${name(kind.StartShipper.shipper)}`,
      from: 0n,
      to: BigInt(kind.StartShipper.limit),
    };
  if ("SetLimit" in kind) {
    const now = shippers[kind.SetLimit.shipper]?.limit;
    return {
      title: `Change ${name(kind.SetLimit.shipper)}’s limit`,
      from: now === undefined ? undefined : BigInt(now),
      to: BigInt(kind.SetLimit.limit),
    };
  }
  if ("Unpause" in kind) return { title: `Turn ${name(kind.Unpause.shipper)} back on` };
  if ("CoverFromReserve" in kind)
    return { title: `Cover bill #${kind.CoverFromReserve.shipment_id} from the reserve` };
  if ("Upgrade" in kind) return { title: "Install a new version of Waybil" };
  return { title: "Change a team setting" };
}
export const shipperOf = (kind: ProposalKind) =>
  "StartShipper" in kind
    ? kind.StartShipper.shipper
    : "SetLimit" in kind
      ? kind.SetLimit.shipper
      : "Unpause" in kind
        ? kind.Unpause.shipper
        : null;

export function Failed({ error, reload }: { error: string; reload: () => void }) {
  return (
    <Panel>
      <Empty title="Something went wrong" text={error} />
      <Button variant="secondary" className="mx-auto" onClick={reload}>
        Try again
      </Button>
    </Panel>
  );
}
/** A card of shimmering rows while a team screen loads. */
export function Loading({ label = "Loading." }: { label?: string }) {
  return (
    <SkeletonGroup label={label}>
      <Panel gap={4} className="min-h-240">
        <Skeleton className="mb-8 h-16 w-140" />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </Panel>
    </SkeletonGroup>
  );
}

/** The page title and its line, with an optional fact on the right, level with the line. */
export function Header({
  title,
  note,
  aside,
}: {
  title: string;
  note: string;
  aside?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-12">
      <div className="min-w-0">
        <h1 className="text-title break-all">{title}</h1>
        <p className="mt-6 text-label text-ds-muted">{note}</p>
      </div>
      {aside}
    </header>
  );
}
