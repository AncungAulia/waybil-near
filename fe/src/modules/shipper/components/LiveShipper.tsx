"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  advanceFor,
  formatUsdc,
  parseUsdc,
  type CreditReviewInfo,
  type CreditReviewResponse,
  type InviteCreatedResponse,
} from "@waybil/shared";
import { ArrowLeft, Copy, Plus, UserPlus, Warning } from "@phosphor-icons/react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Money } from "@/components/elements/Money";
import { CreditMeter } from "@/components/elements/CreditMeter";
import { ProofLink } from "@/components/elements/ProofLink";
import { Stat } from "@/components/elements/Stat";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { WAYBIL_CONTRACT } from "@/lib/env";
import { listShipmentsByShipper } from "@/lib/near";
import { callContract } from "@/lib/wallet";
import { ShipmentList } from "./ShipmentList";
import { LiveShipment } from "./LiveShipment";
import { useLiveShipper } from "../hooks/useLiveShipper";
import {
  billsToPay,
  creditUsed,
  dueAt,
  names,
  toRow,
  waitingToAdd,
  type LiveShipperData,
} from "../data/live";

/*
 * The shipper screens on testnet data (#84). Every action is a transaction signed by the
 * shipper's wallet, except invites and the credit review, which go to the backend.
 */

export type ShipperView = "home" | "shipments" | "detail" | "new" | "network" | "credit";

const GAS = "50000000000000";
export function failure(error: unknown) {
  if (error instanceof ApiError) return error.message;
  const text = String(error);
  if (/reject|cancel|denied|closed/i.test(text))
    return "You said no in your wallet. Nothing was sent.";
  return "It didn’t go through. Nothing changed. Try again in a moment.";
}
export type Done = { text: string; tx?: string } | null;
export function DoneNote({ done }: { done: Done }) {
  if (!done) return null;
  return (
    <Panel className="gap-8">
      <p className="text-label">{done.text}</p>
      {done.tx && <ProofLink tx={done.tx} />}
    </Panel>
  );
}
export function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-row bg-ds-danger-result p-14 text-label">
      {children}
    </p>
  );
}

export function LiveShipper({
  view,
  account,
  name,
  shipmentId,
}: {
  view: ShipperView;
  account: string;
  name: string;
  shipmentId?: number;
}) {
  const { data, failed, refresh } = useLiveShipper(account);
  const current =
    view === "network"
      ? "/shipper/network"
      : view === "home" || view === "credit"
        ? "/shipper"
        : "/shipper/shipments";
  const detail = view === "detail" || view === "new";
  return (
    <RoleShell role="shipper" current={current} detail={detail}>
      <div className="flex flex-col gap-24">
        {detail && (
          <Link
            href="/shipper/shipments"
            className="focus-ring flex w-fit items-center gap-8 text-label text-ds-muted"
          >
            <ArrowLeft size={18} />
            Shipments
          </Link>
        )}
        {failed ? (
          <Panel className="grid min-h-240 place-content-center gap-12 text-center">
            <p className="text-label text-ds-muted">
              We could not load your shipments. Try again in a moment.
            </p>
            <Button variant="secondary" className="mx-auto" onClick={refresh}>
              Try again
            </Button>
          </Panel>
        ) : !data ? (
          <Panel className="grid min-h-240 place-content-center">
            <p className="text-label text-ds-muted">Loading your shipments.</p>
          </Panel>
        ) : !data.shipper ? (
          <NotApproved />
        ) : view === "home" ? (
          <Home data={data} name={name} />
        ) : view === "shipments" ? (
          <Shipments data={data} />
        ) : view === "detail" ? (
          <LiveShipment data={data} id={shipmentId ?? 0} refresh={refresh} />
        ) : view === "new" ? (
          <NewLiveShipment data={data} refresh={refresh} />
        ) : view === "network" ? (
          <Network data={data} refresh={refresh} />
        ) : (
          <Credit data={data} refresh={refresh} />
        )}
      </div>
    </RoleShell>
  );
}

