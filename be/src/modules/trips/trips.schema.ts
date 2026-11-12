import { z } from "zod";
import { shipmentId } from "../../middlewares/validate";

export const tripParam = z.object({ shipmentId });
export const tripCreate = z.object({ pickupPlaceId: z.uuid() }).strict();
/** `?ids=1,2`, one to fifty shipment ids, each counted once. */
export const tripIds = z.object({
  ids: z
    .string()
    .max(17 * 50 + 49)
    .transform((value) => [...new Set(value.split(",").map((id) => id.trim()))])
    .pipe(
      z
        .array(z.string().regex(/^[1-9][0-9]{0,15}$/))
        .min(1)
        .max(50),
    )
    .transform((ids) => ids.map(Number).filter((id) => id <= Number.MAX_SAFE_INTEGER)),
});
export const locationUpdate = z
  .object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    recordedAt: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();
