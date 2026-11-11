/*
 * Locale-safe number formatting. A bare `toLocaleString()` follows the viewer's locale, so
 * the server and a German browser would write "2.400" while the board writes "2,400", and
 * React reports a hydration mismatch. Always format with the board's locale instead.
 * Money still goes through `formatUsdc` from @waybil/shared.
 */

const PLAIN = new Intl.NumberFormat("en-US");

/** A plain count or number the way the board writes it, for example "2,400". */
export function formatNumber(n: number | bigint, options?: Intl.NumberFormatOptions): string {
  return options ? new Intl.NumberFormat("en-US", options).format(n) : PLAIN.format(n);
}
