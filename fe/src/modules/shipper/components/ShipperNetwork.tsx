"use client";
import { useState } from "react";
import { useOrigin } from "@/hooks/useOrigin";
import { QRCodeSVG } from "qrcode.react";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/elements/Avatar";
import { GateMap } from "@/components/elements/GateMap";
import { DemoRecord } from "@/components/elements/DemoRecord";
import type { ShipperState } from "../data/fixtures";

export function ShipperNetwork({
  state,
  go,
}: {
  state: ShipperState;
  go: (s: ShipperState) => void;
}) {
  const empty = state === "P5.2";
  const [name, setName] = useState("Chris Novak"),
    [place, setPlace] = useState("Harbor Hub"),
    [address, setAddress] = useState("9 Pier Street, Harbor City"),
    [email, setEmail] = useState("lena@harborhub.com");
  const [added, setAdded] = useState(false),
    [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState(false);
  const url = `${useOrigin()}/join/demo-driver`;
  return (
    <>
      <h1 className="text-title md:text-amount">Your network</h1>
      <p className="mt-6 mb-24 text-label text-ds-muted">
        Drivers you hire and warehouses you deliver to
      </p>
      <div className="grid gap-16 md:grid-cols-2">
        <Panel
          title={`Drivers ${empty ? 0 : 3}`}
          action={
            <Button variant="secondary" onClick={() => go("P5.3")}>
              Invite
            </Button>
          }
        >
          {empty ? (
            <div className="flex min-h-320 flex-col items-center justify-center gap-16 text-center">
              <img src="/illustrations/driver.svg" alt="" className="h-120 w-180 object-contain" />
              <h2 className="text-heading">No drivers yet</h2>
              <p className="text-body text-ds-muted">
                Invite the truck owners you already work with. They join with one link.
              </p>
            </div>
          ) : (
            [
              ["Sam", "NWF-204 · 12 trips with you", "Connected"],
              ["Jordan Lee", "JLE-118 · 4 trips with you", "Connected"],
              ["Chris Novak", "Invited 2 h ago over WhatsApp", "Waiting"],
            ].map(([name, meta, status]) => (
              <div key={name} className="flex items-center gap-12 py-12">
                <Avatar name={name!} />
                <div className="min-w-0 flex-1">
                  <p className="text-body">{name}</p>
                  <p className="text-caption text-ds-muted">{meta}</p>
                </div>
                <span className="rounded-full bg-ds-canvas px-10 py-6 text-caption">{status}</span>
              </div>
            ))
          )}
        </Panel>
        <Panel
          title={`Destinations ${empty ? 0 : added ? 3 : 2}`}
          action={
            <Button variant="secondary" onClick={() => go("P5.4")}>
              Add
            </Button>
          }
        >
          {empty ? (
            <div className="flex min-h-320 flex-col items-center justify-center gap-16 text-center">
              <img
                src="/illustrations/warehouse.svg"
                alt=""
                className="h-120 w-180 object-contain"
              />
              <h2 className="text-heading">No destinations yet</h2>
              <p className="text-body text-ds-muted">
                Add the warehouses your goods go to. Their staff confirm arrivals.
              </p>
            </div>
          ) : (
            [
              ["Harbor Hub", "9 Pier Street · Lena receives here", "Linked"],
              ["Riverton branch", "40 River Road · Invite not opened yet", "Waiting"],
              ...(added ? [[place, `${address} · ${email}`, "Waiting"]] : []),
            ].map(([name, meta, status], i) => (
              <div key={`${name}-${i}`} className="flex items-center gap-12 py-12">
                <Avatar name={name!} />
                <div className="min-w-0 flex-1">
                  <p className="text-body">{name}</p>
                  <p className="text-caption text-ds-muted">{meta}</p>
                </div>
                <span className="rounded-full bg-ds-canvas px-10 py-6 text-caption">{status}</span>
              </div>
            ))
          )}
        </Panel>
      </div>
      {added && (
        <div className="mt-16">
          <DemoRecord title="Demo destination invite" />
        </div>
      )}
      {state === "P5.3" && (
        <ActionSheet title="Invite a driver" onClose={() => go("P5.1")}>
          <p className="text-body text-ds-muted">
            Send this link to the truck owner. When they open it and sign up, they show up in your
            list.
          </p>
          <Input label="Name only you see" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex items-center justify-between gap-8 rounded-small bg-ds-canvas p-12">
            <span className="break-all text-caption">{url}</span>
            <button
              className="focus-ring shrink-0 rounded-small p-8 text-label"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                } catch {
                  setCopyError(true);
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {copyError && (
            <p className="text-caption text-ds-muted">Select the link above to copy it.</p>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Join Northwind on Waybil. ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="press focus-ring rounded-full bg-ds-ink px-20 py-14 text-center text-body text-ds-bg"
          >
            Share on WhatsApp ↗
          </a>
          <div className="mx-auto w-160">
            <QRCodeSVG value={url} size={160} marginSize={4} className="h-auto w-full" />
          </div>
          <p className="text-caption text-ds-muted">
            Meeting in person? They can scan this instead. The link works once and expires in 7
            days.
          </p>
        </ActionSheet>
      )}
      {state === "P5.4" && (
        <ActionSheet title="Add a destination" onClose={() => go("P5.1")}>
          <Input
            label="Name"
            hint="What your team calls it"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          />
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <GateMap />
          <p className="text-caption text-ds-muted">Pin the gate where trucks unload.</p>
          <Input
            label="Receiver's work email"
            hint="They receive an invite to confirm arrivals here."
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            disabled={!place.trim() || !address.trim() || !/^\S+@\S+\.\S+$/.test(email)}
            onClick={() => {
              setAdded(true);
              go("P5.1");
            }}
          >
            Add and send invite
          </Button>
        </ActionSheet>
      )}
    </>
  );
}
