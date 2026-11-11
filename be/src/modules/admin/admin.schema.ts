import { z } from "zod";
import { accountId, shipmentId } from "../../middlewares/validate";
export const proposalReasonInput = z
  .object({
    reason: z.enum(["too_big_jump", "needs_history", "payment_risk", "other"]),
    note: z.string().trim().max(2000).default(""),
  })
  .strict();
export const proposalParam = z.object({ id: shipmentId });
export const pauseInput = z
  .object({
    shipperId: accountId,
    reason: z.enum(["payment_risk", "late_bills", "other"]),
    note: z.string().trim().max(2000).default(""),
    txHash: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  })
  .strict();
export const shipperParam = z.object({ shipper: accountId });