function NotApproved() {
  return (
    <Panel className="grid min-h-320 place-content-center gap-12 text-center">
      <h1 className="text-heading">Your company is not approved yet</h1>
      <p className="mx-auto max-w-380 text-label text-ds-muted">
        Send your company details and papers. The team checks them and sets your first limit.
      </p>
      <ButtonLink href="/onboarding/shipper" className="mx-auto">
        See your application
      </ButtonLink>
    </Panel>
  );
}

function Meter({ data }: { data: LiveShipperData }) {
  const shipper = data.shipper!;
  const used = creditUsed(shipper);
  const limit = BigInt(shipper.limit);
  return (
    <CreditMeter
      label="Credit used"
      used={formatUsdc(used)}
      limit={formatUsdc(limit)}
      value={limit > 0n ? Number((used * 1000n) / limit) / 1000 : 0}
      left={formatUsdc(limit > used ? limit - used : used - limit)}
      className="w-full"
    />
  );
}

/* P1. */
function Home({ data, name }: { data: LiveShipperData; name: string }) {
  const router = useRouter();
  const shipper = data.shipper!;
  const bills = billsToPay(data.shipments);
  const rows = data.shipments.slice(0, 5).map((s) => toRow(s, data));
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-12">
        <div>
          <h1 className="text-title break-all">Hi, {name}</h1>
          <p className="mt-6 text-label text-ds-muted">
            Approve trips before the truck leaves. Your drivers get paid on arrival.
          </p>
        </div>
        <div className="flex gap-10">
          <ButtonLink variant="secondary" href="/shipper/network" icon={<UserPlus size={17} />}>
            Invite driver
          </ButtonLink>
          <ButtonLink href="/shipper/shipments/new" icon={<Plus size={17} />}>
            New shipment
          </ButtonLink>
        </div>
      </header>
      {(shipper.paused || shipper.late_bills > 0) && (
        <div className="flex items-start gap-12 rounded-[20px] bg-ds-danger-stamp p-16 text-ds-report-ink">
          <Warning size={20} className="shrink-0" />
          <p className="text-label">
            {shipper.paused
              ? "The team paused new shipments. Open trips keep going and drivers still get paid."
              : `You have ${shipper.late_bills} late ${shipper.late_bills === 1 ? "bill" : "bills"}. Pay it to approve new trips again.`}
          </p>
        </div>
      )}
      <div className="grid gap-16 md:grid-cols-3">
        <Stat
          className="w-full"
          label="Bills to pay"
          value={<Money amount={String(bills.total)} />}
          context={`${bills.count} ${bills.count === 1 ? "bill" : "bills"}`}
        />
        <Stat
          className="w-full"
          label="Due this week"
          value={<Money amount={String(bills.weekTotal)} />}
          context={`${bills.weekCount} ${bills.weekCount === 1 ? "bill" : "bills"}`}
        />
        <Stat
          className="w-full"
          label="Late bills"
          value={String(shipper.late_bills)}
          context={shipper.late_bills ? "Pay them to approve new trips" : "Every bill is on time"}
        />
      </div>
      <Panel
        title="Credit limit"
        action={
          <Link className="link focus-ring text-label" href="/shipper/credit">
            See credit
          </Link>
        }
      >
        <Meter data={data} />
      </Panel>
      <Panel
        title="Latest shipments"
        action={
          <Link className="link focus-ring text-label" href="/shipper/shipments">
            See all
          </Link>
        }
      >
        {rows.length === 0 ? (
          <p className="py-12 text-label text-ds-muted">
            No shipments yet. Invite a driver and add a destination, then create your first one.
          </p>
        ) : (
          <ShipmentList
            rows={rows}
            meta="due"
            onOpen={(id) => router.push(`/shipper/shipments/${id}`)}
          />
        )}
      </Panel>
    </>
  );
}

