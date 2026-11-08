"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  readDemoDelivery,
  readDemoReportJson,
  DEFAULT_REPORT_JSON,
  parseDemoReport,
} from "@/lib/demo-delivery";

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("waybil-demo-delivery", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("waybil-demo-delivery", notify);
  };
}

export function useDemoDelivery() {
  return useSyncExternalStore(subscribe, readDemoDelivery, () => "road" as const);
}

export function useDemoReport() {
  const json = useSyncExternalStore(subscribe, readDemoReportJson, () => DEFAULT_REPORT_JSON);
  return useMemo(() => parseDemoReport(json), [json]);
}
