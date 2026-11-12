"use client";
import { useEffect } from "react";

/*
 * Reads live data again every `ms` while the tab is in view, so a change someone else makes
 * (a driver accepts an invite, a pickup, a delivery) shows up without a reload. It pauses while
 * the tab is hidden and reads right away when the person comes back to it. 10 seconds keeps
 * a few open tabs well under the API's 120 requests a minute.
 */
export function useAutoRefresh(refresh: () => void, ms = 10000, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const start = () => {
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        if (!document.hidden) refresh();
      }, ms);
    };
    const onVisible = () => {
      if (document.hidden) return;
      refresh();
      start();
    };
    start();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, ms, enabled]);
}
