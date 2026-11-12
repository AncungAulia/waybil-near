"use client";
import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
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
  /* Which account the last read failed for, so a failure never shows under another account. */
  const [failedFor, setFailedFor] = useState<string | null>(null);
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
        setFailedFor(null);
      })
      .catch(() => !stale && setFailedFor(account));
    return () => {
      stale = true;
    };
  }, [account, version]);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useAutoRefresh(refresh, 10000, !!account);
  const own = !!account && data?.account === account;
  return {
    /* Data read for another account is never shown while this one loads. */
    data: own ? data : null,
    /* A failed background read keeps what is on screen. Only a first load can fail. */
    failed: !!account && failedFor === account && !own,
    refresh,
  };
}
