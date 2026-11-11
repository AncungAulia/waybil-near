"use client";
import { LIVE } from "@/lib/env";
import { useAuth } from "@/providers/AuthProvider";
import type { AdminState } from "../data/fixtures";
import { AdminScreen } from "./AdminScreen";
import { LiveAdmin, type AdminView } from "./LiveAdmin";

/** The admin routes: live team screens for a signed-in member, the demo otherwise. */
export function Admin({
  view,
  account,
  initialState,
}: {
  view: AdminView;
  account?: string;
  initialState?: AdminState;
}) {
  const { profile } = useAuth();
  if (LIVE && profile?.role === "admin")
    return <LiveAdmin view={view} account={account} me={profile.accountId} />;
  return <AdminScreen initialState={initialState} account={account} />;
}
