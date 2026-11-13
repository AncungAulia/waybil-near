"use client";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
import type { InvitesResponse } from "@waybil/shared";
import { api } from "@/lib/api";
import { getNetwork, getShipper, listShipmentsByShipper, readAll, usdcBalance } from "@/lib/near";
import type { LiveShipperData } from "../data/live";

async function load(account: string): Promise<LiveShipperData> {
  const [shipper, network, shipments, invites, wallet] = await Promise.all([
    getShipper(account),
    getNetwork(account),
    readAll((from, limit) => listShipmentsByShipper(account, { from, limit })),
    api<InvitesResponse>("/invites").then((r) => r.invites),
    usdcBalance(account),
  ]);
  return {
    account,
    shipper,
    network,
    shipments: shipments.sort((a, b) => b.id - a.id),
    invites,
    wallet: BigInt(wallet),
  };
}

/**
 * The signed-in shipper's testnet and backend data, from the shared cache, read again every
 * 10 seconds while the tab is in view. Pass no account to stay idle.
 */
export function useLiveShipper(account: string | undefined) {
  const query = useQuery({
    queryKey: qk.shipper(account ?? ""),
    queryFn: () => load(account!),
    enabled: !!account,
    refetchInterval: 10_000,
  });
  const { refetch } = query;
  const refresh = useCallback(() => void refetch(), [refetch]);
  return {
    data: account ? (query.data ?? null) : null,
    /* A failed background read keeps what is on screen. Only a first load can fail. */
    failed: !!account && query.isError && query.data === undefined,
    refresh,
  };
}
