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
  const name = names[role];
  const sub = {
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
      <span className="flex flex-col text-label">
        {name}
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
        className="hidden md:flex"
        wallet={
          hasWallet ? (
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
            <div className="flex items-center gap-10 rounded-full px-6 py-4 pr-12">{identity}</div>
          )
        }
      />
      <header className="flex h-56 items-center justify-between md:hidden">
        <Logo />
        <div className="flex items-center gap-8">
          {role === "warehouse" && (
            <span className="flex items-center gap-6 rounded-full bg-ds-bg px-12 py-8 text-[12.5px] font-medium">
              <Warehouse size={14} />
              Harbor Hub
            </span>
          )}
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
        <DemoWallet key={wallet} initialState={wallet} role={role} onClose={closeWallet} />
      )}
      {!detail && (
        <nav
          aria-label="Main"
          className="fixed right-16 bottom-[calc(16px+env(safe-area-inset-bottom))] left-16 z-30 flex items-center justify-between rounded-full bg-ds-ink p-6 md:hidden"
        >
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={href === current ? "page" : undefined}
              className={cn(
                "press focus-ring flex h-52 items-center justify-center gap-8 rounded-full px-20",
                href === current ? "bg-ds-brand text-ds-ink" : "text-ds-bg",
              )}
            >
              <Icon size={20} />
              {href === current && <span className="text-label">{label}</span>}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
