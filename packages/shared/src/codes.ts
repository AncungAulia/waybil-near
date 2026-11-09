export type ErrorCode = `E_${string}`;
export const HTTP_ERRORS = {
  E_VALIDATION: "Check the information and try again.",
  E_SESSION: "Please sign in again.",
  E_ACCESS: "You do not have access to this action.",
  E_NOT_FOUND: "This item could not be found.",
  E_CONFLICT: "This item changed. Please refresh and try again.",
  E_UNAVAILABLE: "This service is unavailable. Please try again later.",
  E_INTERNAL: "Something went wrong. Please try again.",
  E_TOO_LARGE: "Use a file up to 2 MB, or take a smaller photo.",
  E_RATE_LIMIT: "Please wait before trying again.",
} as const;