/* P6. */
const FILTERS = ["All", "Bills to pay", "On the road", "Done"] as const;
function Shipments({ data }: { data: LiveShipperData }) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const match = (status: string) =>
    filter === "All" ||
    (filter === "Bills to pay" && status === "Paid") ||
    (filter === "On the road" && ["Approved", "PickedUp", "Reported"].includes(status)) ||
    (filter === "Done" && ["Repaid", "Cancelled", "CoveredByReserve"].includes(status));
  const rows = data.shipments.filter((s) => match(s.status)).map((s) => toRow(s, data));
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-12">
        <div>
          <h1 className="text-title">Shipments</h1>
          <p className="mt-6 text-label text-ds-muted">Every trip you approved and its bill.</p>
        </div>
        <ButtonLink href="/shipper/shipments/new" icon={<Plus size={17} />}>
          New shipment
        </ButtonLink>
      </header>
      <div className="flex w-fit flex-wrap gap-6 rounded-full bg-ds-bg p-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "press focus-ring rounded-full px-14 py-8 text-label",
              filter === f ? "bg-ds-ink text-ds-bg" : "text-ds-ink-2 hover:bg-ds-canvas",
            )}
          >
            {f}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <Panel className="grid min-h-240 place-content-center text-center">
          <p className="text-label text-ds-muted">No shipments match this filter.</p>
        </Panel>
      ) : (
        <ShipmentList rows={rows} onOpen={(id) => router.push(`/shipper/shipments/${id}`)} />
      )}
    </>
  );
}

