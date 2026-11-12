import { z } from "zod";

export const placeSearch = z.object({ q: z.string().trim().min(3).max(200) });
export const placeReverse = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
});
export const placeCreate = z
  .object({
    kind: z.enum(["pickup", "destination"]),
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(300),
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
  })
  .strict();
export const placeId = z.uuid();
export const placeRoute = z.object({ from: z.uuid(), to: z.uuid() });
