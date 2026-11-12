"use client";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/queryKeys";

/*
 * Countries, provinces and cities for the company form, served from `public/places`.
 * The index loads once per visit. Each country's cities load the first time it is picked.
 * Both stay in the shared cache for the whole visit, so going back and forth does not fetch
 * again.
 */

export type Place = { id: string; name: string };
type PlacesIndex = {
  attribution: string[];
  countries: { iso2: string; name: string }[];
  states: Record<string, Place[]>;
};
type CityMap = Record<string, string[]>;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return (await response.json()) as T;
}

/* The files never change while the page is open. */
const STATIC = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnWindowFocus: false,
  retry: false,
} as const;

/**
 * The lists for the chosen country and province, by name (the form stores names).
 * When a list is missing or fails to load, the matching array is empty and the form lets
 * people type the name themselves.
 */
export function useRegions(country: string, province: string) {
  const indexQuery = useQuery({
    queryKey: qk.regions(),
    queryFn: () => getJson<PlacesIndex>("/places/index.json"),
    ...STATIC,
  });
  const index = indexQuery.data;
  const iso2 = index?.countries.find((c) => c.name === country)?.iso2;
  const provinces = (iso2 && index?.states[iso2]) || [];

  const cityQuery = useQuery({
    queryKey: qk.cities(iso2 ?? ""),
    queryFn: () => getJson<CityMap>(`/places/${iso2}.json`),
    enabled: !!iso2 && provinces.length > 0,
    ...STATIC,
  });

  const provinceId = provinces.find((p) => p.name === province)?.id;
  const cities = (provinceId && cityQuery.data?.[provinceId]) || [];
  const needsCities = !!iso2 && provinces.length > 0 && !cityQuery.data;
  const citiesFailed = !!iso2 && cityQuery.isError;

  return {
    countries: index?.countries ?? [],
    provinces,
    cities,
    /** ISO2 code of the chosen country, once the index is in. */
    iso2,
    loadingCountries: !index && !indexQuery.isError,
    loadingCities: needsCities && !citiesFailed,
    failed: indexQuery.isError || citiesFailed,
  };
}

/*
 * Short display names for Indonesian provinces and regencies, the way people write them.
 * The official name stays the stored value and still matches a search. "Kota" is kept, since
 * a city and a regency can share a name (Kota Bandung and Kab. Bandung).
 */
const SHORT_PROVINCES: Record<string, string> = {
  "Daerah Khusus Ibukota Jakarta": "DKI Jakarta",
  "Daerah Istimewa Yogyakarta": "DI Yogyakarta",
};
export function shortPlace(name: string) {
  return (
    SHORT_PROVINCES[name] ??
    name.replace(/^(Kota|Kabupaten) Administrasi /, "").replace(/^Kabupaten /, "Kab. ")
  );
}
