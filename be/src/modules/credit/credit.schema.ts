import { z } from "zod";
import { ApiException } from "../../lib/errors";
import { parseUsdc } from "@waybil/shared";
export const reviewRequest = z.object({}).strict();
export const amount = z
  .string()
  .regex(/^\d{1,39}$/)
  .refine((v) => BigInt(v) <= (1n << 128n) - 1n);
export const creditPolicy = z
  .object({
    version: z.string().min(1).max(80),
    currency: z.string().regex(/^[A-Z]{3}$/),
    outgoingFractionBps: z.number().int().positive().max(10000),
    usdcNumerator: z.string().regex(/^[1-9]\d{0,17}$/),
    usdcDenominator: z.string().regex(/^[1-9]\d{0,17}$/),
    maxLimit: amount.refine((v) => BigInt(v) > 0n),
  })
  .strict();
export type CreditPolicy = z.infer<typeof creditPolicy>;
export function policyFrom(value: string): CreditPolicy | null {
  if (!value) return null;
  try {
    return creditPolicy.parse(JSON.parse(value));
  } catch {
    throw new ApiException(503, "E_CREDIT_POLICY", "The credit review policy is not ready.");
  }
}
/*
 * A model often answers null for a field it could not read, for example on a photo that is not
 * a paper. Null reads as an empty value, so the papers end as "needs a closer look" instead of
 * failing the format check and being retried as a technical error.
 */
const text = (max: number) => z.preprocess((v) => v ?? "", z.string().max(max));
export const extractedPapers = z
  .object({
    readable: z.boolean(),
    registrationCompany: text(256),
    registrationNumber: text(80),
    bankCompany: text(256),
    currency: text(3),
    monthlyOutgoing: z.preprocess(
      (v) => v ?? [],
      z
        .array(
          z
            .object({
              month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
              amount: z.string().regex(/^\d{1,20}(?:\.\d{1,6})?$/),
            })
            .strict(),
        )
        .max(3),
    ),
    reasons: z.preprocess((v) => v ?? [], z.array(z.string().max(500)).max(6)),
  })
  .strict();
export type ExtractedPapers = z.infer<typeof extractedPapers>;
export function targetLimit(policy: CreditPolicy, papers: ExtractedPapers): string {
  if (papers.currency !== policy.currency || papers.monthlyOutgoing.length !== 3)
    throw new ApiException(409, "E_PAPERS", "Your papers need a closer look.");
  const average =
    papers.monthlyOutgoing.reduce((total, entry) => total + parseUsdc(entry.amount), 0n) / 3n;
  const target =
    (average * BigInt(policy.usdcNumerator) * BigInt(policy.outgoingFractionBps)) /
    (BigInt(policy.usdcDenominator) * 10000n);
  return (target > BigInt(policy.maxLimit) ? BigInt(policy.maxLimit) : target).toString();
}
