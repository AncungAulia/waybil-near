"use client";
import { LIVE } from "@/lib/env";
import { useAuth } from "@/providers/AuthProvider";
import type { ShipperState } from "../data/fixtures";
import { ShipperScreen } from "./ShipperScreen";
import { LiveShipper, type ShipperView } from "./LiveShipper";

/** The shipper routes: live screens for a signed-in shipper, the demo story otherwise. */
export function Shipper({
  view,
  shipmentId,
  initialState,
  initialReceipt,
}: {
  view: ShipperView;
  shipmentId?: number;
  initialState?: ShipperState;
  initialReceipt?: string;
}) {
  const { profile } = useAuth();
  if (LIVE && profile?.role === "shipper")
    return (
      <LiveShipper
        view={view}
        account={profile.accountId}
        name={profile.name || profile.accountId}
        shipmentId={shipmentId}
      />
    );
  return (
    <ShipperScreen
      initialState={initialState}
      shipmentId={shipmentId}
      initialReceipt={initialReceipt}
    />
  );
}
