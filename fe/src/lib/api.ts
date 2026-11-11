import { HTTP_ERRORS, type ErrorCode, type SessionResponse } from "@waybil/shared";

/*
 * Fetch wrapper for the backend. Every call goes through the /api proxy (next.config.ts).
 * The session lives in localStorage, so this file and AuthProvider share it without React.
 */

const SESSION_KEY = "waybil-session-v1";
/** Fired in this tab when the session changes. Other tabs get the `storage` event. */
export const SESSION_EVENT = "waybil-session";

export function readSession(): SessionResponse | null {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as SessionResponse;
    return session?.token && Date.parse(session.expiresAt) > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionResponse | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* Storage blocked: the session lasts until the page closes. */
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | "E_NETWORK",
    message: string,
  ) {
    super(message);
  }
  /** Rate limits and a busy signer clear up on their own, so the screen offers "Try again". */
  get retryable() {
    return this.status === 429 || this.status === 503 || this.code === "E_NETWORK";
  }
}

/** A 404 from these means "nothing yet", not an error. */
const NOTHING_YET = ["/applications/me", "/credit/reviews/me"];

/**
 * Calls `/api${path}`. Pass a plain object as `body` for JSON, or FormData for uploads.
 * Returns null for a 404 on the "nothing yet" routes.
 */
export async function api<T>(
  path: string,
  {
    body,
    method = body === undefined ? "GET" : "POST",
    signal,
  }: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = readSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  const json = body !== undefined && !(body instanceof FormData);
  if (json) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      signal,
      body: json ? JSON.stringify(body) : (body as FormData | undefined),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, "E_NETWORK", "Check your connection and try again.");
  }
  if (res.ok) return (res.status === 204 ? null : await res.json()) as T;
  if (res.status === 404 && NOTHING_YET.includes(path)) return null as T;

  const data = (await res.json().catch(() => null)) as {
    error?: { code?: string; message?: string };
  } | null;
  const code = (
    data?.error?.code && data.error.code in HTTP_ERRORS ? data.error.code : "E_INTERNAL"
  ) as ErrorCode;
  /* Sign-in failures also answer 401 E_SESSION, and the sign-in screen handles those. */
  if (res.status === 401 && code === "E_SESSION" && !path.startsWith("/auth/")) {
    saveSession(null);
    window.location.assign("/start");
  }
  throw new ApiError(res.status, code, HTTP_ERRORS[code]);
}
