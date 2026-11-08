"use client";

import Link from "next/link";
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
} from "@phosphor-icons/react";
import { Navbar } from "./Navbar";
import { Logo } from "./Logo";
import { cn } from "@/lib/cn";

export function RoleShell({
  role,
  current,
  children,
  detail = false,
}: {
  role: "driver" | "warehouse" | "shipper" | "investor" | "admin";
  current: string;
  children: React.ReactNode;
  detail?: boolean;
}) {
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
    admin: "Admin",
  }[role];
  const avatar = (
    <img src={`/illustrations/${role}-avatar.svg`} alt={name} className="size-36 rounded-full" />
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
          <span className="flex items-center gap-10 rounded-full border border-ds-line px-6 py-4 pr-12">
            {avatar}
            <span className="flex flex-col text-label">
              {name}
              <span className="text-caption text-ds-muted">{sub}</span>
            </span>
            <CaretDown size={14} />
          </span>
        }
      />
      <header className="flex h-56 items-center justify-between md:hidden">
        <Logo />
        <div className="flex items-center gap-8">
          {role === "warehouse" && (
            <span className="rounded-full bg-ds-bg px-12 py-8 text-caption">Harbor Hub</span>
          )}
          {avatar}
        </div>
      </header>
      <main className="mt-16 md:mt-24">{children}</main>
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
