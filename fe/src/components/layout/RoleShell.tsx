"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { DemoWallet, type DemoWalletState } from "@/components/elements/DemoWallet";
import {
  Truck,
  Scan,
  ClockCounterClockwise,
  Buildings,
  ArrowDown,
  CaretDown,
  House,
  Package,
  Users,
  CheckCircle,
  ChartPie,
  Warehouse,
} from "@phosphor-icons/react";
import { Navbar } from "./Navbar";
import { Logo } from "./Logo";
import { cn } from "@/lib/cn";
import { useAuth } from "@/providers/AuthProvider";
import { useNames } from "@/hooks/useNames";
import { usePlaces } from "@/hooks/useTrips";

const LABELS = {
  driver: "Driver",
  warehouse: "Warehouse",
  shipper: "Shipper",
  investor: "Investor",
  admin: "Waybil team",
};

export function RoleShell({
  role,
  current,
  children,
  detail = false,
  walletPreview,
}: {
  role: "driver" | "warehouse" | "shipper" | "investor" | "admin";
  current: string;
  children: React.ReactNode;
  detail?: boolean;
  walletPreview?: DemoWalletState;
}) {
  const [wallet, setWallet] = useState<DemoWalletState | null>(walletPreview ?? null);
  /* The account button that opened the sheet gets focus back when it closes. */
  const walletTrigger = useRef<HTMLElement | null>(null);
  const openWallet = (event: React.MouseEvent<HTMLElement>) => {
    walletTrigger.current = event.currentTarget;
    setWallet("G1");
  };
  const closeWallet = () => {
    setWallet(null);
    window.setTimeout(() => walletTrigger.current?.focus(), 0);
  };
  const hasWallet = role === "shipper" || role === "investor" || role === "admin";
  const names = {
    driver: "Sam",
    warehouse: "Lena",
    shipper: "Northwind",
    investor: "Maya",
    admin: "Risk lead",
  };
  /* The signed-in person, when this shell is their own role. Otherwise the demo names. */
  const { profile } = useAuth();
  const live = profile?.role === role ? profile : null;
  /* A signed-in warehouse sees the name of its own place, or how many it has. */
  const { data: placeData } = usePlaces(role === "warehouse" && !!live);
  const myPlaces = (placeData?.places ?? []).filter((p) => p.kind === "destination");
  const placeChip =
    role !== "warehouse"
      ? null
      : !live
        ? "Harbor Hub"
        : myPlaces.length === 1
          ? myPlaces[0]!.name
          : myPlaces.length > 1
            ? `${myPlaces.length} places`
            : null;
  /*
   * The person's own name first. A shipper who has not saved a contact person yet shows the
   * company name from its application, and the account id only when there is neither.
   */
  const publicName = useNames([live && !live.name ? live.accountId : null]);
  const name = live ? live.name || publicName(live.accountId) : names[role];
  const sub = live
    ? LABELS[role]
    : {
        driver: "Driver",
        warehouse: "Harbor Hub",
        shipper: "Shipper",
        investor: "Investor",
        admin: "Waybil team",
      }[role];
  const avatar = (
    <img src={`/illustrations/${role}-avatar.svg`} alt={name} className="size-36 rounded-full" />
  );
  /* Drivers and warehouses have no account menu, so their chip stays a plain label. */
  const identity = (
    <>
      {avatar}
      <span className="flex max-w-200 min-w-0 flex-col items-start text-left text-label">
        <span className="max-w-full truncate">{name}</span>
        <span className="text-caption text-ds-muted">{sub}</span>
      </span>
    </>
  );
  const links = {
    driver: [
      { href: "/driver", label: "Trips", icon: Truck },
      { href: "/driver/payouts", label: "Payouts", icon: ArrowDown },
      { href: "/driver/companies", label: "Companies", icon: Buildings },
    ],
    warehouse: [
      { href: "/warehouse", label: "Arrivals", icon: Truck },
      { href: "/warehouse/scan", label: "Scan", icon: Scan },
      { href: "/warehouse/history", label: "History", icon: ClockCounterClockwise },
    ],
    shipper: [
      { href: "/shipper", label: "Home", icon: House },
      { href: "/shipper/shipments", label: "Shipments", icon: Package },
      { href: "/shipper/network", label: "Network", icon: Users },
    ],
    investor: [
      { href: "/pool", label: "Pool", icon: ChartPie },
      { href: "/pool/deliveries", label: "Deliveries", icon: Truck },
      { href: "/pool/history", label: "History", icon: ClockCounterClockwise },
    ],
    admin: [
      { href: "/admin", label: "Approvals", icon: CheckCircle },
      { href: "/admin/shippers", label: "Shippers", icon: Buildings },
      { href: "/admin/pool", label: "Pool", icon: ChartPie },
    ],
  }[role];
  return (
    <div className="min-h-dvh bg-ds-canvas px-16 pt-12 pb-100 md:px-32 md:pt-20 md:pb-32 lg:px-40 lg:pb-40">
      <Navbar
        links={links}
        current={current}
        sticky
        className="hidden md:block"
        wallet={
          <>
            {placeChip && <PlaceChip name={placeChip} />}
            {hasWallet ? (
              <button
                type="button"
                aria-label="Open account menu"
                aria-haspopup="dialog"
                aria-expanded={wallet !== null}
                onClick={openWallet}
                className="press focus-ring flex items-center gap-10 rounded-full border border-ds-line px-6 py-4 pr-12"
              >
                {identity}
                <CaretDown size={14} />
              </button>
            ) : (
              <div className="flex items-center gap-10 rounded-full px-6 py-4 pr-12">
                {identity}
              </div>
            )}
          </>
        }
      />
      {/* The phone header stays on top over a blurred canvas. It is already short, so it never shrinks. */}
      <header className="sticky top-0 z-30 -mx-16 flex h-56 items-center justify-between bg-ds-canvas/80 px-16 backdrop-blur-xl backdrop-saturate-150 md:hidden">
        <Logo />
        <div className="flex items-center gap-8">
          {placeChip && <PlaceChip name={placeChip} />}
          {hasWallet ? (
            <button
              aria-label="Open account menu"
              aria-haspopup="dialog"
              aria-expanded={wallet !== null}
              className="press focus-ring rounded-full"
              onClick={openWallet}
            >
              {avatar}
            </button>
          ) : (
            avatar
          )}
        </div>
      </header>
      <main className="mt-16 md:mt-24">{children}</main>
      {wallet && hasWallet && (
        <DemoWallet
          key={wallet}
          initialState={wallet}
          role={role}
          live={live ? { accountId: live.accountId, name: live.name } : undefined}
          onClose={closeWallet}
        />
      )}
      {!detail && (
        /*
         * A light floating dock, like a phone's own. Every tab keeps its icon and label. The open
         * one is ink with a bold icon and a small yellow dot under it, the others are grey.
         */
        <nav
          aria-label="Main"
          className="fixed inset-x-16 bottom-[calc(14px+env(safe-area-inset-bottom))] z-30 mx-auto grid max-w-380 rounded-[26px] border border-ds-line bg-ds-bg/85 px-6 py-6 shadow-float backdrop-blur-xl backdrop-saturate-150 md:hidden"
          style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
        >
          {links.map(({ href, label, icon: Icon }) => {
            const on = href === current;
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "press focus-ring flex flex-col items-center gap-2 rounded-[20px] pt-8 pb-6 transition-colors duration-150",
                  on ? "text-ds-ink" : "text-ds-muted",
                )}
              >
                <Icon size={22} weight={on ? "fill" : "regular"} />
                <span
                  className={cn("text-[11px] leading-14", on ? "font-semibold" : "font-medium")}
                >
                  {label}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "size-4 rounded-full transition-opacity duration-150",
                    on ? "bg-ds-brand opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

/* The warehouse's own place, as a small chip next to the person. */
function PlaceChip({ name }: { name: string }) {
  return (
    <span className="flex max-w-180 items-center gap-6 rounded-full bg-ds-bg px-12 py-8 text-[12.5px] font-medium md:bg-ds-canvas">
      <Warehouse size={14} className="shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  );
}
