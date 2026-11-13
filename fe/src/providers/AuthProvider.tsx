"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Profile, Role, SessionResponse } from "@waybil/shared";
import { api, readSession, saveSession, SESSION_EVENT } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

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

/* Reads the profile and stores it in the session it was read for. */
async function readMe(signal: AbortSignal) {
  const token = readSession()?.token;
  const profile = await api<Profile>("/me", { signal });
  const current = readSession();
  if (token && current?.token === token) saveSession({ ...current, profile });
  return profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();
  const raw = useSyncExternalStore(subscribe, snapshot, () => SERVER);
  const ready = raw !== SERVER;
  const session = ready ? (JSON.parse(raw) as SessionResponse | null) : null;
  const token = session?.token;

  /*
   * The profile can change on another device, so it is read once per session on load. A 401
   * already signs out in api(). Any other failure keeps the stored profile.
   */
  useQuery({
    queryKey: qk.me(),
    queryFn: ({ signal }) => readMe(signal),
    enabled: !!token,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  /* A session that ends (sign-out, or a 401 in api()) drops everything read for it. */
  const lastToken = useRef(token);
  useEffect(() => {
    if (lastToken.current && !token) client.clear();
    lastToken.current = token;
  }, [token, client]);

  const value: Auth = {
    ready,
    session,
    profile: session?.profile ?? null,
    role: session?.profile.role ?? null,
    signIn: (next) => {
      /* Another account's reads never show for this one. The same account reads again. */
      const before = readSession();
      if (before && before.profile.accountId !== next.profile.accountId) client.clear();
      else {
        client.removeQueries({ queryKey: qk.me() });
        void client.invalidateQueries({ queryKey: qk.application(next.profile.accountId) });
      }
      saveSession(next);
    },
    signOut: async () => {
      try {
        await api("/auth/logout", { body: {} });
      } finally {
        saveSession(null);
        client.clear();
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
