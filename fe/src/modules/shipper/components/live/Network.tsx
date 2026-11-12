"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Check, Copy, MapTrifold, Plus, UserPlus } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Avatar } from "@/components/elements/Avatar";
import { nearblocksUrl, WAYBIL_CONTRACT } from "@/lib/env";
import { callContract } from "@/lib/wallet";
import { names, waitingToAdd, type LiveShipperData } from "../../data/live";
import { InviteSheet } from "./InviteSheet";
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
      ? `Signed up as ${own}.`
      : "";
  };
  const [inviting, setInviting] = useState<"driver" | "warehouse" | null>(null);
  const { data: placeList, reload: reloadPlaces } = usePlaces();
  const pickups = (placeList?.places ?? []).filter((p) => p.kind === "pickup");
  /* A destination's pin is the place on the warehouse invite it came from. */
  const destinationPlace = (warehouse: string) => {
    const id = data.invites.find(
      (i) => i.type === "warehouse" && i.acceptedBy === warehouse && i.placeId,
    )?.placeId;
    return (placeList?.places ?? []).find((p) => p.id === id) ?? null;
  };
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
  const bare = !data.network.drivers.length && !data.network.destinations.length && !pickups.length;

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
            <span className="md:hidden">Place</span>
            <span className="hidden md:inline">Add a place</span>
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
                <NameTag name={people[sharedDriver] ?? sharedDriver} tag="Driver" />
                <p className="text-caption text-ds-muted">They shared their link with you.</p>
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
                <NameTag name={i.name} tag={i.type === "driver" ? "Driver" : "Destination"} />
                <p className="text-caption break-all text-ds-muted">
                  They accepted your invite. {signedUpAs(i.acceptedBy, i.name)}
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
      {/* With nothing in the network yet, the two empty cards fill the window, as the board draws it. */}
      <div
        className={cn("grid gap-16 lg:grid-cols-2", "flex-1", bare && "grid-rows-2 lg:grid-rows-1")}
      >
        <Panel title="Drivers" className="h-full">
          {data.network.drivers.length === 0 && <NetworkEmpty kind="driver" />}
          {data.network.drivers.map((d) => {
            const label = people[d] ?? name(d);
            return (
              <Member
                key={d}
                name={label}
                tag="Driver"
                lines={[signedUpAs(d, label) || "Ready for trips."]}
                account={d}
              />
            );
          })}
        </Panel>
        <Panel title="Destinations" className="h-full">
          {data.network.destinations.length === 0 && pickups.length === 0 && (
            <NetworkEmpty kind="warehouse" />
          )}
          {pickups.map((p) => (
            <Member key={p.id} name={p.name} tag="Pickup point" lines={[p.address]} place={p} />
          ))}
          {data.network.destinations.map((d) => (
            <Member
              key={d.id}
              name={places[d.warehouse]?.name ?? name(d.warehouse)}
              tag="Destination"
              lines={places[d.warehouse]?.address ? [places[d.warehouse]!.address] : []}
              account={d.warehouse}
              place={destinationPlace(d.warehouse)}
            />
          ))}
        </Panel>
      </div>
      {open.length > 0 && (
        <Panel title="Invites waiting">
          {open.map((i) => (
            <div key={i.code} className="flex items-center gap-12 py-8">
              <div className="min-w-0 flex-1">
                <NameTag name={i.name} tag={i.type === "driver" ? "Driver" : "Destination"} />
                <p className="text-caption text-ds-muted">
                  Sent to {i.phone}. The link works until{" "}
                  {new Date(i.expiresAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  .
                </p>
              </div>
              <CopyInvite code={i.code} name={i.name} />
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
      {inviting && (
        <InviteSheet
          type={inviting}
          onClose={() => setInviting(null)}
          onSent={() => {
            refresh();
            reloadPlaces();
          }}
        />
      )}
    </div>
  );
}

/* One person or place in the network: who it is, short facts, and their account on NearBlocks. */
function Member({
  name,
  tag,
  lines,
  account,
  place,
}: {
  name: string;
  /** What it is, shown as a small label next to the name. */
  tag: string;
  /** Short sentences under the name, one per line. */
  lines: string[];
  /** The NEAR account, linked to NearBlocks. */
  account?: string;
  /** The pin, linked to Google Maps. */
  place?: { lat: number; lng: number } | null;
}) {
  const links = [
    ...(place
      ? [
          {
            label: "Map",
            aria: `Open ${name} in Google Maps`,
            href: `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`,
            icon: <MapTrifold size={17} aria-hidden />,
          },
        ]
      : []),
    ...(account
      ? [
          {
            label: "NearBlocks",
            aria: `See ${name} on NearBlocks`,
            href: nearblocksUrl(`/address/${account}`),
            icon: <ArrowUpRight size={17} aria-hidden />,
          },
        ]
      : []),
  ];
  return (
    <div className="flex items-center gap-12 py-10">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <NameTag name={name} tag={tag} bold />
        {lines.map((line) => (
          <p key={line} className="text-caption text-ds-muted">
            {line}
          </p>
        ))}
        {account && <p className="text-caption break-all text-ds-muted">{account}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-8 sm:gap-16">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={l.aria}
            className="link focus-ring tap grid size-40 place-items-center rounded-full bg-ds-canvas text-[14px] font-medium sm:flex sm:size-auto sm:bg-transparent"
          >
            {/* A short label on wider screens, an icon alone on a phone. */}
            <span className="hidden sm:inline">{l.label} ↗</span>
            <span className="sm:hidden">{l.icon}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/*
 * Copies an open invite's link again, for when the first message got lost. The link uses
 * this site's own address, so it opens the same app the shipper is using.
 */
function CopyInvite({ code, name }: { code: string; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy the invite link for ${name}`}
      className="tap focus-ring flex shrink-0 items-center gap-6 rounded-full bg-ds-canvas px-14 py-10 text-[14px] font-medium hover:bg-ds-canvas-hover"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}

/* A name with a small grey label for what it is, instead of joining the two with a dot. */
function NameTag({ name, tag, bold = false }: { name: string; tag: string; bold?: boolean }) {
  return (
    <p className="flex flex-wrap items-center gap-x-8 gap-y-2">
      <span className={cn("text-label break-words", bold && "font-semibold")}>{name}</span>
      <span className="rounded-full bg-ds-canvas px-8 py-2 text-[12px] font-medium text-ds-ink-2">
        {tag}
      </span>
    </p>
  );
}
