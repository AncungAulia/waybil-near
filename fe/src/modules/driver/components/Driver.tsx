"use client";
import { LIVE } from "@/lib/env";
import { useAuth } from "@/providers/AuthProvider";
import type { DriverState } from "../data/fixtures";
import { DriverScreen } from "./DriverScreen";
import { LiveDriver, type DriverView } from "./LiveDriver";

/** The driver routes: live trips for a signed-in driver, the demo story otherwise. */
export function Driver({
  view,
  shipmentId,
  initialState,
}: {
  view: DriverView;
  shipmentId?: number;
  initialState?: DriverState;
}) {
  const { profile } = useAuth();
  if (LIVE && profile?.role === "driver")
    return <LiveDriver view={view} account={profile.accountId} shipmentId={shipmentId} />;
  return <DriverScreen initialState={initialState} shipmentId={shipmentId} />;
}
