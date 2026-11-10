import { QrCode } from "@phosphor-icons/react/dist/ssr";
import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusPill, StatusPillSkeleton } from "@/components/elements/StatusPill";
import { Avatar, AvatarSkeleton } from "@/components/elements/Avatar";
import { ProofTag } from "@/components/elements/ProofTag";
import { ProofLink } from "@/components/elements/ProofLink";
import { FanMeter } from "@/components/elements/FanMeter";
import { Stat, StatSkeleton } from "@/components/elements/Stat";
import { CreditMeter, CreditMeterSkeleton } from "@/components/elements/CreditMeter";
import { ProofCard } from "@/components/elements/ProofCard";
import { TimelineStep } from "@/components/elements/TimelineStep";
import { ShipmentRow, ShipmentRowSkeleton } from "@/components/elements/ShipmentRow";
import { BalanceCard } from "@/components/elements/BalanceCard";
import { TxToast } from "@/components/elements/TxToast";
import { WalletMenu } from "@/modules/wallet/components/WalletMenu";
import { CONTRACT_RECORD_URL } from "@/lib/env";
import { SegmentedDemo } from "./SegmentedDemo";
import { ORGANISMS } from "./organisms";

/** A made-up hash, so the gallery's links go somewhere harmless. */
const TX = "11111111111111111111111111111111";

/*
 * Every state the design draws, one entry per component, in the order of the
 * "Waybil · States & Interactions" board. Hover, focus and pressed are left out: they are
 * real pseudo-states on the real component, so they are checked by pointing and tabbing,
 * not by rendering a copy that can drift from the live one.
 */

export interface GalleryEntry {
  /** The component's name on the design board. */
  name: string;
  /** What the board's Info note says about it. */
  note?: string;
  /** How wide one cell is. Most components bring their own width and need nothing. */
  cell?: "auto" | "wide" | "full";
  states: { label: string; node: React.ReactNode }[];
}

