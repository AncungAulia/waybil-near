"use client";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";
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

/**
 * The investor's pool, position and wallet from testnet, from the shared cache, read again
 * every 10 seconds while the tab is in view. The key holds the account, so switching wallets
 * never shows another account's pool. Pass no account to stay idle.
 */
export function useLivePool(accountId: string | undefined) {
  const query = useQuery({
    queryKey: qk.pool(accountId ?? ""),
    queryFn: () => load(accountId!),
    enabled: !!accountId,
    refetchInterval: 10_000,
  });
  const { refetch } = query;
  const refresh = useCallback(() => void refetch(), [refetch]);
  return {
    data: accountId ? (query.data ?? null) : null,
    /* A failed background read keeps the pool on screen. Only a first load can fail. */
    failed: !!accountId && query.isError && query.data === undefined,
    refresh,
  };
}
