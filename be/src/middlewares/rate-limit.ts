import { rateLimit } from "express-rate-limit";
export function limiter(limit: number, windowMs = 60000) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "E_RATE_LIMIT", message: "Please wait before trying again." } },
  });
}
