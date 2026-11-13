/**
 * A readable name for a NEAR account id, for when no profile name is known. The network
 * ending and any parent account are dropped, so "kopi-nusantara.testnet" reads
 * "Kopi Nusantara" and "risk.waybil.testnet" reads "Risk".
 */
export function accountLabel(id: string) {
  const first = id.replace(/\.(testnet|near)$/, "").split(".")[0] ?? id;
  const words = first.split(/[-_]+/).filter(Boolean);
  return words.length ? words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ") : id;
}
