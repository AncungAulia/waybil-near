"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CameraSlash,
  Package,
  WarningCircle,
  Truck,
  XCircle,
  Check,
  Image as ImageIcon,
  Keyboard,
  PaperPlaneTilt,
  Scan,
  X,
  SealCheck,
  Info,
  Lightning,
} from "@phosphor-icons/react";
import { RoleShell } from "@/components/layout/RoleShell";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { WarehouseMap } from "./WarehouseMap";
import { DeliveryCodeInput } from "./DeliveryCodeInput";
import { KeyValue } from "@/components/elements/KeyValue";
import { Stat } from "@/components/elements/Stat";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { QrScanner } from "@/components/elements/QrScanner";
import { useDemoDelivery } from "@/hooks/useDemoDelivery";
import { confirmDemoDelivery, DEMO_CODE, readDemoDelivery } from "@/lib/demo-delivery";
import { cn } from "@/lib/cn";
import { WAREHOUSE_FIXTURES, type WarehouseState } from "../data/fixtures";
import "./warehouse.css";

/*
 * Report photos travel to the driver's screen through localStorage, which holds only a few
 * MB. Each photo is shrunk to a small JPEG thumbnail first, so a report always fits.
 */
const THUMB_SIDE = 240;
function thumbnail(file: File) {
  return new Promise<{ name: string; src: string }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, THUMB_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const context = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!context) return reject(new Error("canvas"));
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ name: file.name, src: canvas.toDataURL("image/jpeg", 0.6) });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("read"));
    };
    img.src = url;
  });
}
/* Six thumbnails stay well under the browser's storage limit. */
const MAX_PHOTOS = 6;

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
  const [torch, setTorch] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [allGood, setAllGood] = useState(true);
  const [reasons, setReasons] = useState(["Damaged"]);
  const [qty, setQty] = useState("112");
  const [note, setNote] = useState("8 crates arrived wet, 4 of them torn open.");
  const [photos, setPhotos] = useState<{ name: string; src: string }[]>([]);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const submitting = useRef(false);
  const router = useRouter();
  const delivery = useDemoDelivery();
  /* A rescan after a problem report must not say the driver was paid. */
  const reported = !preview && (delivery === "reported" || delivery === "settled");
  const shipment = WAREHOUSE_FIXTURES[state];
  const go = (next: WarehouseState) => {
    setError("");
    if (next !== "W2.1") {
      setCamera(false);
      setTorch(false);
    }
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
  /* The board keeps the scanner on screen and lays a dialog over it for these. */
  const scanning = ["W2.1", "W2.2", "W2.9", "W2.10", "W2.11"].includes(state);
  const asking = scanning && state !== "W2.1";
  const narrow = detail && !scanning;
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
          recorded: "Demo confirmation receipt",
        }
      : state === "W2.8"
        ? {
            title: "Report sent",
            description: `Northwind and Sam can see your report. The ${qty} good crates and the ${120 - Number(qty)} damaged ones are recorded.`,
            recorded: "Demo report receipt",
          }
        : state === "W2.12"
          ? reported
            ? {
                title: "Already reported",
                description:
                  delivery === "settled"
                    ? "A problem was already reported for shipment #1041, and Northwind has settled it with Sam. There’s nothing else to do."
                    : "A problem was already reported for shipment #1041. Sam gets paid after Northwind chooses what to pay. There’s nothing else to do.",
                recorded: undefined,
              }
            : {
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
    <div className="warehouse-ui" data-state={state}>
      <RoleShell role="warehouse" current={current} detail={detail}>
        {result ? (
          <>
            <section className="warehouse-result">
              <div className="warehouse-result-body">
                {state === "W2.6" ? (
                  <img
                    src="/illustrations/warehouse/confirmed.svg"
                    alt=""
                    className="h-210 w-280 rounded-row"
                  />
                ) : (
                  <span
                    className={cn(
                      "grid size-80 place-items-center rounded-full",
                      state === "W2.4"
                        ? "bg-ds-danger-result text-ds-danger"
                        : state === "W2.12"
                          ? reported
                            ? "bg-ds-brand-soft text-ds-brand-deep"
                            : "bg-ds-success-soft text-ds-success"
                          : "bg-ds-brand-soft text-ds-brand-deep",
                    )}
                  >
                    {state === "W2.4" ? (
                      <XCircle size={34} />
                    ) : state === "W2.12" ? (
                      reported ? (
                        <WarningCircle size={34} />
                      ) : (
                        <SealCheck size={34} />
                      )
                    ) : (
                      <PaperPlaneTilt size={34} />
                    )}
                  </span>
                )}
                <h1>{result.title}</h1>
                <p className="text-[14px] leading-20 text-ds-muted">{result.description}</p>
                {result.recorded && (
                  <div className="warehouse-receipt">
                    <DemoRecord title={result.recorded} />
                  </div>
                )}
                <div className="warehouse-result-actions">
                  <Button
                    icon={
                      state === "W2.4" ? (
                        <Scan size={17} />
                      ) : state === "W2.12" ? (
                        <ArrowLeft size={17} />
                      ) : undefined
                    }
                    className="h-52 w-full"
                    onClick={state === "W2.4" ? () => go("W2.2") : home}
                  >
                    {state === "W2.4" ? "Scan another QR" : "Back to arrivals"}
                  </Button>
                  {state === "W2.4" && (
                    <Button variant="quiet" className="w-full justify-center" onClick={home}>
                      Back to arrivals
                    </Button>
                  )}
                  {state === "W2.12" && (
                    <Link
                      href="/warehouse/history"
                      className="focus-ring grid h-48 place-items-center rounded-full bg-ds-canvas text-[14px]"
                    >
                      See it in history
                    </Link>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : (
          <div
            className={cn(
              "warehouse-content",
              asking && "warehouse-asking",
              narrow && "mx-auto w-full max-w-560",
            )}
          >
            {detail && !scanning && (
              <button
                className="press focus-ring mb-20 flex items-center gap-8 rounded-small text-label text-ds-muted"
                onClick={state === "W2.7" ? () => go("W2.3") : home}
              >
                <ArrowLeft size={18} />
                {state === "W2.7" ? "Confirm delivery" : "Arrivals"}
              </button>
            )}
            <h1 className="text-title md:text-amount">{title}</h1>
            {!asking && (
              <p className="warehouse-subtitle mt-6 mb-24 text-[14px] leading-17 text-ds-muted">
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
            )}

            {state === "W1.3" || state === "W3.2" ? (
              <Panel className="warehouse-empty items-center justify-center text-center">
                {state === "W1.3" ? (
                  <img
                    src="/illustrations/warehouse/empty.svg"
                    alt=""
                    className="h-210 w-280 rounded-row object-contain"
                  />
                ) : (
                  <Package size={26} className="text-ds-muted" />
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
              <div className="warehouse-arrivals">
                {state === "W1.2" && (
                  <Panel className="warehouse-arriving ready-card bg-ds-brand">
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
                <Panel title="Expected today" gap={4} className="warehouse-expected">
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
                  ].map(([name, meta, time], i) => (
                    <div
                      key={name}
                      className="warehouse-arrival-row flex items-center gap-12 py-14"
                    >
                      <span
                        className={cn(
                          "grid size-40 shrink-0 place-items-center rounded-full",
                          state === "W1.2" && i === 0 ? "bg-ds-brand" : "bg-ds-canvas",
                        )}
                      >
                        <Truck size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] leading-18 font-medium">{name}</h3>
                        <p className="mt-2 text-[12.5px] leading-18 text-ds-muted">{meta}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-[13.5px] font-medium",
                          i === 2 && "text-ds-muted",
                        )}
                      >
                        {time}
                      </span>
                    </div>
                  ))}
                </Panel>
                <WarehouseMap arriving={state === "W1.2"} />
              </div>
            ) : state === "W3.1" ? (
              <div className="flex flex-col gap-16">
                <div className="warehouse-stats grid grid-cols-2 gap-16">
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
                <Panel className="warehouse-history" gap={4}>
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
                        <span className="flex items-center gap-6 rounded-full bg-ds-canvas px-11 py-6 text-caption">
                          <span
                            className={cn(
                              "size-7 rounded-full",
                              status === "Confirmed" ? "bg-ds-success" : "bg-ds-danger",
                            )}
                          />
                          {status}
                        </span>
                        <span className="text-caption text-ds-muted">{time}</span>
                      </div>
                    </div>
                  ))}
                </Panel>
              </div>
            ) : scanning ? (
              <div
                className={cn(
                  "warehouse-scan grid gap-16",
                  !asking && "lg:grid-cols-[minmax(0,720px)_minmax(0,1fr)]",
                )}
              >
                <div
                  className={cn(
                    "warehouse-camera flex flex-col bg-ds-ink md:rounded-card",
                    !asking && "warehouse-camera-fullscreen",
                  )}
                >
                  <button
                    className={cn(
                      "focus-ring flex h-50 shrink-0 items-center gap-8 self-start px-20 text-[15px] text-ds-bg md:hidden",
                      asking && "hidden",
                    )}
                    onClick={home}
                  >
                    <X size={22} /> Close
                  </button>
                  {!asking && (
                    <button
                      type="button"
                      aria-label="Toggle flashlight"
                      aria-pressed={torch}
                      disabled={!torchAvailable}
                      onClick={() => setTorch(!torch)}
                      className="warehouse-torch focus-ring absolute top-20 right-20 z-10 text-ds-bg disabled:text-ds-muted md:hidden"
                    >
                      <Lightning size={22} weight={torch ? "fill" : "regular"} />
                    </button>
                  )}
                  <QrScanner
                    className="warehouse-viewfinder flex-1 rounded-none md:rounded-card"
                    active={camera && !preview}
                    onCode={checkCode}
                    onBlocked={() => go("W2.11")}
                    torch={torch}
                    onTorchAvailable={setTorchAvailable}
                  />
                  {/* Closing the camera sheet leaves the camera off, so offer a way back on. */}
                  {state === "W2.1" && !camera && !preview && (
                    <Button
                      variant="moment"
                      icon={<Camera size={17} />}
                      className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                      onClick={() => setCamera(true)}
                    >
                      Turn on camera
                    </Button>
                  )}
                  <Button
                    variant="quiet"
                    className={cn(
                      "mx-auto my-16 h-41 bg-ds-bg/10 text-ds-bg md:hidden",
                      asking && "hidden",
                    )}
                    onClick={() => go("W2.9")}
                  >
                    Type code
                  </Button>
                </div>
                {!asking && (
                  <Panel
                    title="Type code"
                    gap={12}
                    className="warehouse-type-code hidden h-fit md:flex"
                  >
                    <DeliveryCodeInput value={code} onChange={setCode} />
                    <p className="text-[12.5px] leading-15 text-ds-muted">
                      The code has eight characters. It is under the QR on the driver&apos;s phone.
                    </p>
                    <Button
                      className="h-52 self-start"
                      disabled={code.length !== 8}
                      onClick={() => checkCode(code)}
                    >
                      Find delivery
                    </Button>
                  </Panel>
                )}
              </div>
            ) : state === "W2.7" ? (
              <>
                <Panel className="warehouse-report" gap={18}>
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
                              reasons.includes(r)
                                ? reasons.filter((v) => v !== r)
                                : [...reasons, r],
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
                    <span className="warehouse-quantity mt-8 flex items-center gap-10">
                      <input
                        inputMode="numeric"
                        type="number"
                        min={0}
                        max={120}
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        className="focus-ring w-full rounded-small border border-ds-warning bg-ds-bg p-16 text-heading"
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
                      rows={1}
                      wrap="off"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="focus-ring mt-8 min-h-48 w-full resize-y rounded-small bg-ds-canvas p-16 text-body"
                    />
                  </label>
                  <div>
                    <p className="mb-8 text-label">Photos</p>
                    <div className="flex flex-wrap gap-8">
                      {photos.length
                        ? photos.map((photo, i) => (
                            <button
                              key={photo.name + i}
                              type="button"
                              aria-label={`Remove ${photo.name}`}
                              className="press focus-ring rounded-small"
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
                      <label className="press focus-ring flex size-72 cursor-pointer flex-col items-center justify-center gap-4 rounded-small border-[1.5px] border-ds-line-strong text-caption font-medium">
                        <Camera size={20} />
                        <span>Add</span>
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
                                  f.size > 20 * 1024 * 1024 ||
                                  !["image/jpeg", "image/png"].includes(f.type),
                              )
                            ) {
                              setError("Choose JPG or PNG photos under 20 MB each.");
                              return;
                            }
                            if (photos.length + files.length > MAX_PHOTOS) {
                              setError(`Add up to ${MAX_PHOTOS} photos.`);
                              return;
                            }
                            const results = await Promise.all(files.map(thumbnail)).catch(
                              () => null,
                            );
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
                  <Info size={18} className="shrink-0" />
                  Sam won’t be paid early until Northwind settles this with him.
                </p>
                <div className="warehouse-actions warehouse-report-actions flex flex-col gap-12 md:flex-row-reverse md:justify-center">
                  <Button
                    icon={<PaperPlaneTilt size={17} />}
                    className="h-52 w-full justify-between md:w-fit"
                    disabled={submitting.current}
                    onClick={() => confirm(true)}
                  >
                    Send report
                  </Button>
                  <Button
                    variant="quiet"
                    className="w-full justify-center md:w-fit"
                    onClick={() => go("W2.3")}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-16">
                <Panel title="Shipment #1041" className="warehouse-shipment" gap={4}>
                  <div>
                    <KeyValue label="From" value="Northwind, Eastport" />
                    <KeyValue label="Driver" value="Sam · NWF-204" />
                    <KeyValue label="Cargo" value="120 crates of coffee" />
                    <KeyValue label="Picked up" value="Today, 09:14" />
                  </div>
                </Panel>
                <Panel title="Check the goods" className="warehouse-check" gap={18}>
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
                        <span className="text-[15px] leading-18 font-medium">
                          {o.title}
                          <span className="block text-caption text-ds-muted">{o.sub}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                </Panel>
                <div className="warehouse-actions flex flex-col-reverse gap-12 md:flex-row md:justify-center">
                  {state !== "W2.5" && (
                    <Button
                      variant="quiet"
                      className="justify-center text-ds-danger"
                      onClick={() => go("W2.7")}
                    >
                      Report a problem
                    </Button>
                  )}
                  <Button
                    loading={state === "W2.5"}
                    loadingLabel="Saving your confirmation"
                    icon={allGood ? <Check size={17} weight="bold" /> : undefined}
                    className="h-52 w-full justify-between md:w-fit"
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
        {asking && (
          <ActionSheet
            className={cn("warehouse-sheet", state === "W2.10" && "warehouse-sheet-code-error")}
            stampTone={state === "W2.10" ? "error" : "soft"}
            title={
              state === "W2.2"
                ? "Allow the camera"
                : state === "W2.11"
                  ? "The camera is blocked"
                  : state === "W2.10"
                    ? "That code doesn’t match"
                    : "Type the code"
            }
            stamp={
              state === "W2.2" ? (
                <Camera size={34} />
              ) : state === "W2.11" ? (
                <CameraSlash size={34} />
              ) : state === "W2.10" ? (
                <WarningCircle size={34} />
              ) : (
                <Keyboard size={34} />
              )
            }
            onClose={() => go("W2.1")}
          >
            <p className="text-[14px] leading-20 text-ds-muted">
              {state === "W2.2"
                ? "Your phone asks next. Waybil only uses the camera to read the driver’s QR."
                : state === "W2.11"
                  ? "Turn the camera on in your settings, or type the code from the driver’s phone."
                  : state === "W2.10"
                    ? "It isn’t an arrival for Harbor Hub today. Check the code under the driver’s QR."
                    : "It’s under the QR on the driver’s phone."}
            </p>
            {["W2.9", "W2.10"].includes(state) && (
              <DeliveryCodeInput
                value={code}
                onChange={setCode}
                invalid={state === "W2.10"}
                compact
              />
            )}
            <Button
              icon={
                state === "W2.11" ? (
                  <Keyboard size={17} />
                ) : ["W2.9", "W2.10"].includes(state) ? (
                  <Check size={17} weight="bold" />
                ) : undefined
              }
              className="h-52 w-full justify-between"
              disabled={["W2.9", "W2.10"].includes(state) && code.length !== 8}
              onClick={() => {
                if (state === "W2.11") go("W2.9");
                else if (["W2.9", "W2.10"].includes(state)) checkCode(code);
                else {
                  setState("W2.1");
                  setCamera(true);
                }
              }}
            >
              {state === "W2.2" ? "Continue" : state === "W2.11" ? "Type the code" : "Confirm code"}
            </Button>
            <Button
              variant="quiet"
              className={cn(
                "w-full justify-center",
                state === "W2.2" && "warehouse-camera-fallback",
              )}
              onClick={() => {
                if (state === "W2.2") go("W2.9");
                else if (state === "W2.11") setHelp(!help);
                else go("W2.2");
              }}
            >
              {state === "W2.2"
                ? "Type code"
                : state === "W2.11"
                  ? "How to turn it on"
                  : "Scan instead"}
            </Button>
            {help && state === "W2.11" && (
              <p className="text-caption text-ds-muted">
                Open the site settings beside the address bar, allow camera access, then reload this
                page.
              </p>
            )}
          </ActionSheet>
        )}
        <p className="mt-24 text-center text-caption text-ds-muted">
          This demo uses sample data. It does not move money.
        </p>
      </RoleShell>
    </div>
  );
}
