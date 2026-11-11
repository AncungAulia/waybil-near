"use client";
import { RoleShell } from "@/components/layout/RoleShell";
import { cn } from "@/lib/cn";
import { Approvals } from "./live/Approvals";
import { Shippers } from "./live/Shippers";
import { ShipperDetail } from "./live/ShipperDetail";
import { PoolView } from "./live/PoolView";
import "./admin.css";

/*
 * The team screens on testnet data (#87). Votes, proposals and pauses are the member's own
 * wallet transactions. The backend keeps the notes around them (reasons, pause notes) and the
 * shipper applications. It checks `is_member` on every request.
 */

export type AdminView = "approvals" | "shippers" | "shipper" | "pool";

export function LiveAdmin({
  view,
  account,
  me,
}: {
  view: AdminView;
  account?: string;
  me: string;
}) {
  const current =
    view === "approvals" ? "/admin" : view === "pool" ? "/admin/pool" : "/admin/shippers";
  return (
    <div
      className={cn(
        "admin-ui",
        view === "approvals" && "admin-approvals",
        view === "shipper" && "admin-detail",
        view === "pool" && "admin-pool",
      )}
    >
      <RoleShell role="admin" current={current}>
        <div className="flex flex-col gap-24">
          {view === "approvals" ? (
            <Approvals me={me} />
          ) : view === "pool" ? (
            <PoolView />
          ) : view === "shipper" && account ? (
            <ShipperDetail account={account} />
          ) : (
            <Shippers />
          )}
        </div>
      </RoleShell>
    </div>
  );
}
