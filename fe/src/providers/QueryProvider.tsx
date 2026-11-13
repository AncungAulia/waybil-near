"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/*
 * One cache for every read in the app, so moving between pages shows what was already read
 * and reads it again in the background.
 *
 * - staleTime 5 s: a page opened right after another reuses the same read.
 * - gcTime 5 min: data for a page left behind stays while the person comes back.
 * - retry 1: one more try for a dropped connection, then the screen says it failed.
 * - Reads pause while the tab is hidden and run again when it comes back into view.
 */
function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: false,
      },
      mutations: { retry: 0 },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  /* One client per browser tab, made once. */
  const [client] = useState(makeClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
