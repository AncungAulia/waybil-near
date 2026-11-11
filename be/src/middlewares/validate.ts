import { z } from "zod";
import { ApiException } from "../lib/errors";
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiException(400, "E_VALIDATION");
  return result.data;
}
export const accountId = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/)
  .refine((v) => v.endsWith(".testnet") || /^[a-f0-9]{64}$/.test(v));
export const shipmentId = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
