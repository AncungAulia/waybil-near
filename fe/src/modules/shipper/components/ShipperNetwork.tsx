"use client";

import { useState } from "react";
import { useOrigin } from "@/hooks/useOrigin";
import { QRCodeSVG } from "qrcode.react";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Input } from "@/components/ui/Input";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/elements/Avatar";
import { GateMap } from "@/components/elements/GateMap";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { cn } from "@/lib/cn";
import type { ShipperState } from "../data/fixtures";

const FIELD = "[&>label]:leading-[16px] [&>p]:leading-[15px]";

export function ShipperNetwork({
  state,
  go,
}: {
  state: ShipperState;
  go: (s: ShipperState) => void;
}) {
  const empty = state === "P5.2";
  const [name, setName] = useState("Chris Novak");
  const [place, setPlace] = useState("Harbor Hub");
  const [address, setAddress] = useState("9 Pier Street, Harbor City");
  const [email, setEmail] = useState("lena@harborhub.com");
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const url = useOrigin() + "/join/demo-driver";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <>
      <div className="mb-16 md:mb-24">
        <h1 className="text-[30px] leading-[32px] font-medium tracking-[-0.03em] md:text-[40px] md:leading-[42px]">
          Your network
        </h1>
        <p className="mt-6 hidden text-[14px] leading-[17px] text-ds-muted md:block">
          Drivers you hire and warehouses you deliver to
        </p>
      </div>
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)] gap-16 xl:grid-cols-2",
          empty
            ? "min-h-[calc(100dvh-233px)] grid-rows-2 md:min-h-[calc(100dvh-237px)] xl:min-h-[calc(100dvh-245px)] xl:grid-rows-1"
            : "items-start",
        )}
      >
        <Panel
          title="Drivers"
          titleClassName="text-[19px] leading-[23px]"
          gap={4}
          className={cn(
            "px-22 pt-22 pb-14 [&>div:first-child]:pb-10 [&>div:first-child>span]:gap-10",
            empty && "h-full",
          )}
          badge={<NetworkCount count={empty ? 0 : 3} />}
          action={
            <Button
              variant="secondary"
              className="text-[15px]"
              icon={<NetworkGlyph kind="plus" />}
              onClick={() => go("P5.3")}
            >
              Invite
            </Button>
          }
        >
          {empty ? (
            <NetworkEmpty kind="driver" />
          ) : (
            <>
              <NetworkRow
                name="Sam"
                avatar="Sam Carter"
                meta="NWF-204 · 12 trips with you"
                status="Connected"
              />
              <NetworkRow name="Jordan Lee" meta="JLE-118 · 4 trips with you" status="Connected" />
              <NetworkRow
                name="Chris Novak"
                meta="Invited 2 h ago over WhatsApp"
                status="Waiting"
              />
            </>
          )}
        </Panel>
        <Panel
          title="Destinations"
          titleClassName="text-[19px] leading-[23px]"
          gap={4}
          className={cn(
            "px-22 pt-22 pb-14 [&>div:first-child]:pb-10 [&>div:first-child>span]:gap-10",
            empty && "h-full",
          )}
          badge={<NetworkCount count={empty ? 0 : added ? 3 : 2} />}
          action={
            <Button
              variant="secondary"
              className="text-[15px]"
              icon={<NetworkGlyph kind="plus" />}
              onClick={() => go("P5.4")}
            >
              Add
            </Button>
          }
        >
          {empty ? (
            <NetworkEmpty kind="warehouse" />
          ) : (
            <>
              <NetworkRow
                name="Harbor Hub"
                meta="9 Pier Street · Lena receives here"
                status="Linked"
              />
              <NetworkRow
                name="Riverton branch"
                meta="40 River Road · Invite not opened yet"
                status="Waiting"
              />
              {added && <NetworkRow name={place} meta={address + " · " + email} status="Waiting" />}
            </>
          )}
        </Panel>
      </div>
      {added && (
        <div className="mt-16">
          <DemoRecord title="Demo destination invite" />
        </div>
      )}
      {state === "P5.3" && (
        <ActionSheet
          title="Invite a driver"
          appearance="payment"
          className="md:w-440"
          onClose={() => go("P5.1")}
        >
          <p className="text-[14px] leading-[20px] text-ds-muted">
            Send this link to the truck owner. When they open it and sign up, they show up in your
            list.
          </p>
          <Input
            label="Name (only you see this)"
            className={FIELD}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex items-center gap-10 rounded-[16px] bg-ds-canvas px-16 py-14">
            <NetworkGlyph kind="link" size={16} className="shrink-0" />
            <span title={url} className="min-w-0 flex-1 truncate text-[14px] leading-[17px]">
              {url.replace(/^https?:\/\//, "")}
            </span>
            <button
              type="button"
              className="focus-ring shrink-0 rounded-small text-[13px] leading-[16px] font-semibold text-ds-brand-deep"
              onClick={copy}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {copyError && (
            <p role="status" className="text-caption text-ds-muted">
              Select the link above to copy it.
            </p>
          )}
          <ButtonLink
            icon={<NetworkGlyph kind="send" />}
            className="h-52 text-[15px]"
            href={"https://wa.me/?text=" + encodeURIComponent("Join Northwind on Waybil. " + url)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on WhatsApp
          </ButtonLink>
          <div className="flex items-center gap-14 rounded-[18px] bg-ds-canvas p-14">
            <span className="grid size-64 shrink-0 place-items-center rounded-[12px] bg-ds-bg">
              <QRCodeSVG value={url} size={44} marginSize={0} />
            </span>
            <p className="text-[13px] leading-[19px] text-ds-ink-2">
              Meeting in person? They can scan this instead. The link works once and expires in 7
              days.
            </p>
          </div>
        </ActionSheet>
      )}
      {state === "P5.4" && (
        <ActionSheet
          title="Add a destination"
          appearance="payment"
          className="md:w-560"
          onClose={() => go("P5.1")}
        >
          <Input
            label="Name"
            hint="What your team calls it"
            className={FIELD}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          />
          <Input
            label="Address"
            className={FIELD}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <GateMap appearance="destination" />
          <p className="text-[12.5px] leading-[15px] text-ds-muted">
            Drag the pin to the gate where trucks unload.
          </p>
          <Input
            label="Receiver's work email"
            hint="We'll send them an invite to confirm arrivals here"
            className={FIELD}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            className="h-52 w-full text-[15px] md:w-fit md:self-end"
            icon={<NetworkGlyph kind="arrow" />}
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

function NetworkCount({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-ds-canvas px-10 py-2 text-[12px] leading-[15px] text-ds-ink">
      {count}
    </span>
  );
}

function NetworkRow({
  name,
  avatar,
  meta,
  status,
}: {
  name: string;
  avatar?: string;
  meta: string;
  status: "Connected" | "Linked" | "Waiting";
}) {
  return (
    <div className="flex items-center gap-14 px-4 py-14">
      <Avatar name={avatar ?? name} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[15px] leading-[18px] font-medium">{name}</p>
        <p className="text-[13px] leading-[19px] text-ds-muted">{meta}</p>
      </div>
      <span className="flex shrink-0 items-center gap-6 rounded-full bg-ds-canvas px-12 py-6 text-[12px] leading-[15px] font-medium">
        <span
          className={cn(
            "size-7 rounded-full",
            status === "Connected"
              ? "bg-ds-success"
              : status === "Linked"
                ? "bg-ds-info"
                : "bg-ds-warning",
          )}
        />
        {status}
      </span>
    </div>
  );
}

function NetworkEmpty({ kind }: { kind: "driver" | "warehouse" }) {
  return (
    <div className="flex min-h-[199.5px] flex-1 flex-col items-center justify-center gap-10 text-center">
      <img src={"/illustrations/network/empty-" + kind + ".svg"} alt="" className="h-102 w-136" />
      <h2 className="text-[15px] leading-[18px] font-medium">
        {kind === "driver" ? "No drivers yet" : "No destinations yet"}
      </h2>
      <p className="max-w-280 text-[13px] leading-[16px] text-ds-muted">
        {kind === "driver"
          ? "Invite the truck owners you already work with. They join with one link."
          : "Add the warehouses your goods go to. Their staff confirm arrivals."}
      </p>
    </div>
  );
}

function NetworkGlyph({
  kind,
  size = 17,
  className,
}: {
  kind: "plus" | "send" | "link" | "arrow";
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {kind === "plus" && <path d="M12 5v14M5 12h14" />}
      {kind === "send" && (
        <>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </>
      )}
      {kind === "link" && (
        <>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </>
      )}
      {kind === "arrow" && <path d="M7 17 17 7M7 7h10v10" />}
    </svg>
  );
}
