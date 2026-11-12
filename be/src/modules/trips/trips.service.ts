import {
  LOCATION_EVERY_MS,
  type Destination,
  type LocationUpdate,
  type Place,
  type Principal,
  type Shipment,
  type Trip,
  type TripCreate,
  type TripsResponse,
  type TruckLocation,
} from "@waybil/shared";
import type { Env } from "../../config/env";
import type { Store } from "../../types/db";
import type { Chain } from "../../lib/near";
import { allowed, ApiException, conflict, requireValue } from "../../lib/errors";
import { planRoute, type Fetcher } from "../../lib/routing";
import type { InviteRecord } from "../invites/invites.service";

/** The stored trip. The simulation is worked out on every read from the chain status. */
export interface TripRecord extends Omit<Trip, "simulation"> {
  createdAt: string;
  /** Server time the newest point arrived, for the one point every 30 seconds rule. */
  locationReceivedAt: string | null;
}
interface Journey {
  shipment: Shipment;
  destination: Destination;
}
type TripSettings = Pick<Env, "ORS_API_KEY" | "DEMO_LOCATION_SIMULATION" | "DEMO_TRIP_SECONDS">;

/** Chain time is nanoseconds since the epoch, as a string. */
function chainTime(nanoseconds: string): string {
  return new Date(Number(BigInt(nanoseconds) / 1000000n)).toISOString();
}

export class Trips {
  constructor(
    private store: Store,
    private chain: Chain,
    private settings: TripSettings,
    private fetcher: Fetcher = fetch,
    private now = () => Date.now(),
  ) {}

  /**
   * Stores the trip for a shipment the shipper recorded: its pickup place, the destination's
   * place and the road between them. Repeating it with the same pickup returns the same trip.
   */
  async create(actor: Principal, shipmentId: number, input: TripCreate): Promise<{ trip: Trip }> {
    const journey = await this.journey(shipmentId);
    allowed(actor.accountId === journey.shipment.shipper);
    const existing = await this.store.get<TripRecord>("trips", String(shipmentId));
    if (existing) return this.same(existing.value, input, journey);
    const pickup = requireValue(await this.store.get<Place>("places", input.pickupPlaceId)).value;
    allowed(pickup.shipperId === actor.accountId);
    if (pickup.kind !== "pickup") throw new ApiException(400, "E_VALIDATION");
    const destination = await this.destinationPlace(journey);
    const plan = await planRoute(pickup, destination, this.settings.ORS_API_KEY, this.fetcher);
    const record: TripRecord = {
      shipmentId,
      shipperId: journey.shipment.shipper,
      pickup,
      destination,
      ...plan,
      lastLocation: null,
      createdAt: new Date(this.now()).toISOString(),
      locationReceivedAt: null,
    };
    try {
      await this.store.insert("trips", String(shipmentId), record);
    } catch (error) {
      /* Two requests raced. The first one wins and the retry reads its trip. */
      const raced = await this.store.get<TripRecord>("trips", String(shipmentId));
      if (!raced) throw error;
      return this.same(raced.value, input, journey);
    }
    return { trip: this.view(record, journey) };
  }

  async read(actor: Principal, shipmentId: number): Promise<{ trip: Trip }> {
    const journey = await this.journey(shipmentId);
    allowed(this.participant(actor, journey));
    const { value } = requireValue(await this.store.get<TripRecord>("trips", String(shipmentId)));
    return { trip: this.view(value, journey) };
  }

  /** Trips the caller may see. Missing shipments, missing trips and other people's are left out. */
  async many(actor: Principal, ids: number[]): Promise<TripsResponse> {
    const trips = [];
    for (const id of ids) {
      const row = await this.store.get<TripRecord>("trips", String(id));
      if (!row) continue;
      const shipment = await this.chain.view<Shipment | null>("get_shipment", { id });
      if (!shipment) continue;
      const destination = await this.chain.view<Destination | null>("get_destination", {
        id: shipment.destination,
      });
      if (!destination) continue;
      const journey = { shipment, destination };
      if (this.participant(actor, journey)) trips.push(this.view(row.value, journey));
    }
    return { trips };
  }

