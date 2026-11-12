"use client";
import { useEffect, useRef, useState } from "react";
import { LOCATION_EVERY_MS, type LocationUpdate } from "@waybil/shared";
import { api } from "@/lib/api";

export type SharingState = "off" | "sharing" | "denied" | "unsupported" | "error";

/**
 * While a trip is on the road and this page is open, sends the phone's position at most once
 * every 30 seconds, with one request at a time. It stops when the trip arrives, the page
 * closes, or `active` turns false.
 */
export function useShareLocation(shipmentId: number | undefined, active: boolean) {
  const [state, setState] = useState<SharingState>("off");
  const [sentAt, setSentAt] = useState<number | null>(null);
  const last = useRef(0);
  const sending = useRef(false);

  useEffect(() => {
    if (!active || shipmentId == null) return;
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setState("unsupported"));
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        setState("sharing");
        const now = Date.now();
        if (sending.current || now - last.current < LOCATION_EVERY_MS) return;
        sending.current = true;
        last.current = now;
        const body: LocationUpdate = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          recordedAt: new Date(pos.timestamp).toISOString(),
        };
        api(`/trips/${shipmentId}/location`, { body })
          .then(() => setSentAt(now))
          .catch(() => setState("error"))
          .finally(() => {
            sending.current = false;
          });
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [shipmentId, active]);

  return { state: active ? state : "off", sentAt };
}

/** A plain sentence for the sharing state, shown under the map. */
export function sharingNote(state: SharingState) {
  switch (state) {
    case "sharing":
      return "Your location is shared with the shipper while this page is open.";
    case "denied":
      return "Location is off. Allow location for this site so the shipper can follow the truck.";
    case "unsupported":
      return "This browser cannot share location. The shipper sees the route only.";
    case "error":
      return "Location paused. It starts again when your signal is back.";
    default:
      return "Your location is shared once the pickup is confirmed.";
  }
}
