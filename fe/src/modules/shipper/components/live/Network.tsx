"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, UserPlus } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { WAYBIL_CONTRACT } from "@/lib/env";
import { callContract } from "@/lib/wallet";
import { names, waitingToAdd, type LiveShipperData } from "../../data/live";
import { InviteSheet } from "./InviteSheet";
import { NetworkEmpty } from "../ShipperNetwork";
import { cn } from "@/lib/cn";
import { DoneNote, failure, GAS, type Done } from "./shared";

/* P5. */
export function Network({ data, refresh }: { data: LiveShipperData; refresh: () => void }) {
  const { people, places } = names(data.invites);
  const [inviting, setInviting] = useState<"driver" | "warehouse" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Done>(null);
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
  /* Nothing yet: no drivers, no destinations, no invite waiting or to add. */
  const bare =
    !data.network.drivers.length &&
    !data.network.destinations.length &&
    !waiting.length &&
    !open.length &&
    !sharedDriver &&
    !done;

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
      setDone({ text: `${label} is in your network now.`, tx });
      refresh();
    } catch (e) {
      setDone({ text: failure(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
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
        className={cn(
          "grid gap-16 lg:grid-cols-2",
          bare
            ? "min-h-[calc(100dvh-268px)] grid-rows-2 md:min-h-[calc(100dvh-252px)] lg:min-h-[calc(100dvh-260px)] lg:grid-rows-1"
            : "items-start",
        )}
      >
        <Panel title="Drivers" className={cn(bare && "h-full")}>
          {data.network.drivers.length === 0 && <NetworkEmpty kind="driver" />}
          {data.network.drivers.map((d) => (
            <div key={d} className="py-8">
              <p className="text-label break-all">{people[d] ?? d}</p>
              {people[d] && <p className="text-caption break-all text-ds-muted">{d}</p>}
            </div>
          ))}
        </Panel>
        <Panel title="Destinations" className={cn(bare && "h-full")}>
          {data.network.destinations.length === 0 && <NetworkEmpty kind="warehouse" />}
          {data.network.destinations.map((d) => (
            <div key={d.id} className="py-8">
              <p className="text-label break-all">{places[d.warehouse]?.name ?? d.warehouse}</p>
              {places[d.warehouse] && (
                <p className="text-caption break-all text-ds-muted">
                  {places[d.warehouse]!.address || d.warehouse}
                </p>
              )}
            </div>
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
      {inviting && (
        <InviteSheet type={inviting} onClose={() => setInviting(null)} onSent={() => refresh()} />
      )}
    </>
  );
}
