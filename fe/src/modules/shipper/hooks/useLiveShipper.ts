"use client";
import { useCallback, useEffect, useState } from "react";
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

/* Moving between shipper pages reuses a read from the last 15 seconds. */
let cache: { account: string; at: number; promise: Promise<LiveShipperData> } | null = null;

/** The signed-in shipper's testnet and backend data. Pass no account to stay idle. */
export function useLiveShipper(account: string | undefined) {
  const [data, setData] = useState<LiveShipperData | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!account) return;
    let stale = false;
    if (!cache || cache.account !== account || version > 0 || Date.now() - cache.at > 15000)
      cache = { account, at: Date.now(), promise: load(account) };
    const { promise } = cache;
    promise.catch(() => {
      if (cache?.promise === promise) cache = null;
    });
    promise
      .then((value) => {
        if (stale) return;
        setData(value);
        setFailed(false);
      })
      .catch(() => !stale && setFailed(true));
    return () => {
      stale = true;
    };
  }, [account, version]);
  return { data, failed, refresh: useCallback(() => setVersion((v) => v + 1), []) };
}
