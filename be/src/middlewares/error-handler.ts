import type { ErrorRequestHandler } from "express";
import { logError } from "../lib/logger";
import { ApiException } from "../lib/errors";
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  void _next;
  const bodyError = error as { type?: string };
  const normalized =
    error instanceof ApiException
      ? error
      : bodyError?.type === "entity.too.large"
        ? new ApiException(413, "E_TOO_LARGE")
        : bodyError?.type === "entity.parse.failed"
          ? new ApiException(400, "E_VALIDATION")
          : new ApiException(500, "E_INTERNAL");
  if (normalized.status >= 500)
    logError("http", error, { route: _req.route?.path ?? "unmatched", code: normalized.code });
  res
    .status(normalized.status)
    .json({ error: { code: normalized.code, message: normalized.message } });
};
