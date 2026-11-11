import { z } from "zod";
import { accountId } from "../../middlewares/validate";

/** `?ids=a.testnet,b.testnet`, one to fifty account ids, each named once. */
export const profileIds = z.object({
  ids: z
    .string()
    .max(64 * 50 + 49)
    .transform((value) => [...new Set(value.split(",").map((id) => id.trim()))])
    .pipe(z.array(accountId).min(1).max(50)),
});
