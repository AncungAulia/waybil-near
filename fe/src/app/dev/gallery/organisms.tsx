import { QrCode, Truck, Wallet } from "@phosphor-icons/react/dist/ssr";
import { Panel } from "@/components/layout/Panel";
import { Navbar } from "@/components/layout/Navbar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { KeyValue } from "@/components/elements/KeyValue";
import { EmptyState } from "@/components/elements/EmptyState";
import { BalanceCard } from "@/components/elements/BalanceCard";
import { ProofCard } from "@/components/elements/ProofCard";
import { TimelineStep } from "@/components/elements/TimelineStep";
import { ShipmentRow, ShipmentRowSkeleton } from "@/components/elements/ShipmentRow";
import { WalletMenu } from "@/modules/wallet/components/WalletMenu";
import type { GalleryEntry } from "./registry";
import { SegmentedDemo } from "./SegmentedDemo";

const TX = "11111111111111111111111111111111";

const NAV_LINKS = [
  { href: "/shipper/shipments", label: "Shipments" },
  { href: "/pool", label: "Pool" },
  { href: "/shipper", label: "Activity" },
];

const BOTTOM_ITEMS = [
  { href: "/driver", label: "Trips", icon: <Truck size={18} /> },
  { href: "/driver/qr", label: "Show QR", icon: <QrCode size={18} /> },
  { href: "/driver/payouts", label: "Wallet", icon: <Wallet size={18} /> },
];

/** The three rows the shipment list shows when it has something to show. */
const ROWS = [
  {
    route: "Eastport to Harbor City",
    meta: "#1041 · Sam · due Dec 11",
    amount: "300.00",
    status: "delivered",
  },
  {
    route: "Eastport to Riverton",
    meta: "#1043 · Jordan · due Dec 13",
    amount: "150.00",
    status: "inTransit",
  },
  {
    route: "Eastport to Westfield",
    meta: "#1044 · Sam · pickup today",
    amount: "210.00",
    status: "approved",
  },
] as const;

function CreateShipment({
  error = false,
  ...state
}: {
  error?: boolean;
  loading?: boolean;
  success?: boolean;
}) {
  return (
    <Panel title="New shipment" className="max-w-520">
      <Input label="Driver" defaultValue="Sam Carter · NWF-204" />
      <Input label="Receiving warehouse" defaultValue="Harbor Hub · 9 Pier Street" />
      <Input
        label="Shipping fee"
        defaultValue="300.00"
        suffix="USDC"
        {...(error
          ? { error: "Over Northwind's limit. 600 USDC left." }
          : { hint: "Can't be changed after you approve." })}
      />
      <Input label="Payment term" defaultValue="30 days" locked />
      <div className="flex items-center justify-between gap-16 border-t border-ds-line pt-16">
        <span className="flex flex-col gap-2">
          <span className="text-label text-ds-muted">Sam gets on arrival</span>
          <span className="text-[17px] font-semibold text-ds-ink">292.50 USDC</span>
        </span>
        <Button
          disabled={error}
          loading={state.loading}
          loadingLabel="Approving"
          success={state.success}
          successLabel="Approved"
        >
          Approve shipment
        </Button>
      </div>
    </Panel>
  );
}