export const ATOMS: GalleryEntry[] = [
  {
    name: "Button, primary",
    note: "Hover turns the circle yellow and the arrow rotates to the right. Loading locks the width so the pill never jumps.",
    states: [
      { label: "Default", node: <Button>Create shipment</Button> },
      { label: "Disabled", node: <Button disabled>Create shipment</Button> },
      {
        label: "Loading",
        node: (
          <Button loading loadingLabel="Confirming">
            Create shipment
          </Button>
        ),
      },
    ],
  },
  {
    name: "Button, moment",
    note: "Used once per screen. On success the label crossfades to the result and the circle turns green.",
    states: [
      { label: "Default", node: <Button variant="moment">Cash out now</Button> },
      {
        label: "Disabled",
        node: (
          <Button variant="moment" disabled>
            Cash out now
          </Button>
        ),
      },
      {
        label: "Loading",
        node: (
          <Button variant="moment" loading loadingLabel="Sending">
            Cash out now
          </Button>
        ),
      },
      {
        label: "Success",
        node: (
          <Button variant="moment" success successLabel="Cashed out">
            Cash out now
          </Button>
        ),
      },
    ],
  },
  {
    name: "Button, secondary",
    note: "The circle keeps its arrow so the action reads the same everywhere.",
    states: [
      { label: "Default", node: <Button variant="secondary">View details</Button> },
      {
        label: "Disabled",
        node: (
          <Button variant="secondary" disabled>
            View details
          </Button>
        ),
      },
    ],
  },
  {
    name: "Button, quiet and icon",
    note: "Quiet and icon buttons share the same hover grey. Icon buttons always have a spoken label.",
    states: [
      { label: "Quiet", node: <Button variant="quiet">Cancel</Button> },
      {
        label: "Quiet disabled",
        node: (
          <Button variant="quiet" disabled>
            Cancel
          </Button>
        ),
      },
      {
        label: "Icon",
        node: (
          <IconButton label="Scan a code">
            <QrCode size={20} />
          </IconButton>
        ),
      },
      {
        label: "Icon disabled",
        node: (
          <IconButton label="Scan a code" disabled>
            <QrCode size={20} />
          </IconButton>
        ),
      },
    ],
  },
  {
    name: "Status chip",
    note: "Neutral chip, coloured dot, plain words. Never colour alone.",
    states: [
      { label: "Approved", node: <StatusPill status="approved" /> },
      { label: "In transit", node: <StatusPill status="inTransit" /> },
      { label: "Delivered", node: <StatusPill status="delivered" /> },
      { label: "Paid early", node: <StatusPill status="paidEarly" /> },
      { label: "Repaid", node: <StatusPill status="repaid" /> },
      { label: "Disputed", node: <StatusPill status="disputed" /> },
      { label: "Cancelled · not drawn yet", node: <StatusPill status="cancelled" /> },
      {
        label: "Paid from the reserve · not drawn yet",
        node: <StatusPill status="coveredByReserve" />,
      },
      { label: "Loading", node: <StatusPillSkeleton /> },
    ],
  },
  {
    name: "Input",
    note: "Focus lifts the field to white with an ink border. Errors appear below with the reason and how much is left. Locked fields show why they cannot change.",
    // The only component here that stretches to its container, so the cell sets a width.
    cell: "wide",
    states: [
      {
        label: "Empty",
        node: (
          <Input
            label="Shipping fee"
            placeholder="0.00"
            suffix="USDC"
            hint="Amount the shipper owes on delivery."
          />
        ),
      },
      {
        label: "Filled",
        node: (
          <Input
            label="Shipping fee"
            defaultValue="300.00"
            suffix="USDC"
            hint="Can't be changed after you approve."
          />
        ),
      },
      {
        label: "Error",
        node: (
          <Input
            label="Shipping fee"
            defaultValue="300.00"
            suffix="USDC"
            error="Over Northwind's limit. 600 USDC left."
          />
        ),
      },
      {
        label: "Disabled",
        node: (
          <Input
            label="Shipping fee"
            defaultValue="300.00"
            suffix="USDC"
            hint="Can't be changed after you approve."
            disabled
          />
        ),
      },
      {
        label: "Locked",
        node: (
          <Input
            label="Shipping fee"
            defaultValue="300.00"
            suffix="USDC"
            hint="Can't be changed after you approve."
            locked
          />
        ),
      },
    ],
  },
  {
    name: "Avatar, tag, link",
    note: "Avatars fall back to initials. Tags reflect proof status. Links darken on hover.",
    states: [
      { label: "Avatar", node: <Avatar name="Sam Carter" /> },
      { label: "Avatar active", node: <Avatar name="Sam Carter" active /> },
      { label: "Avatar loading", node: <AvatarSkeleton /> },
      { label: "Proof verified", node: <ProofTag state="verified" /> },
      { label: "Verifying", node: <ProofTag state="verifying" /> },
      { label: "Mismatch", node: <ProofTag state="mismatch" /> },
      { label: "Link", node: <ProofLink tx="11111111111111111111111111111111" /> },
    ],
  },
  {
    name: "Fan meter",
    note: "Twenty slanted bars, drawn like the logo. The leading bar is yellow; past 80% the filled bars turn amber, past 100% red.",
    states: [
      { label: "Healthy · 37%", node: <FanMeter value={0.375} label="Credit limit used" /> },
      { label: "Busy · 67%", node: <FanMeter value={0.675} label="Credit limit used" /> },
      { label: "Near limit · 85%", node: <FanMeter value={0.85} label="Credit limit used" /> },
      { label: "Full · 100%", node: <FanMeter value={1} label="Credit limit used" /> },
    ],
  },
];

