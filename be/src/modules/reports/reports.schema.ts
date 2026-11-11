import { z } from "zod";
import { shipmentId } from "../../middlewares/validate";
export const reportInput = z
  .object({
    shipmentId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    goodQty: z.number().int().min(0).max(4294967295),
    reasons: z
      .array(z.enum(["damaged", "missing", "wrong_goods", "other"]))
      .min(1)
      .max(4),
    note: z.string().trim().min(1).max(2000),
  })
  .strict();
export const reportParam = z.object({ shipmentId });
export const reportMultipart = z.object({ report: z.string().min(1).max(12000) }).strict();