/* P2. */
function NewLiveShipment({ data, refresh }: { data: LiveShipperData; refresh: () => void }) {
  const router = useRouter();
  const { people, places } = names(data.invites);
  const shipper = data.shipper!;
  const [driver, setDriver] = useState(data.network.drivers[0] ?? "");
  const [destination, setDestination] = useState(
    data.network.destinations[0] ? String(data.network.destinations[0].id) : "",
  );
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("crates");
  const [fee, setFee] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = (offset: number) =>
    new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  let bill = 0n;
  try {
    bill = /^\d+(\.\d{1,2})?$/.test(fee.trim()) ? parseUsdc(fee.trim()) : 0n;
  } catch {
    bill = 0n;
  }
  const free = BigInt(shipper.limit) - creditUsed(shipper);
  const over = bill > free;
  const qtyOk = /^\d+$/.test(qty) && Number(qty) > 0 && Number(qty) <= 0xffffffff;
  const unitOk = /^[a-z]{1,20}$/i.test(unit.trim());
  const dueOk = !!due && due > day(0) && due <= day(60);
  const ready =
    !!driver && !!destination && qtyOk && unitOk && bill > 0n && !over && dueOk && !shipper.paused;
  const empty = data.network.drivers.length === 0 || data.network.destinations.length === 0;

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const tx = await callContract(
        WAYBIL_CONTRACT,
        "create_shipment",
        {
          driver,
          destination: Number(destination),
          qty: Number(qty),
          unit: unit.trim(),
          bill: String(bill),
          due_at: dueAt(due),
        },
        { gas: GAS },
      );
      /* The wallet gives only the hash, so the new id is the newest shipment now. */
      const [newest] = (
        await listShipmentsByShipper(data.account, {
          from: Math.max(0, data.shipments.length - 5),
          limit: 50,
        })
      ).sort((a, b) => b.id - a.id);
      refresh();
      router.push(newest ? `/shipper/shipments/${newest.id}?tx=${tx}` : "/shipper/shipments");
    } catch (e) {
      setError(failure(e));
      setBusy(false);
    }
  }

  return (
    <>
      <header>
        <h1 className="text-title">New shipment</h1>
        <p className="mt-6 text-label text-ds-muted">
          You approve it now and pay the bill by the due date. The driver gets paid on arrival.
        </p>
      </header>
      {empty ? (
        <Panel className="grid min-h-240 place-content-center gap-12 text-center">
          <p className="max-w-380 text-label text-ds-muted">
            You need a driver and a destination in your network first.
          </p>
          <ButtonLink href="/shipper/network" className="mx-auto" icon={<UserPlus size={17} />}>
            Open your network
          </ButtonLink>
        </Panel>
      ) : (
        <div className="grid items-start gap-24 lg:grid-cols-[minmax(0,1fr)_400px]">
          <Panel title="Trip">
            <label className="flex flex-col gap-8 text-label">
              Driver
              <select
                className="focus-ring h-48 rounded-[14px] bg-ds-canvas px-12"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
              >
                {data.network.drivers.map((d) => (
                  <option key={d} value={d}>
                    {people[d] ?? d}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-8 text-label">
              Destination
              <select
                className="focus-ring h-48 rounded-[14px] bg-ds-canvas px-12"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                {data.network.destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {places[d.warehouse]?.name ?? d.warehouse}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-12">
              <Input
                label="Quantity"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                error={qty && !qtyOk ? "Enter a whole number above zero." : undefined}
              />
              <Input
                label="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                error={!unitOk ? "Use one word, like crates." : undefined}
              />
            </div>
            <Input
              label="Bill"
              suffix="USDC"
              inputMode="decimal"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              error={
                over
                  ? `That is over your limit. You have ${formatUsdc(free > 0n ? free : 0n)} USDC left.`
                  : undefined
              }
            />
            <Input
              label="Due date"
              type="date"
              min={day(1)}
              max={day(60)}
              value={due}
              onChange={(e) => setDue(e.target.value)}
              hint="Up to 60 days from today."
            />
          </Panel>
          <Panel title="Summary">
            <div className="flex justify-between gap-12 text-label">
              <span className="text-ds-muted">The driver gets on arrival</span>
              <Money amount={String(advanceFor(bill))} />
            </div>
            <div className="flex justify-between gap-12 text-label">
              <span className="text-ds-muted">You pay by the due date</span>
              <Money amount={String(bill)} />
            </div>
            <Meter data={data} />
            {shipper.paused && <Alert>The team paused new shipments for your company.</Alert>}
            {error && <Alert>{error}</Alert>}
            <Button
              className="h-52 w-full justify-between"
              disabled={!ready}
              loading={busy}
              loadingLabel="Waiting for wallet"
              onClick={() => void approve()}
            >
              Approve shipment
            </Button>
          </Panel>
        </div>
      )}
    </>
  );
}

/* P5. */
function Network({ data, refresh }: { data: LiveShipperData; refresh: () => void }) {
  const { people, places } = names(data.invites);
  const [inviting, setInviting] = useState<"driver" | "warehouse" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Done>(null);
  const waiting = waitingToAdd(data);
  const open = data.invites.filter((i) => !i.acceptedBy);

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
        <div className="flex gap-10">
          <Button variant="secondary" onClick={() => setInviting("warehouse")}>
            Add a destination
          </Button>
          <Button icon={<UserPlus size={17} />} onClick={() => setInviting("driver")}>
            Invite a driver
          </Button>
        </div>
      </header>
      <DoneNote done={done} />
      {waiting.length > 0 && (
        <Panel title="Ready to add">
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
      <div className="grid items-start gap-16 lg:grid-cols-2">
        <Panel title="Drivers">
          {data.network.drivers.length === 0 && (
            <p className="text-label text-ds-muted">No drivers yet. Invite your first one.</p>
          )}
          {data.network.drivers.map((d) => (
            <div key={d} className="py-8">
              <p className="text-label break-all">{people[d] ?? d}</p>
              {people[d] && <p className="text-caption break-all text-ds-muted">{d}</p>}
            </div>
          ))}
        </Panel>
        <Panel title="Destinations">
          {data.network.destinations.length === 0 && (
            <p className="text-label text-ds-muted">No destinations yet. Add your first one.</p>
          )}
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

function InviteSheet({
  type,
  onClose,
  onSent,
}: {
  type: "driver" | "warehouse";
  onClose: () => void;
  onSent: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const phoneOk = /^\+[1-9]\d{6,14}$/.test(phone.replace(/\s/g, ""));
  const ready = name.trim() && phoneOk && (type === "driver" || address.trim());

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<InviteCreatedResponse>("/invites", {
        body: {
          type,
          name: name.trim(),
          phone: phone.replace(/\s/g, ""),
          ...(type === "warehouse" && { address: address.trim() }),
        },
      });
      setLink(result.link);
      onSent();
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionSheet
      title={type === "driver" ? "Invite a driver" : "Add a destination"}
      onClose={onClose}
    >
      {link ? (
        <>
          <p className="text-label">
            Send this link to {name.trim()}. Once they accept it, add them to your network here.
          </p>
          <p className="rounded-row bg-ds-canvas p-14 text-label break-all">{link}</p>
          <Button
            icon={<Copy size={17} />}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Link copied" : "Copy the link"}
          </Button>
          <Button variant="quiet" onClick={onClose}>
            Done
          </Button>
        </>
      ) : (
        <>
          <Input
            label={type === "driver" ? "Driver’s name" : "Destination name"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label={type === "driver" ? "WhatsApp number" : "Receiver’s WhatsApp number"}
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={
              phone.length > 4 && !phoneOk ? "Use the country code, like +12075550142." : undefined
            }
          />
          {type === "warehouse" && (
            <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          )}
          {error && <Alert>{error}</Alert>}
          <Button
            disabled={!ready}
            loading={busy}
            loadingLabel="Sending"
            onClick={() => void send()}
          >
            Make the invite link
          </Button>
        </>
      )}
    </ActionSheet>
  );
}

/* P7. */
function Credit({ data, refresh }: { data: LiveShipperData; refresh: () => void }) {
  const shipper = data.shipper!;
  const [review, setReview] = useState<CreditReviewInfo | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const timer = useRef<number | null>(null);

  async function read() {
    const result = await api<CreditReviewResponse | null>("/credit/reviews/me");
    setReview(result?.review ?? null);
    return result?.review ?? null;
  }
  useEffect(() => {
    read().catch(() => setReview(null));
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);
  async function ask() {
    setAsking(true);
    setError(null);
    try {
      await api("/credit/review", { body: {} });
      /* The private check runs on the server. Read it again until it is complete. */
      const poll = async (tries: number) => {
        const latest = await read().catch(() => null);
        if (latest?.state === "complete" || tries <= 0) {
          setAsking(false);
          refresh();
          return;
        }
        timer.current = window.setTimeout(() => void poll(tries - 1), 3000);
      };
      await poll(60);
    } catch (e) {
      setError(failure(e));
      setAsking(false);
    }
  }

  const running = asking || (review && review.state !== "complete");
  return (
    <>
      <header>
        <h1 className="text-title">Credit</h1>
        <p className="mt-6 text-label text-ds-muted">Your limit grows as you pay bills on time.</p>
      </header>
      <div className="grid items-start gap-16 lg:grid-cols-2">
        <Panel title="Your limit">
          <Money amount={shipper.limit} className="text-amount" />
          <Meter data={data} />
          <p className="text-label text-ds-muted">
            {shipper.late_bills
              ? `${shipper.late_bills} ${shipper.late_bills === 1 ? "bill is" : "bills are"} late.`
              : "No bill is late."}
          </p>
        </Panel>
        <Panel title="Credit assistant">
          {review === undefined ? (
            <p className="text-label text-ds-muted">Loading.</p>
          ) : running ? (
            <p className="text-label">
              The credit assistant is checking your record privately. This takes a minute.
            </p>
          ) : review ? (
            <>
              <p className="text-label">
                {review.result === "raised"
                  ? `Your limit went up to ${review.suggestedLimit ? formatUsdc(BigInt(review.suggestedLimit)) : formatUsdc(BigInt(shipper.limit))} USDC.`
                  : review.result === "proposed"
                    ? `The assistant suggested ${review.suggestedLimit ? formatUsdc(BigInt(review.suggestedLimit)) : "a new"} USDC. The team decides next.`
                    : review.result === "no_change"
                      ? "Your limit stays the same for now."
                      : "The last check could not finish."}
              </p>
              {review.reasons.map((r) => (
                <p key={r} className="text-caption text-ds-ink-2">
                  {r}
                </p>
              ))}
              <p className="text-caption text-ds-muted">
                Checked{" "}
                {new Date(review.completedAt ?? review.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                .
              </p>
              {review.txHash && <ProofLink tx={review.txHash} />}
            </>
          ) : (
            <p className="text-label text-ds-muted">You have not asked for a review yet.</p>
          )}
          {error && <Alert>{error}</Alert>}
          <Button
            disabled={!!running}
            loading={asking}
            loadingLabel="Checking"
            onClick={() => void ask()}
          >
            Ask for a review
          </Button>
        </Panel>
      </div>
    </>
  );
}
