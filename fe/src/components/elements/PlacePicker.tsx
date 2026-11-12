"use client";
import { useEffect, useRef, useState } from "react";
import type { PlaceReverseResponse, PlaceSearchResponse, PlaceSuggestion } from "@waybil/shared";
import { MapPin } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { RouteMap } from "./RouteMap";

/**
 * Moves the pin and then names the address under it. The pin moves at once. The address
 * follows when the lookup answers, and stays as it was when nothing is found there.
 */
export async function movePin(
  lat: number,
  lng: number,
  set: (
    update: (prev: { address: string; lat: number | null; lng: number | null }) => {
      address: string;
      lat: number | null;
      lng: number | null;
    },
  ) => void,
) {
  set((prev) => ({ ...prev, lat, lng }));
  try {
    const { result } = await api<PlaceReverseResponse>(`/places/reverse?lat=${lat}&lng=${lng}`);
    /* Only when the pin is still where this lookup was asked for. */
    if (result)
      set((prev) =>
        prev.lat === lat && prev.lng === lng ? { ...prev, address: result.label } : prev,
      );
  } catch {
    /* The pin is what counts. The typed address stays. */
  }
}

export interface PickedPlace {
  address: string;
  lat: number;
  lng: number;
}

/* Search waits for a short pause in typing, so each word is one request at most. */
const PAUSE_MS = 600;
const MIN_CHARS = 3;

/**
 * An address field that suggests real places as you type, and a map below it. Picking a
 * suggestion drops the pin. A click on the map or a drag of the pin moves it. The value is
 * only complete with both an address and a pin.
 */
export function PlacePicker({
  label,
  value,
  onChange,
  hint,
  showMap = true,
}: {
  label: string;
  value: { address: string; lat: number | null; lng: number | null };
  onChange: (next: { address: string; lat: number | null; lng: number | null }) => void;
  hint?: string;
  /** False when the screen draws the map elsewhere, for example beside a wide form. */
  showMap?: boolean;
}) {
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  /* Search only for what the person typed, not for a label they picked. */
  const typed = useRef(false);
  const field = useRef<HTMLInputElement>(null);
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });

  useEffect(() => {
    const q = value.address.trim();
    /* Search only while the person is typing here, not when a moved pin fills the address. */
    if (!typed.current || q.length < MIN_CHARS || document.activeElement !== field.current) return;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setError(null);
      api<PlaceSearchResponse>(`/places/search?q=${encodeURIComponent(q)}`, {
        signal: ctrl.signal,
      })
        .then((r) => {
          setResults(r.results);
          setOpen(true);
        })
        .catch((e: unknown) => {
          if ((e as Error)?.name === "AbortError") return;
          setResults([]);
          setError("Address search is not working right now. Tap the map to drop the pin.");
        })
        .finally(() => setSearching(false));
    }, PAUSE_MS);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [value.address]);

  const pin = value.lat != null && value.lng != null ? { lat: value.lat, lng: value.lng } : null;

  return (
    <div className="flex flex-col gap-10">
      <div className="relative">
        <Input
          label={label}
          ref={field}
          value={value.address}
          autoComplete="off"
          placeholder="Search a street, area or building"
          hint={
            error ??
            (searching
              ? "Searching addresses."
              : pin
                ? "Pin set. Drag it or tap the map to move it."
                : (hint ?? "Pick an address from the list."))
          }
          onChange={(e) => {
            typed.current = true;
            /* A new address clears the old pin until a new one is picked. */
            onChange({ address: e.target.value, lat: null, lng: null });
          }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
        {open && results.length > 0 && (
          <ul
            role="listbox"
            className="absolute top-[84px] right-0 left-0 z-20 overflow-hidden rounded-row border border-ds-line bg-ds-bg shadow-lg"
          >
            {results.map((r) => (
              <li key={`${r.lat},${r.lng},${r.label}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="tap flex w-full items-start gap-10 px-14 py-12 text-left text-label hover:bg-ds-canvas"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    typed.current = false;
                    setOpen(false);
                    onChange({ address: r.label, lat: r.lat, lng: r.lng });
                  }}
                >
                  <MapPin size={17} className="mt-2 shrink-0 text-ds-muted" />
                  <span>{r.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {showMap && pin && (
        <RouteMap
          pin={pin}
          onPick={(lat, lng) =>
            void movePin(lat, lng, (update) => {
              latest.current = update(latest.current);
              onChange(latest.current);
            })
          }
          className={cn("h-220 w-full")}
        />
      )}
    </div>
  );
}
