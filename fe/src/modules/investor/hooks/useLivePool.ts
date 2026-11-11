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

/* One fresh read per account, so switching wallets never shows another account's pool. */
const cache = new Map<string, { at: number; promise: Promise<LivePool> }>();

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
  const [state, setState] = useState<{
    accountId: string;
    data: LivePool | null;
    failed: boolean;
  } | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!accountId) return;
    let stale = false;
    /* Moving between pool pages reuses a fresh read. Refresh (version > 0) reads again. */
    let entry = cache.get(accountId);
    if (!entry || version > 0 || Date.now() - entry.at > 15000) {
      entry = { at: Date.now(), promise: load(accountId) };
      cache.set(accountId, entry);
    }
    const { promise } = entry;
    promise.catch(() => {
      if (cache.get(accountId)?.promise === promise) cache.delete(accountId);
    });
    promise
      .then((value) => {
        if (!stale) setState({ accountId, data: value, failed: false });
      })
      .catch(() => {
        if (stale) return;
        setState((s) => ({
          accountId,
          data: s?.accountId === accountId ? s.data : null,
          failed: true,
        }));
      });
    return () => {
      stale = true;
    };
  }, [accountId, version]);
  /* Data read for another account is never shown. */
  const current = accountId && state?.accountId === accountId ? state : null;
  return {
    data: current?.data ?? null,
    failed: current?.failed ?? false,
    refresh: useCallback(() => setVersion((v) => v + 1), []),
  };
}
