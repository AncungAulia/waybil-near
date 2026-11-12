"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, MapPin, Plus, UserPlus } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Avatar } from "@/components/elements/Avatar";
import { nearblocksUrl, WAYBIL_CONTRACT } from "@/lib/env";
import { callContract } from "@/lib/wallet";
import { names, waitingToAdd, type LiveShipperData } from "../../data/live";
import { InviteSheet } from "./InviteSheet";
import { PickupSheet } from "./PickupSheet";
import { usePlaces } from "@/hooks/useTrips";
import { NetworkEmpty } from "../ShipperNetwork";
import { cn } from "@/lib/cn";
import { useNames } from "@/hooks/useNames";
import { DoneNote, failure, FULL, GAS, type Done } from "./shared";

/* P5. */
export function Network({ data, refresh }: { data: LiveShipperData; refresh: () => void }) {
  const { people, places } = names(data.invites);
  /*
   * The shipper's own name for each person leads, the way a phone contact does. When the
   * person signed up under another name, it shows under it so the two never look like a mix-up.
   */
  const name = useNames([
    ...data.network.drivers,
    ...data.invites.flatMap((i) => (i.acceptedBy ? [i.acceptedBy] : [])),
  ]);
  const signedUpAs = (account: string | null | undefined, label: string) => {
    if (!account) return "";
    const own = name(account);
    return own !== account && own.trim().toLowerCase() !== label.trim().toLowerCase()
      ? ` · Signed up as ${own}`
      : "";
  };
  const [inviting, setInviting] = useState<"driver" | "warehouse" | null>(null);
  const [addingPickup, setAddingPickup] = useState(false);
  const { data: placeList, reload: reloadPlaces } = usePlaces();
  const pickups = (placeList?.places ?? []).filter((p) => p.kind === "pickup");
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Done>(null);
  /* A successful add opens a dialog with its record. A failure stays as a note on the page. */
  const [added, setAdded] = useState<{
    label: string;
    type: "driver" | "warehouse";
    tx: string;
  } | null>(null);
  const waiting = waitingToAdd(data);
  const open = data.invites.filter((i) => !i.acceptedBy);
  /* A driver's own link (/c/<account>) opens this page with ?driver=<account>. */
  const shared = useSearchParams().get("driver");
  const sharedDriver =
    shared &&
    /^[a-z0-9._-]{2,64}$/.test(shared) &&
    !data.network.drivers.includes(shared) &&
    !waiting.some((i) => i.acceptedBy === shared)
      ? shared
      : null;
  /* No drivers and no destinations yet. The two empty cards then fill the rest of the window. */
  const bare = !data.network.drivers.length && !data.network.destinations.length;

  async function add(type: "driver" | "warehouse", account: string, label: string) {
    setBusy(account);
    setDone(null);
    try {
      const tx = await callContract(
        WAYBIL_CONTRACT,
        type === "driver" ? "add_driver" : "add_destination",
        type === "driver" ? { driver: account } : { warehouse: account },
        { gas: GAS },
      );
      setAdded({ label, type, tx });
      refresh();
    } catch (e) {
      setDone({ text: failure(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-24", FULL)}>
      <header className="flex flex-wrap items-end justify-between gap-12">
        <div>
          <h1 className="text-title">Network</h1>
          <p className="mt-6 text-label text-ds-muted">
            The drivers and destinations you can send trips to.
          </p>
        </div>
        {/* On a phone the two actions share the full width, half each, with shorter labels. */}
        <div className="grid w-full grid-cols-2 gap-10 md:flex md:w-auto">
          <Button
            variant="secondary"
            icon={<Plus size={17} />}
            className="w-full min-w-0 md:w-auto"
            onClick={() => setInviting("warehouse")}
          >
            <span className="md:hidden">Destination</span>
            <span className="hidden md:inline">Add a destination</span>
          </Button>
          <Button
            icon={<UserPlus size={17} />}
            className="w-full min-w-0 md:w-auto"
            onClick={() => setInviting("driver")}
          >
            <span className="md:hidden">Invite driver</span>
            <span className="hidden md:inline">Invite a driver</span>
          </Button>
        </div>
      </header>
      <DoneNote done={done} />
      {(waiting.length > 0 || sharedDriver) && (
        <Panel title="Ready to add">
          {sharedDriver && (
            <div className="flex flex-wrap items-center justify-between gap-12 py-8">
              <div className="min-w-0">
                <p className="text-label break-all">{people[sharedDriver] ?? sharedDriver}</p>
                <p className="text-caption text-ds-muted">Driver · shared their link with you</p>
              </div>
              <Button
                loading={busy === sharedDriver}
                loadingLabel="Waiting for wallet"
                onClick={() =>
                  void add("driver", sharedDriver, people[sharedDriver] ?? sharedDriver)
                }
              >
                Add to your network
              </Button>
            </div>
          )}
          {waiting.map((i) => (
            <div key={i.code} className="flex flex-wrap items-center justify-between gap-12 py-8">
              <div className="min-w-0">
                <p className="text-label">{i.name}</p>
                <p className="text-caption break-all text-ds-muted">
                  {i.type === "driver" ? "Driver" : "Destination"} · accepted your invite
                  {signedUpAs(i.acceptedBy, i.name)}
                </p>
              </div>
              <Button
                loading={busy === i.acceptedBy}
                loadingLabel="Waiting for wallet"
                onClick={() => void add(i.type, i.acceptedBy!, i.name)}
              >
                Add to your network
              </Button>
            </div>
          ))}
        </Panel>
      )}
      <Panel
        title="Pickup points"
        action={
          <Button
            variant="secondary"
            icon={<MapPin size={17} />}
            onClick={() => setAddingPickup(true)}
          >
            Add
          </Button>
        }
      >
        {placeList && pickups.length === 0 && (
          <p className="text-label text-ds-muted">
            Add where trucks load your goods. Every shipment starts at one of these.
          </p>
        )}
        {pickups.map((p) => (
          <Member
            key={p.id}
            name={p.name}
            facts={["Pickup point", p.address]}
            href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`}
            linkLabel="Map"
          />
        ))}
      </Panel>
      {/* With nothing in the network yet, the two empty cards fill the window, as the board draws it. */}
      <div
        className={cn("grid gap-16 lg:grid-cols-2", "flex-1", bare && "grid-rows-2 lg:grid-rows-1")}
      >
        <Panel title="Drivers" className="h-full">
          {data.network.drivers.length === 0 && <NetworkEmpty kind="driver" />}
          {data.network.drivers.map((d) => {
            const label = people[d] ?? name(d);
            const signedUp = signedUpAs(d, label).replace(/^ · /, "");
            return (
              <Member
                key={d}
                name={label}
                facts={["Driver", "Ready for trips", ...(signedUp ? [signedUp] : [])]}
                account={d}
              />
            );
          })}
        </Panel>
        <Panel title="Destinations" className="h-full">
          {data.network.destinations.length === 0 && <NetworkEmpty kind="warehouse" />}
          {data.network.destinations.map((d) => (
            <Member
              key={d.id}
              name={places[d.warehouse]?.name ?? name(d.warehouse)}
              facts={[
                "Destination",
                ...(places[d.warehouse]?.address ? [places[d.warehouse]!.address] : []),
              ]}
              account={d.warehouse}
            />
          ))}
        </Panel>
      </div>
      {open.length > 0 && (
        <Panel title="Invites waiting">
          {open.map((i) => (
            <div key={i.code} className="py-8">
              <p className="text-label">
                {i.name} · {i.type === "driver" ? "Driver" : "Destination"}
              </p>
              <p className="text-caption text-ds-muted">
                Sent to {i.phone}. The link works until{" "}
                {new Date(i.expiresAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                .
              </p>
            </div>
          ))}
        </Panel>
      )}
      {added && (
        <ActionSheet
          title={added.type === "driver" ? "Driver added" : "Destination added"}
          onClose={() => setAdded(null)}
        >
          <p className="text-label">
            {added.label} is in your network now.{" "}
            {added.type === "driver"
              ? "You can pick them when you make a new shipment."
              : "You can send shipments there now."}
          </p>
          <ButtonLink
            href={nearblocksUrl(`/txns/${added.tx}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full justify-between"
          >
            See the record on NearBlocks
          </ButtonLink>
          <Button variant="quiet" onClick={() => setAdded(null)}>
            Close
          </Button>
        </ActionSheet>
      )}
      {addingPickup && (
        <PickupSheet onClose={() => setAddingPickup(false)} onSaved={reloadPlaces} />
      )}
      {inviting && (
        <InviteSheet type={inviting} onClose={() => setInviting(null)} onSent={() => refresh()} />
      )}
    </div>
  );
}

/* One person or place in the network: who it is, short facts, and their account on NearBlocks. */
function Member({
  name,
  facts,
  account,
  href = account ? nearblocksUrl(`/address/${account}`) : undefined,
  linkLabel = "NearBlocks",
}: {
  name: string;
  facts: string[];
  account?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center gap-12 border-b border-ds-line py-12 last:border-b-0">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="text-label font-semibold break-words">{name}</p>
        <p className="text-caption text-ds-muted">{facts.join(" · ")}</p>
        {account && <p className="text-caption break-all text-ds-muted">{account}</p>}
      </div>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`See ${name} on ${linkLabel === "Map" ? "the map" : linkLabel}`}
          className="link focus-ring tap grid size-40 shrink-0 place-items-center rounded-full bg-ds-canvas text-[14px] font-medium sm:flex sm:size-auto sm:bg-transparent"
        >
          {/* A short label on wider screens, the arrow alone on a phone. */}
          <span className="hidden sm:inline">{linkLabel} ↗</span>
          <ArrowUpRight size={17} className="sm:hidden" aria-hidden />
        </a>
      )}
    </div>
  );
}
