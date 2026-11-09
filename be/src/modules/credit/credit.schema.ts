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
export const extractedPapers = z
  .object({
    readable: z.boolean(),
    registrationCompany: z.string().max(256),
    registrationNumber: z.string().max(80),
    bankCompany: z.string().max(256),
    currency: z.string().max(3),
    monthlyOutgoing: z
      .array(
        z
          .object({
            month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
            amount: z.string().regex(/^\d{1,20}(?:\.\d{1,6})?$/),
          })
          .strict(),
      )
      .max(3),
    reasons: z.array(z.string().max(500)).max(6),
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
