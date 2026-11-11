"use client";
import { useEffect, useState } from "react";

/*
 * Countries, provinces and cities for the company form, served from `public/places`.
 * The index loads once per page. Each country's cities load the first time it is picked.
 * Both stay in a module cache, so going back and forth does not fetch again.
 */

export type Place = { id: string; name: string };
type PlacesIndex = {
  attribution: string[];
  countries: { iso2: string; name: string }[];
  states: Record<string, Place[]>;
};
type CityMap = Record<string, string[]>;

let index: PlacesIndex | undefined;
let indexRequest: Promise<PlacesIndex> | undefined;
const cityMaps = new Map<string, CityMap>();
const cityRequests = new Map<string, Promise<CityMap>>();

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return (await response.json()) as T;
}

function loadIndex() {
  indexRequest ??= getJson<PlacesIndex>("/places/index.json").then(
    (data) => (index = data),
    (error: unknown) => {
      indexRequest = undefined; // a later mount may try again
      throw error;
    },
  );
  return indexRequest;
}

function loadCities(iso2: string) {
  let request = cityRequests.get(iso2);
  if (!request) {
    request = getJson<CityMap>(`/places/${iso2}.json`).then(
      (data) => {
        cityMaps.set(iso2, data);
        return data;
      },
      (error: unknown) => {
        cityRequests.delete(iso2);
        throw error;
      },
    );
    cityRequests.set(iso2, request);
  }
  return request;
}

/**
 * The lists for the chosen country and province, by name (the form stores names).
 * When a list is missing or fails to load, the matching array is empty and the form lets
 * people type the name themselves.
 */
export function useRegions(country: string, province: string) {
  const [, setIndexVersion] = useState(0);
  const [indexFailed, setIndexFailed] = useState(false);
  const iso2 = index?.countries.find((c) => c.name === country)?.iso2;
  const provinces = (iso2 && index?.states[iso2]) || [];
  const [cityStatus, setCityStatus] = useState<{ iso2: string; failed: boolean }>();

  useEffect(() => {
    if (index) return;
    let live = true;
    loadIndex().then(
      () => live && setIndexVersion((v) => v + 1),
      () => live && setIndexFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  const needsCities = !!iso2 && provinces.length > 0 && !cityMaps.has(iso2);
  useEffect(() => {
    if (!iso2 || !needsCities) return;
    let live = true;
    loadCities(iso2).then(
      () => live && setCityStatus({ iso2, failed: false }),
      () => live && setCityStatus({ iso2, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [iso2, needsCities]);

  const provinceId = provinces.find((p) => p.name === province)?.id;
  const cities = (iso2 && provinceId && cityMaps.get(iso2)?.[provinceId]) || [];
  const citiesFailed = !!iso2 && cityStatus?.iso2 === iso2 && cityStatus.failed;

  return {
    countries: index?.countries ?? [],
    provinces,
    cities,
    /** ISO2 code of the chosen country, once the index is in. */
    iso2,
    loadingCountries: !index && !indexFailed,
    loadingCities: needsCities && !citiesFailed,
    failed: indexFailed || citiesFailed,
  };
}
