"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@waybil/shared";
import { LIVE } from "@/lib/env";
import { useAuth } from "@/providers/AuthProvider";
import { OnboardingScreen } from "./OnboardingScreen";

/**
 * Shows a role's screens only to that role. No session goes to sign in, and the wrong role
 * sees X3. With the live path off, everyone sees the demo screens as before.
 */
export function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const { ready, role: current } = useAuth();
  const router = useRouter();
  const signedOut = LIVE && ready && !current;

  useEffect(() => {
    if (signedOut) router.replace("/start");
  }, [signedOut, router]);

  if (!LIVE) return children;
  if (!ready || !current) return null;
  if (current !== role) return <OnboardingScreen initialState="X3" />;
  return children;
}
