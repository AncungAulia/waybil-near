"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads live data for a key, reloads on demand, and optionally reads again every `pollMs`
 * so a status changed by someone else shows up. Pass a null key to stay idle.
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
    let timer: number | undefined;
    const run = () =>
      loader
        .current()
        .then((data) => !stale && setState({ key, data }))
        .catch(
          () =>
            !stale &&
            setState((s) => ({ key, data: s?.key === key ? s.data : undefined, failed: true })),
        )
        .finally(() => {
          if (!stale && pollMs) timer = window.setTimeout(run, pollMs);
        });
    void run();
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [key, version, pollMs]);
  const current = state?.key === key ? state : null;
  return {
    data: current?.data,
    failed: !!current?.failed && current.data === undefined,
    reload: useCallback(() => setVersion((v) => v + 1), []),
  };
}
