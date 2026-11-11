"use client";

import { useEffect, useId, useRef, useState } from "react";
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
 *
 * Keyboard follows the menu button pattern. Enter, Space or Arrow Down opens it on the first
 * item and Arrow Up opens it on the last. The arrows, Home and End move between items.
 * Escape closes it and returns to the button, Tab closes it and moves on, and a click
 * outside closes it too. Pass `open` and `onToggle` to control it from outside.
 */

export type WalletState = "disconnected" | "connecting" | "connected" | "wrongNetwork";

export interface WalletMenuProps {
  state: WalletState;
  /** The person's name, for example "Sam". */
  name?: string;
  /** The line underneath: their role, or what they need to do. */
  sub?: string;
  /** Controls the menu from outside. Leave it out and the menu keeps its own state. */
  open?: boolean;
  onToggle?: () => void;
  onConnect?: () => void;
  onCopy?: () => void;
  onDisconnect?: () => void;
  /** Where "See the record on NearBlocks" goes. */
  accountUrl?: string;
  className?: string;
}

export function WalletMenu({ state, onConnect, className, ...rest }: WalletMenuProps) {
  if (state === "disconnected") {
    return (
      <Button onClick={onConnect} className={className}>
        Connect wallet
      </Button>
    );
  }
  return <ConnectedMenu state={state} className={className} {...rest} />;
}

function ConnectedMenu({
  state,
  name = "",
  sub,
  open: openProp,
  onToggle,
  onCopy,
  onDisconnect,
  accountUrl,
  className,
}: Omit<WalletMenuProps, "onConnect">) {
  const [openSelf, setOpenSelf] = useState(false);
  const open = openProp ?? openSelf;
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  /* Which item takes focus once the menu is drawn: the first, the last, or none for a click. */
  const focusOnOpen = useRef<"first" | "last" | null>(null);

  const items = () =>
    Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  const setOpen = (next: boolean) => {
    if (next === open) return;
    if (openProp === undefined) setOpenSelf(next);
    onToggle?.();
  };
  /* Roving focus: only the focused item is in the tab order, and the list wraps around. */
  const focusItem = (index: number) => {
    const list = items();
    if (!list.length) return;
    const target = list[(index + list.length) % list.length]!;
    list.forEach((item) => (item.tabIndex = item === target ? 0 : -1));
    target.focus();
  };
  const openWith = (where: "first" | "last" | null) => {
    focusOnOpen.current = where;
    setOpen(true);
  };
  /* Picking an item closes the menu and hands focus back to the button. */
  const choose = (action?: () => void) => {
    setOpen(false);
    trigger.current?.focus();
    action?.();
  };

  useEffect(() => {
    if (!open) return;
    const where = focusOnOpen.current;
    focusOnOpen.current = null;
    if (where) focusItem(where === "first" ? 0 : -1);
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  });

  const wrong = state === "wrongNetwork";
  const title = state === "connecting" ? "Connecting" : name;
  const line = sub ?? (state === "connecting" ? "Approve in your wallet" : undefined);

  return (
    <div ref={root} className={cn("relative inline-block", className)}>
      <button
        ref={trigger}
        type="button"
        /* Enter and Space arrive as a click with no pointer (detail 0) and open on the first item. */
        onClick={(event) => (open ? setOpen(false) : openWith(event.detail === 0 ? "first" : null))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (open) focusItem(0);
            else openWith("first");
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (open) focusItem(-1);
            else openWith("last");
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
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
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={`${title || "Wallet"} account`}
          onKeyDown={(event) => {
            const list = items();
            const at = list.indexOf(document.activeElement as HTMLElement);
            if (event.key === "ArrowDown") focusItem(at + 1);
            else if (event.key === "ArrowUp") focusItem(at < 0 ? -1 : at - 1);
            else if (event.key === "Home") focusItem(0);
            else if (event.key === "End") focusItem(-1);
            else if (event.key === "Escape") {
              setOpen(false);
              trigger.current?.focus();
            } else if (event.key === "Tab") {
              /* Focus steps back to the button first, so Tab lands on whatever follows it. */
              trigger.current?.focus();
              setOpen(false);
              return;
            } else return;
            event.preventDefault();
          }}
          className="enter absolute right-0 z-10 mt-8 flex w-260 flex-col rounded-[18px] border border-ds-line bg-ds-bg p-6 shadow-lg"
        >
          <MenuItem icon={<Copy size={16} />} onClick={() => choose(onCopy)}>
            Copy address
          </MenuItem>
          {accountUrl && (
            <MenuItem href={accountUrl} onClick={() => choose()}>
              See the record on NearBlocks ↗
            </MenuItem>
          )}
          <MenuItem icon={<SignOut size={16} />} onClick={() => choose(onDisconnect)} danger>
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
    "transition-colors duration-150 ease-base hover:bg-ds-canvas focus-visible:bg-ds-canvas",
    danger ? "text-ds-danger" : "text-ds-ink",
  );

  if (href) {
    return (
      <a
        role="menuitem"
        tabIndex={-1}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={shell}
      >
        {icon}
        {children}
      </a>
    );
  }
  return (
    <button role="menuitem" tabIndex={-1} type="button" onClick={onClick} className={shell}>
      {icon}
      {children}
    </button>
  );
}
