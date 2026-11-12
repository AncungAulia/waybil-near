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
          <SkeletonGroup
            label="Loading your shipments."
            className={cn("flex flex-col gap-24", FULL)}
          >
            <SkeletonHeader />
            <SkeletonStats />
            <SkeletonListPanel rows={5} />
          </SkeletonGroup>
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
