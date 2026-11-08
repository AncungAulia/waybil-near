// Public values only. Never put secrets in NEXT_PUBLIC_* variables.

/** Where "Open the app" and "Start shipping" lead, for example https://app.waybil.xyz */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
