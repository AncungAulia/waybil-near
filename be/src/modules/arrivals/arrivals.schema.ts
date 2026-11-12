import { z } from "zod";

/** No 0, 1, I, L or O, so a code read aloud or typed from a screen is not mistaken. */
export const ARRIVAL_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const ARRIVAL_CODE_LENGTH = 8;

/** An arrival code as typed or scanned. Case and spaces are ignored. */
export const arrivalCode = z
  .string()
  .max(64)
  .transform((value) => value.replace(/\s+/g, "").toUpperCase())
  .pipe(z.string().regex(new RegExp(`^[${ARRIVAL_CODE_ALPHABET}]{${ARRIVAL_CODE_LENGTH}}$`)));
export const arrivalLookup = z.object({ code: arrivalCode }).strict();
