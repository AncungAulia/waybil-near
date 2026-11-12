import type { Request } from "express";
import { rateLimit } from "express-rate-limit";
/** `key` counts requests per value, for example per signed-in account, instead of per address. */
export function limiter(limit: number, windowMs = 60000, key?: (req: Request) => string) {
  return rateLimit({
    windowMs,
    limit,
    ...(key ? { keyGenerator: key } : {}),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "E_RATE_LIMIT", message: "Please wait before trying again." } },
  });
}
