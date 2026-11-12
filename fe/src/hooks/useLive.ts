"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAutoRefresh } from "./useAutoRefresh";

/**
 * Loads live data for a key, reloads on demand, and optionally reads again every `pollMs`
 * while the tab is in view (see useAutoRefresh), so a status changed by someone else shows
 * up. What is on screen stays while it reads again. Pass a null key to stay idle.
 */
export function useLive<T>(load: () => Promise<T>, key: string | null, pollMs = 0) {
  const loader = useRef(load);
  useEffect(() => {
    loader.current = load;
  });
  const [state, setState] = useState<{ key: string; data?: T; failed?: boolean } | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!key) return;
    let stale = false;
    loader
      .current()
      .then((data) => !stale && setState({ key, data }))
      .catch(
        () =>
          !stale &&
          setState((s) => ({ key, data: s?.key === key ? s.data : undefined, failed: true })),
      );
    return () => {
      stale = true;
    };
  }, [key, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useAutoRefresh(reload, pollMs, pollMs > 0 && !!key);
  const current = state?.key === key ? state : null;
  return {
    data: current?.data,
    failed: !!current?.failed && current.data === undefined,
    reload,
  };
}
