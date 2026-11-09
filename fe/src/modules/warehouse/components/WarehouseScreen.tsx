"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Package,
  WarningCircle,
  Truck,
  Warning,
  Check,
  Image as ImageIcon,
  Keyboard,
  PaperPlaneTilt,
  Scan,
} from "@phosphor-icons/react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { DemoMap } from "@/components/elements/DemoMap";
import { KeyValue } from "@/components/elements/KeyValue";
import { Stat } from "@/components/elements/Stat";
import { ResultScreen } from "@/components/elements/ResultScreen";
import { QrScanner } from "@/components/elements/QrScanner";
import { confirmDemoDelivery, DEMO_CODE, readDemoDelivery } from "@/lib/demo-delivery";
import { cn } from "@/lib/cn";
import { WAREHOUSE_FIXTURES, type WarehouseState } from "../data/fixtures";

export function WarehouseScreen({
  initialState = "W1.1",
  preview = false,
}: {
  initialState?: WarehouseState;
  preview?: boolean;
}) {
  const [state, setState] = useState<WarehouseState>(initialState);
  const [code, setCode] = useState(
    initialState === "W2.10" ? "7K2Q9F4N" : initialState === "W2.9" ? "7K2Q9F" : "",
  );
  const [camera, setCamera] = useState(false);
  const [allGood, setAllGood] = useState(true);
  const [reasons, setReasons] = useState(["Damaged"]);
  const [qty, setQty] = useState("112");
  const [note, setNote] = useState("8 crates arrived wet, 4 of them torn open.");
  const [photos, setPhotos] = useState<{ name: string; src: string }[]>([]);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const submitting = useRef(false);
  const router = useRouter();
  const shipment = WAREHOUSE_FIXTURES[state];
  const go = (next: WarehouseState) => {
    setError("");
    if (next !== "W2.1") setCamera(false);
    setState(next);
  };
  const home = () => {
    if (preview) go("W1.1");
    else router.push("/warehouse");
  };
  const scan = () => {
    if (preview) go("W2.2");
    else router.push("/warehouse/scan");
  };
  const checkCode = (raw: string) => {
    const normalized = raw.replace(/\s/g, "").toUpperCase();
    if (normalized !== DEMO_CODE) {
      go("W2.10");
      return;
    }
    if (!preview && readDemoDelivery() !== "road") {
      go("W2.12");
      return;
    }
    go("W2.3");
  };
  const confirm = async (report = false) => {
    if (submitting.current) return;
    if (
      report &&
      (!/^\d+$/.test(qty) ||
        Number(qty) < 0 ||
        Number(qty) > shipment.qty ||
        !reasons.length ||
        !note.trim())
    ) {
      setError("Enter a count from 0 to 120, choose a problem and add a note.");
      return;
    }
    submitting.current = true;
    if (!report) go("W2.5");
    try {
      // Fixture transport. Authentication and the signed relayer replace this boundary later.
      if (!preview) {
        const changed = confirmDemoDelivery(
          report ? "reported" : "paid",
          report ? { goodQty: Number(qty), reasons, note, photos } : undefined,
        );
        if (!changed) {
          go("W2.12");
          return;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
      go(report ? "W2.8" : "W2.6");
    } catch {
      go(report ? "W2.7" : "W2.3");
      setError("Your confirmation was not saved. Please try again.");
    } finally {
      submitting.current = false;
    }
  };
  const current = state.startsWith("W1")
    ? "/warehouse"
    : state.startsWith("W3")
      ? "/warehouse/history"
      : "/warehouse/scan";
  const detail = state.startsWith("W2");
  const narrow = detail && state !== "W2.1";
  const title = state.startsWith("W1")
    ? state === "W1.3"
      ? "Arrivals"
      : "Good afternoon, Lena"
    : state.startsWith("W3")
      ? "History"
      : state === "W2.7"
        ? "Report a problem"
        : ["W2.3", "W2.5"].includes(state)
          ? "Confirm delivery"
          : "Scan a delivery";

  const result =
    state === "W2.6"
      ? {
          title: "Delivery confirmed",
          description: "120 crates from Northwind are in. Sam is getting paid right now.",
          recorded: "Arrival confirmed by Lena",
        }
      : state === "W2.8"
        ? {
            title: "Report sent",
            description: `Northwind and Sam can see your report. The ${qty} good crates and the ${120 - Number(qty)} damaged ones are recorded.`,
            recorded: "Report recorded on NEAR",
          }
        : state === "W2.12"
          ? {
              title: "Already confirmed",
              description:
                "Lena confirmed shipment #1041 today at 15:36. Sam is already paid. There’s nothing else to do.",
              recorded: undefined,
            }
          : state === "W2.4"
            ? {
                title: "Not for this warehouse",
                description:
                  "Shipment #1052 goes to Riverton branch, not Harbor Hub. Ask the driver to check the address.",
                recorded: undefined,
              }
            : null;

  return (
    <RoleShell role="warehouse" current={current} detail={detail}>
      {result ? (
        <>
          <ResultScreen
            {...result}
            warning={state === "W2.4"}
            tone={
              state === "W2.4"
                ? "danger"
                : state === "W2.8"
                  ? "soft"
                  : state === "W2.12"
                    ? "success"
                    : "brand"
            }
            action={state === "W2.4" ? "Scan another QR" : "Back to arrivals"}
            actionIcon={
              state === "W2.4" ? (
                <Scan size={17} />
              ) : state === "W2.12" ? (
                <ArrowLeft size={17} />
              ) : undefined
            }
            onAction={state === "W2.4" ? () => go("W2.2") : home}
            secondary={state === "W2.4" ? { label: "Back to arrivals", onClick: home } : undefined}
          />
          {state === "W2.12" && (
            <Link
              href="/warehouse/history"
              className="link focus-ring mx-auto block w-fit text-label"
            >
              See it in history ↗
            </Link>
          )}
        </>
      ) : (
        <div className={cn(narrow && "mx-auto w-full max-w-560")}>
          {detail && (
            <button
              className="press focus-ring mb-20 flex items-center gap-8 rounded-small text-label text-ds-muted"
              onClick={state === "W2.7" ? () => go("W2.3") : home}
            >
              <ArrowLeft size={18} />
              {state === "W2.7" ? "Confirm delivery" : "Arrivals"}
            </button>
          )}
          <h1 className="text-title md:text-amount">{title}</h1>
          <p className="mt-4 mb-20 text-label text-ds-muted">
            {state.startsWith("W1")
              ? state === "W1.3"
                ? "Harbor Hub"
                : "3 trucks expected at Harbor Hub today"
              : state.startsWith("W3")
                ? "Everything received at Harbor Hub"
                : state === "W2.7"
                  ? "Shipment #1041 · Sam"
                  : ["W2.3", "W2.5"].includes(state)
                    ? "From Sam's phone · just now"
                    : "Scan the driver's QR"}
          </p>

          {state === "W1.3" || state === "W3.2" ? (
            <Panel className="min-h-[65dvh] items-center justify-center text-center">
              {state === "W1.3" ? (
                <img
                  src="/illustrations/warehouse.svg"
                  alt=""
                  className="h-140 w-180 object-contain"
                />
              ) : (
                <span className="grid size-72 place-items-center rounded-full bg-ds-canvas">
                  <Package size={32} />
                </span>
              )}
              <h2 className="text-heading">
                {state === "W1.3" ? "No trucks expected today" : "Nothing received yet"}
              </h2>
              <p className="max-w-400 text-body text-ds-muted">
                {state === "W1.3"
                  ? "When a shipment to Harbor Hub is approved, it shows up here with the driver's name and arrival time."
                  : "Deliveries you confirm or report show up here."}
              </p>
            </Panel>
          ) : state.startsWith("W1") ? (
            <div className="flex flex-col gap-16">
              {state === "W1.2" && (
                <Panel className="ready-card bg-ds-brand">
                  <p className="flex items-center gap-8 text-label">
                    <Truck size={18} className="shrink-0" />
                    Arriving in about 5 minutes
                  </p>
                  <p className="text-title">Sam · NWF-204</p>
                  <p className="text-label text-ds-ink-2">
                    #1041 from Northwind · 120 crates of coffee
                  </p>
                  <Button
                    icon={<Scan size={17} />}
                    className="w-full justify-between md:w-fit"
                    onClick={scan}
                  >
                    Scan the driver&apos;s QR
                  </Button>
                </Panel>
              )}
              <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Panel title="Expected today" className="md:order-2 lg:order-1">
                  {[
                    [
                      "Sam · from Eastport",
                      "#1041 · 120 crates of coffee · Northwind",
                      state === "W1.2" ? "in 5 min" : "in 1 h 20 min",
                    ],
                    [
                      "Jordan Lee · from Riverton",
                      "#1047 · 80 sacks of sugar · Blue Ridge",
                      "in 2 h 40 min",
                    ],
                    [
                      "Chris Novak · from Millbrook",
                      "#1050 · 40 crates of eggs · Northwind",
                      "Not left yet",
                    ],
                  ].map(([name, meta, time]) => (
                    <div key={name} className="flex items-center gap-12 py-16">
                      <span className="grid size-40 shrink-0 place-items-center rounded-full bg-ds-canvas">
                        <Truck size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-label">{name}</h3>
                        <p className="mt-4 text-caption text-ds-muted">{meta}</p>
                      </div>
                      <span className="shrink-0 text-caption">{time}</span>
                    </div>
                  ))}
                </Panel>
                <Panel className="p-16 md:order-1 lg:order-2">
                  <DemoMap label="2 trucks on the way" twoTrucks className="h-340 md:h-380" />
                </Panel>
              </div>
            </div>
          ) : state === "W3.1" ? (
            <div className="flex flex-col gap-16">
              <div className="grid gap-16 md:grid-cols-2">
                <Stat
                  className="w-full"
                  label="This month"
                  value="12 deliveries"
                  context="11 confirmed, 1 problem"
                />
                <Stat
                  className="w-full"
                  label="Average check time"
                  value="3 min"
                  context="From scan to confirm"
                />
              </div>
              <Panel>
                {[
                  ["1041", "Eastport", "Sam", "120 of 120 crates", "Confirmed", "Today, 15:36"],
                  [
                    "1038",
                    "Riverton",
                    "Jordan Lee",
                    "72 of 80 sacks",
                    "Problem reported",
                    "Nov 10, 11:02",
                  ],
                  [
                    "1035",
                    "Millbrook",
                    "Chris Novak",
                    "40 of 40 crates",
                    "Confirmed",
                    "Nov 9, 16:45",
                  ],
                  ["1030", "Eastport", "Sam", "100 of 100 sacks", "Confirmed", "Nov 7, 09:20"],
                ].map(([id, from, driver, cargo, status, time]) => (
                  <div
                    key={id}
                    className="flex flex-wrap items-center justify-between gap-12 border-b border-ds-line py-16 last:border-0"
                  >
                    <div className="flex items-center gap-12">
                      <span
                        className={cn(
                          "grid size-40 shrink-0 place-items-center rounded-full bg-ds-canvas",
                          status === "Confirmed" ? "text-ds-ink" : "text-ds-danger",
                        )}
                      >
                        {status === "Confirmed" ? (
                          <Package size={17} />
                        ) : (
                          <WarningCircle size={17} />
                        )}
                      </span>
                      <span>
                        <h2 className="text-body">{from} to Harbor City</h2>
                        <p className="mt-4 text-caption text-ds-muted">
                          #{id} · {driver} · {cargo}
                        </p>
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-6">
                      <span
                        className={cn(
                          "rounded-full bg-ds-canvas px-12 py-6 text-caption",
                          status === "Confirmed" ? "text-ds-success" : "text-ds-danger",
                        )}
                      >
                        {status}
                      </span>
                      <span className="text-caption text-ds-muted">{time}</span>
                    </div>
                  </div>
                ))}
              </Panel>
            </div>
          ) : state === "W2.1" ? (
            <div className="grid gap-16 md:grid-cols-2">
              <div className="fixed inset-0 z-50 flex flex-col bg-ds-ink md:relative md:z-auto md:rounded-card">
                <button
                  className="focus-ring h-52 self-start px-24 text-label text-ds-bg md:hidden"
                  onClick={home}
                >
                  Close
                </button>
                <QrScanner
                  className="flex-1 rounded-none md:h-460 md:rounded-card"
                  active={camera && !preview}
                  onCode={checkCode}
                  onBlocked={() => go("W2.11")}
                />
                <Button
                  variant="quiet"
                  className="mx-auto my-32 bg-ds-ink-2 text-ds-bg md:hidden"
                  onClick={() => go("W2.9")}
                >
                  Type code
                </Button>
              </div>
              <Panel title="Type code" className="hidden h-fit md:flex">
                <label className="text-label">
                  The code has eight characters.
                  <input
                    aria-label="Delivery code"
                    className="focus-ring mt-12 w-full rounded-small bg-ds-canvas p-16 font-mono text-title uppercase"
                    value={code}
                    maxLength={9}
                    onChange={(e) => setCode(e.target.value.replace(/\s/g, "").toUpperCase())}
                  />
                </label>
                <Button disabled={code.length !== 8} onClick={() => checkCode(code)}>
                  Find delivery
                </Button>
                <Button variant="quiet" onClick={() => go("W2.9")}>
                  Type code
                </Button>
              </Panel>
            </div>
          ) : state === "W2.2" || state === "W2.11" ? (
            <Panel className="min-h-420 items-center justify-center text-center">
              <Camera size={60} className="text-ds-muted" />
              <h2 className="text-heading">
                {state === "W2.2" ? "Allow the camera" : "The camera is blocked"}
              </h2>
              <p className="max-w-400 text-body text-ds-muted">
                {state === "W2.2"
                  ? "Your phone asks next. Waybil only uses the camera to read the driver's QR."
                  : "Turn the camera on in your settings, or type the code from the driver's phone."}
              </p>
              <Button
                icon={state === "W2.11" ? <Keyboard size={17} /> : undefined}
                className="w-full justify-between"
                onClick={() => {
                  if (state === "W2.11") go("W2.9");
                  else {
                    setState("W2.1");
                    setCamera(true);
                  }
                }}
              >
                {state === "W2.2" ? "Continue" : "Type the code"}
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  if (state === "W2.2") go("W2.9");
                  else setHelp(!help);
                }}
              >
                {state === "W2.2" ? "Type code" : "How to turn it on"}
              </Button>
              {help && (
                <p className="text-caption text-ds-muted">
                  Open the site settings beside the address bar, allow camera access, then reload
                  this page.
                </p>
              )}
            </Panel>
          ) : state === "W2.9" || state === "W2.10" ? (
            <Panel className="min-h-420 justify-center">
              <h2 className="text-heading">
                {state === "W2.10" ? "That code doesn’t match" : "Type the code"}
              </h2>
              <p className="text-body text-ds-muted">
                {state === "W2.10"
                  ? "It isn’t an arrival for Harbor Hub today. Check the code under the driver’s QR."
                  : "It’s under the QR on the driver’s phone."}
              </p>
              <label className="relative block rounded-small has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ds-ink">
                <span className="sr-only">Delivery code</span>
                <input
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={9}
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value
                        .replace(/\s/g, "")
                        .replace(/[^a-zA-Z0-9]/g, "")
                        .toUpperCase(),
                    )
                  }
                  className="absolute inset-0 z-10 w-full cursor-text opacity-0"
                  aria-invalid={state === "W2.10"}
                />
                <span aria-hidden className="grid grid-cols-8 gap-4">
                  {Array.from({ length: 8 }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "grid h-52 place-items-center rounded-small border bg-ds-canvas font-mono text-heading",
                        state === "W2.10"
                          ? "border-ds-danger text-ds-danger"
                          : "border-ds-line-strong",
                      )}
                    >
                      {code[i] ?? ""}
                    </span>
                  ))}
                </span>
              </label>
              <Button
                icon={<Check size={17} weight="bold" />}
                disabled={code.length !== 8}
                onClick={() => checkCode(code)}
              >
                Confirm code
              </Button>
              <Button variant="quiet" onClick={() => go("W2.2")}>
                Scan instead
              </Button>
            </Panel>
          ) : state === "W2.7" ? (
            <>
              <Panel>
                <fieldset>
                  <legend className="mb-12 text-label">What’s wrong?</legend>
                  <div className="flex flex-wrap gap-8">
                    {["Damaged", "Missing items", "Wrong goods", "Other"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={reasons.includes(r)}
                        onClick={() =>
                          setReasons(
                            reasons.includes(r) ? reasons.filter((v) => v !== r) : [...reasons, r],
                          )
                        }
                        className={cn(
                          "press focus-ring rounded-full px-16 py-10 text-label",
                          reasons.includes(r) ? "bg-ds-ink text-ds-bg" : "bg-ds-canvas",
                        )}
                      >
                        {reasons.includes(r) && <Check size={14} className="mr-6 inline" />}
                        {r}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="text-label">
                  How many crates are in good shape?
                  <span className="mt-8 flex items-center gap-10">
                    <input
                      inputMode="numeric"
                      type="number"
                      min={0}
                      max={120}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="focus-ring w-120 rounded-small border border-ds-warning bg-ds-bg p-16 text-heading"
                    />
                    <span className="text-body text-ds-muted">of 120</span>
                  </span>
                </label>
                <p className="text-caption text-ds-warning">
                  {Math.max(0, 120 - Number(qty))} crates are damaged. This goes into your report.
                </p>
                <label className="text-label">
                  What happened
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="focus-ring mt-8 min-h-90 w-full resize-y rounded-small bg-ds-canvas p-16 text-body"
                  />
                </label>
                <p className="text-caption text-ds-muted">Can’t be changed after you approve.</p>
                <div>
                  <p className="mb-8 text-label">Photos</p>
                  <div className="flex flex-wrap gap-8">
                    {photos.length
                      ? photos.map((photo, i) => (
                          <button
                            key={photo.name + i}
                            type="button"
                            aria-label={`Remove ${photo.name}`}
                            onClick={() => setPhotos(photos.filter((_, n) => n !== i))}
                          >
                            <img
                              src={photo.src}
                              alt={photo.name}
                              className="size-72 rounded-small object-cover"
                            />
                          </button>
                        ))
                      : [1, 2].map((n) => (
                          <span
                            key={n}
                            className="grid size-72 place-items-center rounded-small bg-ds-canvas text-ds-muted"
                          >
                            <ImageIcon size={22} />
                          </span>
                        ))}
                    <label className="press focus-ring grid size-72 cursor-pointer place-items-center rounded-small border border-ds-line-strong text-caption">
                      <Camera size={20} />
                      Add
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/jpeg,image/png"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (
                            files.some(
                              (f) =>
                                f.size > 2 * 1024 * 1024 ||
                                !["image/jpeg", "image/png"].includes(f.type),
                            )
                          ) {
                            setError("Choose JPG or PNG photos under 2 MB each.");
                            return;
                          }
                          const results = await Promise.all(
                            files.map(
                              (file) =>
                                new Promise<{ name: string; src: string }>((resolve, reject) => {
                                  const reader = new FileReader();
                                  reader.onload = () =>
                                    resolve({ name: file.name, src: String(reader.result) });
                                  reader.onerror = () => reject(new Error("read"));
                                  reader.readAsDataURL(file);
                                }),
                            ),
                          ).catch(() => null);
                          if (results) {
                            setPhotos([...photos, ...results]);
                            setError("");
                          } else setError("The photos could not be read. Please try again.");
                        }}
                      />
                    </label>
                  </div>
                </div>
              </Panel>
              <p className="my-16 flex gap-10 rounded-row bg-ds-brand-soft p-16 text-label">
                <Warning size={20} className="shrink-0" />
                Sam won’t be paid early until Northwind settles this with him.
              </p>
              <Button
                icon={<PaperPlaneTilt size={17} />}
                className="w-full justify-between"
                disabled={submitting.current}
                onClick={() => confirm(true)}
              >
                Send report
              </Button>
              <Button
                variant="quiet"
                className="mt-12 w-full justify-center"
                onClick={() => go("W2.3")}
              >
                Cancel
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-16">
              <Panel title="Shipment #1041">
                <div>
                  <KeyValue label="From" value="Northwind, Eastport" />
                  <KeyValue label="Driver" value="Sam · NWF-204" />
                  <KeyValue label="Cargo" value="120 crates of coffee" />
                  <KeyValue label="Picked up" value="Today, 09:14" />
                </div>
              </Panel>
              <Panel title="Check the goods">
                <fieldset disabled={state === "W2.5"}>
                  <legend className="mb-10 text-label">Did everything arrive?</legend>
                  {[
                    { value: true, title: "All 120 crates arrived", sub: "Nothing missing" },
                    {
                      value: false,
                      title: "Some are missing or damaged",
                      sub: "You’ll report what’s wrong",
                    },
                  ].map((o) => (
                    <label
                      key={o.title}
                      className={cn(
                        "mb-8 flex cursor-pointer items-center gap-12 rounded-row border p-16 last:mb-0",
                        allGood === o.value
                          ? "border-ds-ink bg-ds-brand-soft"
                          : "border-transparent bg-ds-canvas",
                      )}
                    >
                      <input
                        type="radio"
                        name="goods"
                        checked={allGood === o.value}
                        onChange={() => setAllGood(o.value)}
                        className="size-20 shrink-0 accent-ds-ink"
                      />
                      <span className="text-label">
                        {o.title}
                        <span className="block text-caption text-ds-muted">{o.sub}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              </Panel>
              <div className="flex flex-col-reverse gap-12 md:flex-row md:justify-end">
                {state !== "W2.5" && (
                  <Button variant="quiet" className="text-ds-danger" onClick={() => go("W2.7")}>
                    Report a problem
                  </Button>
                )}
                <Button
                  loading={state === "W2.5"}
                  loadingLabel="Saving your confirmation"
                  icon={allGood ? <Check size={17} weight="bold" /> : undefined}
                  className="w-full justify-between md:w-fit"
                  onClick={() => (allGood ? confirm() : go("W2.7"))}
                >
                  {allGood ? "Confirm full delivery" : "Report a problem"}
                </Button>
              </div>
              {state === "W2.5" && (
                <p role="status" className="text-center text-caption text-ds-muted">
                  Takes a second. Keep this page open.
                </p>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="mt-12 text-label text-ds-danger">
              {error}
            </p>
          )}
        </div>
      )}
      <p className="mt-24 text-center text-caption text-ds-muted">
        This demo uses sample data. It does not move money.
      </p>
    </RoleShell>
  );
}
