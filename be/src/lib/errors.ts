import { HTTP_ERRORS, type ErrorCode } from "@waybil/shared";

export class ApiException extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message?: string,
  ) {
    super(message ?? HTTP_ERRORS[code as keyof typeof HTTP_ERRORS] ?? HTTP_ERRORS.E_INTERNAL);
  }
}
export function unavailable(): never {
  throw new ApiException(503, "E_UNAVAILABLE");
}
export function conflict(): never {
  throw new ApiException(409, "E_CONFLICT");
}
export function requireValue<T>(value: T | null | undefined): T {
  if (value == null) throw new ApiException(404, "E_NOT_FOUND");
  return value;
}
export function allowed(condition: unknown): asserts condition {
  if (!condition) throw new ApiException(403, "E_ACCESS");
}
