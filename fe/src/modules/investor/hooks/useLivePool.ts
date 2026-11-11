"use client";
import { useCallback, useEffect, useState } from "react";
import type { Shipment, Shipper } from "@waybil/shared";
import {
  getInvestor,
  getPool,
  getShipment,
  getShipper,
  getWithdrawQueue,
  readAll,
  usdcBalance,
} from "@/lib/near";
import { financed, type LivePool } from "../data/live";

/*
 * There is no view that lists every shipment, and ids count up from 1 with none deleted, so
 * this reads ids in batches until one comes back empty.
 */
// ponytail: one RPC call per shipment ever made. Fine for testnet; add a backend or indexer
// list of financed shipments when the count reaches the hundreds.
async function allShipments() {
  const all: Shipment[] = [];
  for (let from = 1; ; from += BATCH) {
    const batch = await Promise.all(Array.from({ length: BATCH }, (_, i) => getShipment(from + i)));
    const found = batch.filter((s): s is Shipment => s !== null);
    all.push(...found);
    if (found.length < BATCH) return all;
  }
}
const BATCH = 10;

let cache: { accountId: string; at: number; promise: Promise<LivePool> } | null = null;

async function load(accountId: string): Promise<LivePool> {
  const [pool, investor, wallet, queue, shipments] = await Promise.all([
    getPool(),
    getInvestor(accountId),
    usdcBalance(accountId),
    readAll((from, limit) => getWithdrawQueue({ from, limit })),
    allShipments(),
  ]);
  const deliveries = financed(shipments).sort((a, b) => b.id - a.id);
  const names = [...new Set(deliveries.map((s) => s.shipper))];
  const shippers = await Promise.all(names.map(getShipper));
  return {
    pool,
    value: BigInt(investor.value),
    shares: BigInt(investor.shares),
    queued: BigInt(investor.queued),
    wallet: BigInt(wallet),
    queue,
    deliveries,
    shippers: Object.fromEntries(names.map((n, i) => [n, shippers[i] ?? null])) as Record<
      string,
      Shipper | null
    >,
  };
}

/** The investor's pool, position and wallet from testnet. Pass no account to stay idle. */
export function useLivePool(accountId: string | undefined) {
  const [data, setData] = useState<LivePool | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!accountId) return;
    let stale = false;
    /* Moving between pool pages reuses a fresh read. Refresh (version > 0) reads again. */
    if (!cache || cache.accountId !== accountId || version > 0 || Date.now() - cache.at > 15000)
      cache = { accountId, at: Date.now(), promise: load(accountId) };
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
  }, [accountId, version]);
  return { data, failed, refresh: useCallback(() => setVersion((v) => v + 1), []) };
}
