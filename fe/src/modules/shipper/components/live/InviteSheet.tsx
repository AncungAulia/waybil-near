"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useInvalidate } from "@/hooks/useInvalidate";
import { qk } from "@/lib/queryKeys";
import { useAuth } from "@/providers/AuthProvider";
import type { InviteCreatedResponse, Place, PlaceCreate } from "@waybil/shared";
import { Copy, MapPin } from "@phosphor-icons/react";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { Alert, failure } from "./shared";
import { PhoneInput } from "@/components/elements/PhoneInput";
import { movePin, PlacePicker } from "@/components/elements/PlacePicker";
import { RouteMap } from "@/components/elements/RouteMap";
import { cn } from "@/lib/cn";
import { RadioCards } from "@/components/ui/RadioCards";
import { dialCode, phoneError, toE164 } from "@/lib/phone";

export function InviteSheet({
  type,
  onClose,
}: {
  type: "driver" | "warehouse";
  onClose: () => void;
}) {
  const account = useAuth().profile?.accountId;
  const invalidate = useInvalidate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  /* Indonesia first, since most demo trucks run there. The picker lists every country. */
  const [phoneCountry, setPhoneCountry] = useState("ID");
  const [spot, setSpot] = useState<{ address: string; lat: number | null; lng: number | null }>({
    address: "",
    lat: null,
    lng: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /* The number as the backend wants it (E.164), or undefined while it isn't valid. */
  const e164 = toE164(phone, phoneCountry);
  const phoneOk = !!e164;
  /* A place is a destination (a warehouse that confirms arrivals) or a pickup point (where trucks load). */
  const placeSheet = type === "warehouse";
  const [kind, setKind] = useState<"destination" | "pickup">("destination");
  const pickup = type === "warehouse" && kind === "pickup";
  const pinned = !!spot.address.trim() && spot.lat != null && spot.lng != null;
  const ready = pickup
    ? name.trim() && pinned
    : name.trim() && phoneOk && (type === "driver" || pinned);

  /* Saves the place, then sends the invite. Answers with the invite code, or null for a pickup. */
  async function save() {
      /* A destination is saved as a place first, so its pin shows on every trip map. */
      const place =
        type === "warehouse"
          ? (
              await api<{ place: Place }>("/places", {
                body: {
                  kind,
                  name: name.trim(),
                  address: spot.address.trim(),
                  lat: spot.lat!,
                  lng: spot.lng!,
                } satisfies PlaceCreate,
              })
            ).place
          : null;
      /* A pickup point needs no invite. It is ready for the next shipment. */
      if (pickup) return null;
      const result = await api<InviteCreatedResponse>("/invites", {
        body: {
          type,
          name: name.trim(),
          phone: e164,
          ...(place && { address: place.address, placeId: place.id }),
        },
      });
      return result.invite.code;
  }
  const sending = useMutation({
    mutationFn: save,
    /*
     * The new place and invite show on the network page and in the shipment form. A place
     * can be saved even when its invite then fails, so both outcomes read again.
     */
    onSettled: () => {
      if (account) void invalidate(qk.shipper(account), qk.places(account));
    },
    onSuccess: (code) => {
      if (code === null) return onClose();
      /* The same app the shipper is using, so a local test gives a local link. */
      setLink(`${window.location.origin}/join/${code}`);
    },
    onError: (e) => setError(failure(e)),
  });
  const busy = sending.isPending;
  function send() {
    setError(null);
    sending.mutate();
  }

  return (
    <ActionSheet
      title={type === "driver" ? "Invite a driver" : "Add a place"}
      onClose={onClose}
      /* On a wide screen a place sheet puts the form on the left and a large map on the right. */
      className={cn(placeSheet && !link && "lg:w-1000")}
    >
      {link ? (
        <>
          <p className="text-label">
            Send this link to {name.trim()}. Once they accept it, add them to your network here.
          </p>
          <p className="rounded-row bg-ds-canvas p-14 text-label break-all">{link}</p>
          <Button
            icon={<Copy size={17} />}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Link copied" : "Copy the link"}
          </Button>
          <Button variant="quiet" onClick={onClose}>
            Done
          </Button>
        </>
      ) : (
        <>
          <div className={cn("grid gap-16", placeSheet && "lg:grid-cols-2 lg:gap-28")}>
            <div className="flex min-w-0 flex-col gap-16">
              {type === "warehouse" && (
                <RadioCards
                  name="place-kind"
                  options={[
                    {
                      value: "destination",
                      title: "Destination",
                      body: "A warehouse that receives goods and confirms each arrival.",
                    },
                    {
                      value: "pickup",
                      title: "Pickup point",
                      body: "Where trucks load your goods, such as a factory or a depot.",
                    },
                  ]}
                  value={kind}
                  onChange={setKind}
                />
              )}
              <Input
                label={
                  type === "driver"
                    ? "Driver’s name"
                    : pickup
                      ? "Pickup point name"
                      : "Destination name"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {!pickup && (
                <PhoneInput
                  label={type === "driver" ? "WhatsApp number" : "Receiver’s WhatsApp number"}
                  value={phone}
                  onChange={setPhone}
                  code={dialCode(phoneCountry)}
                  onCodeChange={() => {}}
                  country={phoneCountry}
                  onCountryChange={setPhoneCountry}
                  showHint={false}
                  error={
                    phone.replace(/\D/g, "").length > 5 && !phoneOk
                      ? phoneError(phone, phoneCountry)
                      : undefined
                  }
                />
              )}
              {type === "warehouse" && (
                <PlacePicker
                  label="Address"
                  value={spot}
                  onChange={setSpot}
                  hint={
                    pickup
                      ? "Trucks load your goods here."
                      : "The warehouse here confirms each arrival."
                  }
                  showMap={false}
                />
              )}
            </div>
            {/* The map waits for an address, so an empty form stays short. */}
            {placeSheet &&
              (spot.lat != null && spot.lng != null ? (
                <RouteMap
                  pin={{ lat: spot.lat, lng: spot.lng }}
                  onPick={(lat, lng) => void movePin(lat, lng, setSpot)}
                  className="h-240 w-full lg:h-full lg:min-h-440"
                />
              ) : (
                <div className="hidden flex-col items-center justify-center gap-10 rounded-row bg-ds-canvas p-24 text-center lg:flex">
                  <MapPin size={28} className="text-ds-muted" aria-hidden />
                  <p className="max-w-260 text-label text-ds-muted">
                    Search the address on the left. Its pin shows here, and you can drag it to the
                    exact spot.
                  </p>
                </div>
              ))}
          </div>
          {error && <Alert>{error}</Alert>}
          <Button
            disabled={!ready}
            loading={busy}
            loadingLabel={pickup ? "Saving" : "Sending"}
            onClick={send}
          >
            {pickup ? "Save the pickup point" : "Make the invite link"}
          </Button>
        </>
      )}
    </ActionSheet>
  );
}
