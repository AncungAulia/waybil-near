"use client";
import { useState } from "react";
import type { Place, PlaceCreate } from "@waybil/shared";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PlacePicker } from "@/components/elements/PlacePicker";
import { api } from "@/lib/api";
import { Alert, failure } from "./shared";

/* Where trucks load the goods, such as a factory or a depot. Each shipment starts at one. */
export function PickupSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [spot, setSpot] = useState<{ address: string; lat: number | null; lng: number | null }>({
    address: "",
    lat: null,
    lng: null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = !!name.trim() && !!spot.address.trim() && spot.lat != null && spot.lng != null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api<{ place: Place }>("/places", {
        body: {
          kind: "pickup",
          name: name.trim(),
          address: spot.address.trim(),
          lat: spot.lat!,
          lng: spot.lng!,
        } satisfies PlaceCreate,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(failure(e));
      setBusy(false);
    }
  }

  return (
    <ActionSheet title="Add a pickup point" onClose={onClose}>
      <Input
        label="Name"
        placeholder="Main factory"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <PlacePicker
        label="Address"
        value={spot}
        onChange={setSpot}
        hint="Trucks load your goods here."
      />
      {error && <Alert>{error}</Alert>}
      <Button disabled={!ready} loading={busy} loadingLabel="Saving" onClick={() => void save()}>
        Save the pickup point
      </Button>
    </ActionSheet>
  );
}