export const MOLECULES: GalleryEntry[] = [
  {
    name: "Wallet",
    note: "Drivers and warehouses never see this. Their actions go through the relayer.",
    states: [
      { label: "Disconnected", node: <WalletMenu state="disconnected" /> },
      { label: "Connecting", node: <WalletMenu state="connecting" name="Sam Carter" /> },
      { label: "Connected", node: <WalletMenu state="connected" name="Sam" sub="Driver" /> },
      {
        label: "Open",
        /* The menu hangs off the right of its trigger, as it does in the navbar, so the
           cell reserves the room instead of letting it escape the page. */
        node: (
          <div className="flex h-200 w-300 justify-end">
            <WalletMenu
              state="connected"
              name="Sam"
              sub="Driver"
              open
              accountUrl={CONTRACT_RECORD_URL}
            />
          </div>
        ),
      },
      {
        label: "Wrong network",
        node: <WalletMenu state="wrongNetwork" name="Sam" sub="Wrong network" />,
      },
    ],
  },
  {
    name: "Segmented tabs",
    note: "Only the chosen pill moves. Switching tabs never animates the content.",
    states: [{ label: "Default and switched", node: <SegmentedDemo /> }],
  },
  {
    name: "Stat",
    note: "Money never counts up. A new amount crossfades.",
    states: [
      {
        label: "Default",
        node: (
          <Stat label="Cashed out today" value="2,352 USDC" context="8 shipments · 0.4s average" />
        ),
      },
      {
        label: "Updated",
        node: (
          <Stat
            label="Cashed out today"
            value="2,352 USDC"
            context="+292.50 USDC just now"
            justChanged
          />
        ),
      },
      {
        label: "Empty",
        node: (
          <Stat label="Cashed out today" value="0 USDC" context="No cash outs yet today" empty />
        ),
      },
      { label: "Loading", node: <StatSkeleton /> },
    ],
  },
  {
    name: "Credit limit meter",
    note: "The meter never animates its fill. A new value crossfades.",
    states: [
      {
        label: "Healthy · 40%",
        node: (
          <CreditMeter
            label="Northwind credit limit"
            used="1,200"
            limit="3,000"
            value={0.4}
            left="1,800"
          />
        ),
      },
      {
        label: "Near limit · 80%",
        node: (
          <CreditMeter
            label="Northwind credit limit"
            used="2,400"
            limit="3,000"
            value={0.8}
            left="600"
          />
        ),
      },
      {
        label: "Over limit · 110%",
        node: (
          <CreditMeter
            label="Northwind credit limit"
            used="3,300"
            limit="3,000"
            value={1.1}
            left="300"
          />
        ),
      },
      { label: "Loading", node: <CreditMeterSkeleton /> },
    ],
  },
  {
    name: "Recorded action",
    note: "Every recorded action ends with a link to the record.",
    states: [
      {
        label: "Pending",
        node: <ProofCard state="pending" title="Waiting for confirmation" tx={TX} />,
      },
      {
        label: "Confirmed",
        node: <ProofCard state="confirmed" title="Delivery confirmed" tx={TX} />,
      },
      {
        label: "Failed",
        node: (
          <ProofCard
            state="failed"
            title="Transaction reverted"
            meta="Already cashed out"
            tx={TX}
          />
        ),
      },
    ],
  },
  {
    name: "Timeline step",
    states: [
      {
        label: "Done",
        node: <TimelineStep state="done" title="Picked up by Sam" time="Nov 13 · 08:14" />,
      },
      {
        label: "Current",
        node: (
          <TimelineStep state="current" title="Cashing out 292.50 USDC" time="Nov 13 · 08:14" />
        ),
      },
      {
        label: "Next",
        node: <TimelineStep state="next" title="Repaid by Northwind" time="Due Dec 11" />,
      },
      {
        label: "Failed",
        node: <TimelineStep state="paused" title="Delivery disputed" time="Early payment paused" />,
      },
    ],
  },
  {
    name: "Shipment row",
    states: [
      {
        label: "Default",
        node: (
          <ShipmentRow
            route="Eastport to Harbor City"
            meta="#1042 · Sam · due Dec 11"
            amount="300.00"
            status="delivered"
          />
        ),
      },
      {
        label: "Selected",
        node: (
          <ShipmentRow
            route="Eastport to Harbor City"
            meta="#1042 · Sam · due Dec 11"
            amount="300.00"
            status="delivered"
            selected
          />
        ),
      },
      {
        label: "Disputed",
        node: (
          <ShipmentRow
            route="Eastport to Harbor City"
            meta="#1042 · Sam · due Dec 11"
            amount="300.00"
            status="disputed"
          />
        ),
      },
      { label: "Loading", node: <ShipmentRowSkeleton /> },
    ],
  },
  {
    name: "Balance card",
    states: [
      {
        label: "Ready",
        node: (
          <BalanceCard
            label="Ready to cash out"
            status="delivered"
            amount="292.50"
            meta="97.5% of 300 USDC · Eastport to Harbor City"
          />
        ),
      },
      {
        label: "Cashing out",
        node: (
          <BalanceCard
            label="Sending to your wallet"
            status="delivered"
            amount="292.50"
            meta="Almost done"
          />
        ),
      },
      {
        label: "Cashed out",
        node: (
          <BalanceCard
            label="Cashed out"
            status="paidEarly"
            amount="292.50"
            meta="Sent in under a second"
          />
        ),
      },
      {
        label: "Empty",
        node: (
          <BalanceCard
            label="Nothing to cash out yet"
            status="inTransit"
            amount="0.00"
            meta="Available once the warehouse confirms"
            empty
          />
        ),
      },
    ],
  },
  {
    name: "Transaction toast",
    states: [
      {
        label: "Sending",
        node: (
          <TxToast state="sending" title="Sending 292.50 USDC" meta="Waiting for confirmation" />
        ),
      },
      {
        label: "Confirmed",
        node: (
          <TxToast
            state="confirmed"
            title="292.50 USDC sent to Sam"
            meta="Done in under a second · View receipt"
            tx={TX}
          />
        ),
      },
      {
        label: "Failed",
        node: <TxToast state="failed" title="Cash out failed" meta="Already cashed out · Retry" />,
      },
    ],
  },
];

export const SECTIONS: { title: string; entries: GalleryEntry[] }[] = [
  { title: "Atoms", entries: ATOMS },
  { title: "Molecules", entries: MOLECULES },
  { title: "Organisms", entries: ORGANISMS },
];
