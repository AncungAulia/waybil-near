import { formatUsdc } from "@waybil/shared";
import { Panel } from "@/components/layout/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { CreditMeter } from "@/components/elements/CreditMeter";
import { ProofLink } from "@/components/elements/ProofLink";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { creditUsed, type LiveShipperData } from "../../data/live";

export const GAS = "50000000000000";
export function failure(error: unknown) {
  if (error instanceof ApiError) return error.message;
  const text = String(error);
  if (/reject|cancel|denied|closed/i.test(text))
    return "You said no in your wallet. Nothing was sent.";
  return "It didn’t go through. Nothing changed. Try again in a moment.";
}
export type Done = { text: string; tx?: string } | null;
export function DoneNote({ done }: { done: Done }) {
  if (!done) return null;
  return (
    <Panel className="gap-8">
      <p className="text-label">{done.text}</p>
      {done.tx && <ProofLink tx={done.tx} />}
    </Panel>
  );
}
export function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
      {children}
    </p>
  );
}

/* Fills the window under the navbar, as the other empty states do. */
export const FULL =
  "min-h-[calc(100dvh-184px)] md:min-h-[calc(100dvh-148px)] lg:min-h-[calc(100dvh-156px)]";

export function NotApproved() {
  return (
    <Panel className={cn("grid place-content-center gap-12 text-center", FULL)}>
      <h1 className="text-heading">Your company is not approved yet</h1>
      <p className="mx-auto max-w-380 text-label text-ds-muted">
        Send your company details and papers. The team checks them and sets your first limit.
      </p>
      <ButtonLink href="/onboarding/shipper" className="mx-auto">
        See your application
      </ButtonLink>
    </Panel>
  );
}

export function Meter({ data }: { data: LiveShipperData }) {
  const shipper = data.shipper!;
  const used = creditUsed(shipper);
  const limit = BigInt(shipper.limit);
  return (
    <CreditMeter
      label="Credit used"
      used={formatUsdc(used)}
      limit={formatUsdc(limit)}
      value={limit > 0n ? Number((used * 1000n) / limit) / 1000 : 0}
      left={formatUsdc(limit > used ? limit - used : used - limit)}
      className="w-full"
    />
  );
}
