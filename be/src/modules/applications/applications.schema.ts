import { z } from "zod";
const text = (length = 120) => z.string().trim().min(1).max(length);
export const companyInput = z
  .object({
    name: text(),
    registration: z.string().regex(/^\d{13}$/),
    country: text(),
    province: text(),
    city: text(),
    address: text(500),
    postal: text(20),
    contact: text(),
    job: text(),
    phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
    email: z.email().max(254),
    trips: z.number().int().positive().max(1000000),
    shippingSpend: z
      .string()
      .regex(/^[1-9]\d{0,38}$/)
      .refine((v) => BigInt(v) <= (1n << 128n) - 1n),
    routes: text(500),
  })
  .strict();
export const applicationId = z.object({ id: z.uuid() });
export const documentInput = z
  .object({ kind: z.enum(["registration", "bank_statement", "tax_id"]) })
  .strict();
export const rejectionInput = z
  .object({
    reason: z.enum(["payment_risk", "needs_history", "unclear_documents", "other"]),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();
export const proposalInput = z
  .object({ proposalId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) })
  .strict();
