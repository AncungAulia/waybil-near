"use client";
import { RoleShell } from "@/components/layout/RoleShell";

/** G1 to G5, X6 and X7. The wallet menu previews, drawn over a placeholder shipper home. */
export function WalletPreviewStep({
  state,
}: {
  state: "G1" | "G2" | "G3" | "G4" | "G5" | "X6" | "X7";
}) {
  return (
    <RoleShell role="shipper" current="/shipper" walletPreview={state}>
      <header>
        <h1 className="text-title">Good morning, Northwind</h1>
        <p className="mt-6 text-label text-ds-muted">Thursday, Nov 12</p>
      </header>
      <div aria-hidden className="mt-24 grid h-560 gap-16 lg:grid-cols-[1fr_400px]">
        <div className="rounded-card bg-ds-bg p-24">
          <div className="h-20 w-160 rounded-full bg-ds-canvas" />
          <div className="mt-24 h-300 rounded-card bg-ds-canvas" />
        </div>
        <div className="rounded-card bg-ds-bg p-24">
          <div className="h-20 w-160 rounded-full bg-ds-canvas" />
        </div>
      </div>
    </RoleShell>
  );
}
