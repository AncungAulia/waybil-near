"use client";
import { LIVE } from "@/lib/env";
import { useAuth } from "@/providers/AuthProvider";
import type { WarehouseState } from "../data/fixtures";
import { WarehouseScreen } from "./WarehouseScreen";
import { LiveWarehouse, type WarehouseView } from "./LiveWarehouse";

/** The warehouse routes: live arrivals for a signed-in warehouse, the demo story otherwise. */
export function Warehouse({
  view,
  initialState,
}: {
  view: WarehouseView;
  initialState?: WarehouseState;
}) {
  const { profile } = useAuth();
  if (LIVE && profile?.role === "warehouse")
    return <LiveWarehouse view={view} account={profile.accountId} />;
  return <WarehouseScreen initialState={initialState} />;
}
