import { z } from "zod";
const common = {
  name: z.string().trim().min(1).max(120),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
};
export const inviteCreate = z.discriminatedUnion("type", [
  z.object({ ...common, type: z.literal("driver") }).strict(),
  z
    .object({ ...common, type: z.literal("warehouse"), address: z.string().trim().min(1).max(500) })
    .strict(),
]);
export const codeParam = z.object({ code: z.string().regex(/^[a-f0-9]{24}$/) });
