import { randomUUID } from "node:crypto";
import type {
  Place,
  PlaceCreate,
  PlaceSearchResponse,
  PlaceSuggestion,
  PlacesResponse,
  Principal,
} from "@waybil/shared";
import type { Store } from "../../types/db";
import type { Fetcher } from "../../lib/routing";
import { allowed, unavailable } from "../../lib/errors";
import type { InviteRecord } from "../invites/invites.service";

interface PhotonFeature {
  geometry?: { coordinates?: unknown };
  properties?: Record<string, unknown>;
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Joins name, street, city, state and country, leaving out empty parts and repeats. */
export function photonLabel(properties: Record<string, unknown>): string {
  const street = [text(properties.street), text(properties.housenumber)].filter(Boolean).join(" ");
  const parts = [
    text(properties.name),
    street,
    text(properties.city),
    text(properties.state),
    text(properties.country),
  ];
  const seen = new Set<string>();
  const label = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!part || seen.has(key)) continue;
    seen.add(key);
    label.push(part);
  }
  return label.join(", ");
}

function suggestion(feature: PhotonFeature): PlaceSuggestion | null {
  const position = feature.geometry?.coordinates;
  if (!Array.isArray(position)) return null;
  const [lng, lat] = position as unknown[];
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    return null;
  const label = photonLabel(feature.properties ?? {});
  return label ? { label, lat, lng } : null;
}

export class Places {
  constructor(
    private store: Store,
    private photonUrl: string,
    private fetcher: Fetcher = fetch,
    private now = () => Date.now(),
  ) {}

  /** Address suggestions from Photon. The query and the results are never logged. */
  async search(actor: Principal, q: string): Promise<PlaceSearchResponse> {
    allowed(actor.role === "shipper");
    const url = new URL(`${this.photonUrl.replace(/\/+$/, "")}/api/`);
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "5");
    let features: PhotonFeature[];
    try {
      const response = await this.fetcher(url, {
        headers: { Accept: "application/json", "User-Agent": "Waybil/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { features?: unknown };
      if (!Array.isArray(payload.features)) throw new Error();
      features = payload.features as PhotonFeature[];
    } catch {
      unavailable();
    }
    const results = [];
    for (const feature of features) {
      const item = suggestion(feature);
      if (item) results.push(item);
      if (results.length === 5) break;
    }
    return { results };
  }

  /**
   * A shipper sees its own places. A warehouse sees the destination places of the invites it
   * accepted.
   */
  async list(actor: Principal): Promise<PlacesResponse> {
    allowed(actor.role === "shipper" || actor.role === "warehouse");
    let places: Place[];
    if (actor.role === "shipper") {
      places = (await this.store.list<Place>("places", { shipperId: actor.accountId })).map(
        (row) => row.value,
      );
    } else {
      const invites = await this.store.list<InviteRecord>("invites", {
        acceptedBy: actor.accountId,
        type: "warehouse",
      });
      const ids = [...new Set(invites.map((row) => row.value.placeId).filter(Boolean))];
      places = [];
      for (const id of ids) {
        const row = await this.store.get<Place>("places", id!);
        if (row && row.value.kind === "destination") places.push(row.value);
      }
    }
    places.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
    return { places };
  }

  async create(actor: Principal, input: PlaceCreate): Promise<{ place: Place }> {
    allowed(actor.role === "shipper");
    const place: Place = {
      id: randomUUID(),
      shipperId: actor.accountId,
      kind: input.kind,
      name: input.name,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      createdAt: new Date(this.now()).toISOString(),
    };
    await this.store.insert("places", place.id, place);
    return { place };
  }
}
