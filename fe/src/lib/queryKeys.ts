/*
 * Every query key in one place, so a write can mark exactly the reads it changes as stale.
 * Keys start with what the data is, then who it belongs to. The `all...` keys are prefixes
 * that match every key of that kind.
 */
export const qk = {
  me: () => ["me"] as const,
  names: (id: string) => ["names", id] as const,
  usdc: (account: string) => ["usdc", account] as const,
  invite: (code: string) => ["invite", code] as const,
  /* Address suggestions for what was typed, and the static country and city lists. */
  addressSearch: (text: string) => ["address-search", text] as const,
  regions: () => ["regions"] as const,
  cities: (iso2: string) => ["cities", iso2] as const,

  shipper: (account: string) => ["shipper", account] as const,
  /* The shipper's own record on chain, read alone (onboarding shows the starting limit). */
  shipperRecord: (account: string) => ["shipper-record", account] as const,
  places: (account: string) => ["places", account] as const,
  trips: (ids: string) => ["trips", ids] as const,
  allTrips: () => ["trips"] as const,
  routePreview: (from: string, to: string) => ["route-preview", from, to] as const,
  report: (shipmentId: number) => ["report", shipmentId] as const,
  creditReviews: (account: string) => ["credit-reviews", account] as const,
  application: (account: string) => ["application", account] as const,

  driverTrips: (account: string) => ["driver-trips", account] as const,
  arrivalCode: (shipmentId: number) => ["arrival-code", shipmentId] as const,

  warehouse: (account: string) => ["warehouse", account] as const,

  pool: (account: string) => ["pool", account] as const,
  poolHistory: (account: string) => ["pool-history", account] as const,

  admin: (page: string) => ["admin", page] as const,
  allAdmin: () => ["admin"] as const,
};
