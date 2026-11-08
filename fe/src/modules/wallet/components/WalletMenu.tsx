"use client";

import { CaretDown, Copy, SignOut } from "@phosphor-icons/react";
import { Avatar } from "@/components/elements/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/*
 * Wallet from design/waybil.pen → Molecule/Wallet and the States board.
 * Disconnected it is a plain button. Connected it is a white pill with the person and,
 * when open, a short menu. On the wrong network the pill goes red and says so.
 *
 * Drivers and warehouses never see this: their actions go through the relayer
 * (fe/AGENTS.md). It is for shippers, investors and the team.
 */

export type WalletState = "disconnected" | "connecting" | "connected" | "wrongNetwork";

export interface WalletMenuProps {
  state: WalletState;
  /** The person's name, for example "Sam". */
  name?: string;
  /** The line underneath: their role, or what they need to do. */
  sub?: string;
  open?: boolean;
  onToggle?: () => void;
  onConnect?: () => void;
  onCopy?: () => void;
  onDisconnect?: () => void;
  /** Where "See the record on NearBlocks" goes. */
  accountUrl?: string;
  className?: string;
}

export function WalletMenu({
  state,
  name = "",
  sub,
  open = false,
  onToggle,
  onConnect,
  onCopy,
  onDisconnect,
  accountUrl,
  className,
}: WalletMenuProps) {
  if (state === "disconnected") {
    return (
      <Button onClick={onConnect} className={className}>
        Connect wallet
      </Button>
    );
  }

  const wrong = state === "wrongNetwork";
  const title = state === "connecting" ? "Connecting" : name;
  const line = sub ?? (state === "connecting" ? "Approve in your wallet" : undefined);

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "press focus-ring flex items-center gap-10 rounded-full border bg-ds-bg py-5 pr-14 pl-5",
          "transition-colors duration-150 ease-base",
          wrong ? "border-ds-danger" : "border-ds-line hover:bg-ds-canvas",
        )}
      >
        <Avatar name={name || "?"} className="size-32 text-caption" />
        <span className="flex flex-col items-start">
          <span className="text-label font-semibold text-ds-ink">{title}</span>
          {line && (
            <span className={cn("text-caption", wrong ? "text-ds-danger" : "text-ds-muted")}>
              {line}
            </span>
          )}
        </span>
        <CaretDown size={16} className="text-ds-muted" />
      </button>

      {open && (
        <div
          role="menu"
          className="enter absolute right-0 z-10 mt-8 flex w-260 flex-col rounded-[18px] border border-ds-line bg-ds-bg p-6 shadow-lg"
        >
          <MenuItem icon={<Copy size={16} />} onClick={onCopy}>
            Copy address
          </MenuItem>
          {accountUrl && <MenuItem href={accountUrl}>See the record on NearBlocks ↗</MenuItem>}
          <MenuItem icon={<SignOut size={16} />} onClick={onDisconnect} danger>
            Disconnect
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  href,
  danger = false,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  /* No motion when moving between menu items, only the background colour (fe/AGENTS.md). */
  const shell = cn(
    "flex items-center gap-10 rounded-[12px] px-12 py-10 text-left text-[14px]",
    "transition-colors duration-150 ease-base hover:bg-ds-canvas",
    danger ? "text-ds-danger" : "text-ds-ink",
  );

  if (href) {
    return (
      <a role="menuitem" href={href} target="_blank" rel="noopener noreferrer" className={shell}>
        {icon}
        {children}
      </a>
    );
  }
  return (
    <button role="menuitem" type="button" onClick={onClick} className={shell}>
      {icon}
      {children}
    </button>
  );
}