export const ORGANISMS: GalleryEntry[] = [
  {
    name: "Navbar",
    note: "Switching tabs never animates. Only the highlight changes colour.",
    cell: "full",
    states: [
      {
        label: "Default",
        node: (
          <Navbar
            links={NAV_LINKS}
            current="/shipper/shipments"
            wallet={<WalletMenu state="connected" name="Northwind" sub="Shipper" />}
          />
        ),
      },
      {
        label: "Wallet disconnected",
        node: (
          <Navbar
            links={NAV_LINKS}
            current="/shipper/shipments"
            wallet={<WalletMenu state="disconnected" />}
          />
        ),
      },
    ],
  },
  {
    name: "Mobile header and bottom nav",
    note: "Drawn at 390. The open item in the bottom nav grows to show its label.",
    states: [
      {
        label: "Header",
        node: (
          <div className="w-390 rounded-[22px] bg-ds-canvas p-8">
            <MobileHeader role="Driver" name="Sam Carter" />
          </div>
        ),
      },
      { label: "Trips active", node: <BottomNav items={BOTTOM_ITEMS} current="/driver" /> },
      { label: "Scan active", node: <BottomNav items={BOTTOM_ITEMS} current="/driver/qr" /> },
    ],
  },
  {
    name: "Create shipment",
    states: [
      { label: "Filling", node: <CreateShipment /> },
      { label: "Error", node: <CreateShipment error /> },
      { label: "Submitting", node: <CreateShipment loading /> },
      { label: "Success", node: <CreateShipment success /> },
    ],
  },
  {
    name: "Shipment list",
    states: [
      {
        label: "Populated",
        node: (
          <Panel
            title="Today's shipments"
            action={<SegmentedDemo />}
            gap={12}
            className="max-w-720"
          >
            {ROWS.map((r) => (
              <ShipmentRow key={r.meta} {...r} className="w-full" />
            ))}
          </Panel>
        ),
      },
      {
        label: "Row selected",
        node: (
          <Panel title="Today's shipments" gap={12} className="max-w-720">
            {ROWS.map((r, i) => (
              <ShipmentRow key={r.meta} {...r} selected={i === 0} className="w-full" />
            ))}
          </Panel>
        ),
      },
      {
        label: "Loading",
        node: (
          <Panel title="Today's shipments" gap={12} className="max-w-720">
            {[0, 1, 2].map((i) => (
              <ShipmentRowSkeleton key={i} className="w-full" />
            ))}
          </Panel>
        ),
      },
      {
        label: "Empty",
        node: (
          <Panel title="Today's shipments" gap={12} className="max-w-720">
            <EmptyState
              title="No shipments yet"
              body="Approve a trip and it shows up here with its proof."
              action={<Button>Create shipment</Button>}
            />
          </Panel>
        ),
      },
    ],
  },
  {
    name: "Shipment timeline",
    states: [
      {
        label: "In progress",
        node: (
          <Panel title="Shipment #1041" gap={18} className="max-w-520">
            <TimelineStep state="done" title="Approved by Northwind" time="Nov 13 · 08:02" />
            <TimelineStep state="done" title="Picked up by Sam" time="Nov 13 · 09:14" />
            <TimelineStep state="current" title="On the road to Harbor Hub" time="Now" />
            <TimelineStep state="next" title="Confirmed by Harbor Hub" time="Expected today" />
            <TimelineStep state="next" title="Repaid by Northwind" time="Due Dec 11" />
          </Panel>
        ),
      },
      {
        label: "Complete",
        node: (
          <Panel title="Shipment #1032" gap={18} className="max-w-520">
            <TimelineStep state="done" title="Approved by Northwind" time="Nov 2 · 08:02" />
            <TimelineStep state="done" title="Picked up by Sam" time="Nov 2 · 09:14" />
            <TimelineStep state="done" title="Confirmed by Harbor Hub" time="Nov 3 · 15:36" />
            <TimelineStep state="done" title="Sam paid 292.50 USDC" time="Nov 3 · 15:36" />
            <TimelineStep state="done" title="Repaid by Northwind" time="Nov 9 · 11:20" />
          </Panel>
        ),
      },
      {
        label: "Disputed",
        node: (
          <Panel title="Shipment #1041" gap={18} className="max-w-520">
            <TimelineStep state="done" title="Approved by Northwind" time="Nov 13 · 08:02" />
            <TimelineStep state="done" title="Picked up by Sam" time="Nov 13 · 09:14" />
            <TimelineStep state="failed" title="Delivery disputed" time="8 crates wet, 112 good" />
            <TimelineStep state="next" title="Northwind chooses what to pay" time="Waiting" />
          </Panel>
        ),
      },
    ],
  },
  {
    name: "Cash out panel",
    states: [
      {
        label: "Ready",
        node: (
          <Panel className="max-w-470">
            <BalanceCard
              label="Ready to cash out"
              status="delivered"
              amount="292.50"
              meta="97.5% of 300 USDC · Eastport to Harbor City"
              className="w-full"
            />
            <div>
              <KeyValue label="Shipping fee" value="300.00 USDC" />
              <KeyValue label="You get now" value="292.50 USDC" />
              <KeyValue label="Network fee" value="You pay nothing" />
            </div>
            <Button variant="moment" className="w-full justify-between">
              Cash out now
            </Button>
            <ProofCard state="confirmed" title="Delivery confirmed" tx={TX} className="w-full" />
          </Panel>
        ),
      },
      {
        label: "Sending",
        node: (
          <Panel className="max-w-470">
            <BalanceCard
              label="Sending to your wallet"
              status="delivered"
              amount="292.50"
              meta="Almost done"
              className="w-full"
            />
            <Button
              variant="moment"
              loading
              loadingLabel="Sending"
              className="w-full justify-between"
            >
              Cash out now
            </Button>
            <ProofCard
              state="pending"
              title="Waiting for confirmation"
              tx={TX}
              className="w-full"
            />
          </Panel>
        ),
      },
      {
        label: "Cashed out",
        node: (
          <Panel className="max-w-470">
            <BalanceCard
              label="Cashed out"
              status="paidEarly"
              amount="292.50"
              meta="Sent in under a second"
              className="w-full"
            />
            <Button
              variant="moment"
              success
              successLabel="Cashed out"
              className="w-full justify-between"
            >
              Cash out now
            </Button>
            <ProofCard
              state="confirmed"
              title="Sam was paid 292.50 USDC"
              tx={TX}
              className="w-full"
            />
          </Panel>
        ),
      },
      {
        label: "Rejected",
        node: (
          <Panel className="max-w-470">
            <BalanceCard
              label="Nothing to cash out yet"
              status="disputed"
              amount="0.00"
              meta="Northwind is choosing what to pay"
              empty
              className="w-full"
            />
            <Button variant="moment" disabled className="w-full justify-between">
              Cash out now
            </Button>
            <ProofCard
              state="failed"
              title="Transaction reverted"
              meta="Already cashed out"
              tx={TX}
              className="w-full"
            />
          </Panel>
        ),
      },
    ],
  },
  {
    name: "Footer",
    note: "Footer links drop the arrow and keep short labels.",
    cell: "full",
    states: [{ label: "Default", node: <Footer /> }],
  },
];
