"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/map.css";
import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibre, Marker } from "maplibre-gl";
import { cn } from "@/lib/cn";
import { travelled, type Point } from "@/lib/route";

/* Free light basemap, no key. The OpenStreetMap credit shows in the corner of every map. */
const STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
/* Java, where the demo trucks run, until the first data arrives. */
const START: Point = [107.6, -6.9];
const GREY = "#bdbdbb";
const YELLOW = "#ffd60a";
/* A plain truck shape, drawn for this map. */
const TRUCK_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 6h12v9H2zM15 9h4l3 3v3h-7z"/><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/></svg>`;

export interface MapTrip {
  id: string | number;
  pickup: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  route: Point[];
  truck?: { point: Point; stale: boolean } | null;
}

/**
 * A light map with each trip's pickup, destination, the road between them in grey, the
 * driven part in yellow, and the truck. It fits all trips once, when they first arrive. With
 * `onPick`, a click or a drag sets one pin instead (for choosing an address).
 */
export function RouteMap({
  trips = [],
  pin,
  onPick,
  chip,
  badge,
  className,
  dim = false,
  overlay,
}: {
  trips?: MapTrip[];
  pin?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  /** The status pill in the top left corner, for example "On the road". */
  chip?: React.ReactNode;
  /** A note in the bottom left corner, for example "Simulated location for the demo". */
  badge?: React.ReactNode;
  className?: string;
  /** Fades the map behind `overlay`, for an empty state. */
  dim?: boolean;
  overlay?: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const fitted = useRef(false);
  /* The last view fitted to the trips, kept so a resize can fit it again. */
  const lastBounds = useRef<import("maplibre-gl").LngLatBoundsLike | null>(null);
  /* Once the person pans or zooms, the map stops fitting itself. */
  const touched = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  });

  /* Create the map once. MapLibre loads only in the browser, when a map is on screen. */
  useEffect(() => {
    let cancelled = false;
    const all = markers.current;
    void import("maplibre-gl")
      .then((maplibre) => {
        if (cancelled || !box.current) return;
        lib.current = maplibre;
        const m = new maplibre.Map({
          container: box.current,
          style: STYLE,
          center: START,
          zoom: 6,
          attributionControl: { compact: true },
        });
        m.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        let loaded = false;
        /*
         * "load" waits for every first tile, so one slow tile would hold it back. The style is
         * all the lines and markers need.
         */
        m.once("style.load", () => {
          loaded = true;
          if (!cancelled) setReady(true);
        });
        /* Logged for debugging only. No coordinates are written. */
        m.on("error", (e) => console.warn("[RouteMap]", e.error?.message ?? e));
        m.on("click", (e) => pick.current?.(e.lngLat.lat, e.lngLat.lng));
        map.current = m;
        /* A map opened inside a sheet starts while the sheet still moves. Follow its real size. */
        const fit = new ResizeObserver(() => {
          m.resize();
          if (lastBounds.current && !touched.current)
            m.fitBounds(lastBounds.current, { padding: 56, maxZoom: 13, animate: false });
        });
        m.on("movestart", (e) => {
          if ((e as { originalEvent?: unknown }).originalEvent) touched.current = true;
        });
        fit.observe(box.current);
        m.once("remove", () => fit.disconnect());
        /* A style that never loads leaves an empty box. Say so instead. */
        window.setTimeout(() => {
          if (cancelled || loaded) return;
          console.warn("[RouteMap] the map did not finish loading in 20 seconds");
          setFailed(true);
        }, 20000);
      })
      .catch((e: unknown) => {
        console.warn("[RouteMap] could not load the map library", e);
        setFailed(true);
      });
    return () => {
      cancelled = true;
      all.clear();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  /* Keep markers, lines and the view in step with the trips. */
  useEffect(() => {
    const m = map.current;
    const maplibre = lib.current;
    if (!ready || !m || !maplibre) return;
    const seen = new Set<string>();
    const place = (key: string, className: string, at: Point, title: string, glide = false) => {
      seen.add(key);
      let marker = markers.current.get(key);
      if (!marker) {
        const el = document.createElement("div");
        el.className = className;
        el.title = title;
        if (className === "wb-pin-truck") el.innerHTML = TRUCK_SVG;
        marker = new maplibre.Marker({ element: el }).setLngLat(at).addTo(m);
        markers.current.set(key, marker);
        return marker;
      }
      if (glide) slide(marker, at);
      else marker.setLngLat(at);
      return marker;
    };

    for (const trip of trips) {
      const id = String(trip.id);
      line(m, `route-${id}`, trip.route, GREY);
      line(m, `driven-${id}`, trip.truck ? travelled(trip.route, trip.truck.point) : [], YELLOW);
      place(`p-${id}`, "wb-pin-pickup", [trip.pickup.lng, trip.pickup.lat], trip.pickup.name);
      place(
        `d-${id}`,
        "wb-pin-destination",
        [trip.destination.lng, trip.destination.lat],
        trip.destination.name,
      );
      if (trip.truck) {
        const truck = place(`t-${id}`, "wb-pin-truck", trip.truck.point, "Truck", true);
        truck.getElement().dataset.stale = String(trip.truck.stale);
      }
    }
    if (pin) {
      const marker = place("pin", "wb-pin-destination", [pin.lng, pin.lat], "Your pin");
      /* Only a picker can drag the pin. Elsewhere it just marks the spot. */
      if (!marker.isDraggable() && pick.current) {
        marker.setDraggable(true);
        marker.on("dragend", () => {
          const at = marker.getLngLat();
          pick.current?.(at.lat, at.lng);
        });
      }
    }
    for (const [key, marker] of markers.current)
      if (!seen.has(key)) {
        marker.remove();
        markers.current.delete(key);
      }

    /* Fit everything once, without animation, so later updates never jerk the view. */
    if (pin) {
      const at: Point = [pin.lng, pin.lat];
      if (!fitted.current || !m.getBounds().contains(at))
        m.jumpTo({ center: at, zoom: Math.max(m.getZoom(), 14) });
      fitted.current = true;
      return;
    }
    const points: Point[] = trips.flatMap((t) => [
      [t.pickup.lng, t.pickup.lat] as Point,
      [t.destination.lng, t.destination.lat] as Point,
      ...(t.truck ? [t.truck.point] : []),
    ]);
    if (!fitted.current && points.length) {
      const bounds = new maplibre.LngLatBounds(points[0], points[0]);
      for (const p of points) bounds.extend(p);
      m.fitBounds(bounds, { padding: 56, maxZoom: 13, animate: false });
      lastBounds.current = bounds;
      fitted.current = true;
    }
  }, [ready, trips, pin]);

  return (
    <div className={cn("wb-map relative isolate overflow-hidden rounded-row", className)}>
      {/* MapLibre makes this box position relative, so it takes its size from the parent. */}
      <div ref={box} className={cn("h-full w-full", dim && "opacity-30")} />
      {(chip || failed) && (
        <span className="pointer-events-none absolute top-12 left-12 z-10 max-w-[calc(100%-80px)] rounded-full bg-ds-bg px-12 py-6 text-caption font-medium">
          {failed ? "The map could not load. The trip details are still here." : chip}
        </span>
      )}
      {badge && (
        <span className="pointer-events-none absolute bottom-12 left-12 z-10 rounded-full bg-ds-ink px-10 py-4 text-caption text-white">
          {badge}
        </span>
      )}
      {overlay && (
        <div className="absolute inset-0 z-10 grid place-items-center p-24 text-center">
          {overlay}
        </div>
      )}
    </div>
  );
}

/* Adds or updates one line layer. */
function line(m: MapLibre, id: string, coordinates: Point[], color: string) {
  const data = {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates },
  };
  const source = m.getSource(id) as GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }
  m.addSource(id, { type: "geojson", data });
  m.addLayer({
    id,
    type: "line",
    source: id,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": color, "line-width": 6 },
  });
}

/* Glides a marker to its new point over 1 s, or jumps when reduced motion is on. */
function slide(marker: Marker, to: Point) {
  const from = marker.getLngLat();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    marker.setLngLat(to);
    return;
  }
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 1000);
    const k = 1 - (1 - t) ** 3;
    marker.setLngLat([from.lng + (to[0] - from.lng) * k, from.lat + (to[1] - from.lat) * k]);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
