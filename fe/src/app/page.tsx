"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@waybil/shared";
import { readSession } from "@/lib/api";
import { LIVE } from "@/lib/env";

/* Each role's home, where a signed-in person lands from "/". */
const HOME: Record<Role, string> = {
  shipper: "/shipper",
  driver: "/driver",
  warehouse: "/warehouse",
  investor: "/pool",
  admin: "/admin",
};

/*
 * The session lives in this browser's storage, so only the browser can tell who is signed in.
 * Someone still signed in goes straight to their home. Everyone else picks a role at /start.
 * The demo build always starts at /start.
 */
export default function Page() {
  const router = useRouter();
  useEffect(() => {
    const role = LIVE ? readSession()?.profile.role : undefined;
    router.replace(role ? HOME[role] : "/start");
  }, [router]);
  return null;
}
