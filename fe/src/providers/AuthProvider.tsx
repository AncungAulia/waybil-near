"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import type { Profile, Role, SessionResponse } from "@waybil/shared";
import { api, readSession, saveSession, SESSION_EVENT } from "@/lib/api";

interface Auth {
  /** False on the server and the first render, before localStorage is read. */
  ready: boolean;
  session: SessionResponse | null;
  profile: Profile | null;
  role: Role | null;
  /** Stores a new session after sign-in. */
  signIn: (session: SessionResponse) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<Auth | null>(null);

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(SESSION_EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(SESSION_EVENT, notify);
  };
}
/* A string snapshot keeps useSyncExternalStore stable between reads. */
const snapshot = () => JSON.stringify(readSession());
const SERVER = "server";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => SERVER);
  const ready = raw !== SERVER;
  const session = ready ? (JSON.parse(raw) as SessionResponse | null) : null;
  const token = session?.token;

  /* The profile can change on another device, so refresh it once per session on load. */
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    api<Profile>("/me", { signal: controller.signal })
      .then((profile) => {
        const current = readSession();
        if (current?.token === token) saveSession({ ...current, profile });
      })
      .catch(() => {
        /* A 401 already signed out in api(). Anything else keeps the stored profile. */
      });
    return () => controller.abort();
  }, [token]);

  const value: Auth = {
    ready,
    session,
    profile: session?.profile ?? null,
    role: session?.profile.role ?? null,
    signIn: saveSession,
    signOut: async () => {
      try {
        await api("/auth/logout", { body: {} });
      } finally {
        saveSession(null);
      }
    },
  };
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth needs AuthProvider");
  return auth;
}