  /**
   * The newest point from the driver's phone, only while the truck is on the road. Only the
   * newest point is kept. Coordinates are never logged.
   */
  async locate(
    actor: Principal,
    shipmentId: number,
    input: LocationUpdate,
  ): Promise<{ location: TruckLocation }> {
    const journey = await this.journey(shipmentId);
    allowed(actor.accountId === journey.shipment.driver);
    if (journey.shipment.status !== "PickedUp") throw new ApiException(409, "E_NOT_ON_ROAD");
    const row = requireValue(await this.store.get<TripRecord>("trips", String(shipmentId)));
    const now = this.now();
    const previous = row.value.locationReceivedAt;
    if (previous && now - Date.parse(previous) < LOCATION_EVERY_MS)
      throw new ApiException(429, "E_RATE_LIMIT");
    const recordedAt = Math.min(input.recordedAt ? Date.parse(input.recordedAt) : now, now);
    const last = row.value.lastLocation;
    /* A point older than the one kept arrived late. The newer point stays. */
    if (last && recordedAt <= Date.parse(last.recordedAt)) return { location: last };
    const location: TruckLocation = {
      lat: input.lat,
      lng: input.lng,
      recordedAt: new Date(recordedAt).toISOString(),
      source: "gps",
    };
    await this.store.replace("trips", String(shipmentId), row.version, {
      ...row.value,
      lastLocation: location,
      locationReceivedAt: new Date(now).toISOString(),
    });
    return { location };
  }

  private async journey(id: number): Promise<Journey> {
    const shipment = requireValue(await this.chain.view<Shipment | null>("get_shipment", { id }));
    const destination = requireValue(
      await this.chain.view<Destination | null>("get_destination", { id: shipment.destination }),
    );
    return { shipment, destination };
  }

  private participant(actor: Principal, { shipment, destination }: Journey): boolean {
    return [shipment.shipper, shipment.driver, destination.warehouse].includes(actor.accountId);
  }

  /**
   * The place of the newest warehouse invite this shipper sent that the destination's
   * warehouse accepted and that points at a destination place.
   */
  private async destinationPlace({ shipment, destination }: Journey): Promise<Place> {
    const invites = (
      await this.store.list<InviteRecord>("invites", {
        shipperId: shipment.shipper,
        type: "warehouse",
        acceptedBy: destination.warehouse,
      })
    )
      .map((row) => row.value)
      .filter((invite) => invite.placeId)
      .sort((a, b) => (b.acceptedAt ?? "").localeCompare(a.acceptedAt ?? ""));
    for (const invite of invites) {
      const place = await this.store.get<Place>("places", invite.placeId!);
      if (place && place.value.kind === "destination" && place.value.shipperId === shipment.shipper)
        return place.value;
    }
    throw new ApiException(409, "E_NO_PLACE");
  }

  private same(record: TripRecord, input: TripCreate, journey: Journey): { trip: Trip } {
    if (record.pickup.id !== input.pickupPlaceId) conflict();
    return { trip: this.view(record, journey) };
  }

  private view(record: TripRecord, { shipment }: Journey): Trip {
    const { createdAt, locationReceivedAt, ...trip } = record;
    void createdAt;
    void locationReceivedAt;
    const simulated =
      this.settings.DEMO_LOCATION_SIMULATION === "on" &&
      shipment.status === "PickedUp" &&
      shipment.picked_up_at;
    return {
      ...trip,
      simulation: simulated
        ? {
            startedAt: chainTime(shipment.picked_up_at!),
            durationSec: this.settings.DEMO_TRIP_SECONDS,
          }
        : null,
    };
  }
}
