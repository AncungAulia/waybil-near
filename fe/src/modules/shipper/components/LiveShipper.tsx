"use client";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { BackLink } from "@/components/elements/BackLink";
import {
  SkeletonGroup,
  SkeletonHeader,
  SkeletonListPanel,
  SkeletonStats,
} from "@/components/elements/Skeleton";
import { cn } from "@/lib/cn";
import { LiveShipment } from "./LiveShipment";
import { useLiveShipper } from "../hooks/useLiveShipper";
import { FULL, NotApproved } from "./live/shared";
import { Skeleton, SkeletonTripPage } from "@/components/elements/Skeleton";
import { Home } from "./live/Home";
import { Shipments } from "./live/Shipments";
import { NewLiveShipment } from "./live/NewLiveShipment";
import { Network } from "./live/Network";
import { Credit } from "./live/Credit";

export { Alert, failure } from "./live/shared";

/*
 * The shipper screens on testnet data (#84). Every action is a transaction signed by the
 * shipper's wallet, except invites and the credit review, which go to the backend.
 */

export type ShipperView = "home" | "shipments" | "detail" | "new" | "network" | "credit";

export function LiveShipper({
  view,
  account,
  name,
  shipmentId,
}: {
  view: ShipperView;
  account: string;
  name: string;
  shipmentId?: number;
}) {
  const { data, failed, refresh } = useLiveShipper(account);
  const current =
    view === "network"
      ? "/shipper/network"
      : view === "home" || view === "credit"
        ? "/shipper"
        : "/shipper/shipments";
  const detail = view === "detail" || view === "new";
  return (
    <RoleShell role="shipper" current={current} detail={detail}>
      <div className="flex flex-col gap-24">
        {detail && <BackLink href="/shipper/shipments">Shipments</BackLink>}
        {failed ? (
          <Panel className={cn("grid place-content-center gap-12 text-center", FULL)}>
            <p className="text-label text-ds-muted">
              We could not load your shipments. Try again in a moment.
            </p>
            <Button variant="secondary" className="mx-auto" onClick={refresh}>
              Try again
            </Button>
          </Panel>
        ) : !data ? (
          <ShipperSkeleton view={view} />
        ) : !data.shipper ? (
          <NotApproved />
        ) : view === "home" ? (
          <Home data={data} name={name} />
        ) : view === "shipments" ? (
          <Shipments data={data} />
        ) : view === "detail" ? (
          <LiveShipment data={data} id={shipmentId ?? 0} />
        ) : view === "new" ? (
          <NewLiveShipment data={data} />
        ) : view === "network" ? (
          <Network data={data} />
        ) : (
          <Credit data={data} />
        )}
      </div>
    </RoleShell>
  );
}

/*
 * While the shipper's data loads, each page shows a skeleton in its own shape, so the page
 * that follows takes its place without a second, different skeleton in between.
 */
function ShipperSkeleton({ view }: { view: ShipperView }) {
  if (view === "detail") return <SkeletonTripPage label="Loading this shipment." />;
  const label = "Loading your shipments.";
  if (view === "shipments")
    return (
      <SkeletonGroup label={label} className={cn("flex flex-col gap-24", FULL)}>
        <SkeletonHeader />
        <Skeleton className="h-44 w-full rounded-full md:w-380" />
        <SkeletonListPanel rows={5} title={false} />
      </SkeletonGroup>
    );
  if (view === "network")
    return (
      <SkeletonGroup label="Loading your network." className={cn("flex flex-col gap-24", FULL)}>
        <SkeletonHeader />
        <div className="grid flex-1 gap-16 lg:grid-cols-2">
          <Skeleton className="h-260 w-full rounded-card lg:h-full" />
          <Skeleton className="h-260 w-full rounded-card lg:h-full" />
        </div>
      </SkeletonGroup>
    );
  if (view === "new")
    return (
      <SkeletonGroup label="Loading the form." className={cn("flex flex-col gap-24", FULL)}>
        <SkeletonHeader />
        <div className="grid gap-24 lg:grid-cols-[minmax(0,1fr)_400px]">
          <Skeleton className="h-560 w-full rounded-card" />
          <Skeleton className="h-480 w-full rounded-card" />
        </div>
      </SkeletonGroup>
    );
  if (view === "credit")
    return (
      <SkeletonGroup label="Loading your credit." className={cn("flex flex-col gap-24", FULL)}>
        <SkeletonHeader />
        <Skeleton className="h-200 w-full rounded-card" />
        <Skeleton className="h-260 w-full rounded-card" />
      </SkeletonGroup>
    );
  return (
    <SkeletonGroup label={label} className={cn("flex flex-col gap-24", FULL)}>
      <SkeletonHeader />
      <SkeletonStats />
      <SkeletonListPanel rows={5} />
    </SkeletonGroup>
  );
}
