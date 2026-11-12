import {
  ChatCircle,
  ClockCountdown,
  MapPin,
  Package,
  PaperPlaneTilt,
  Warning,
  Wrench,
} from "@phosphor-icons/react";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { Switch } from "@/components/elements/Switch";
import type { DemoReport } from "@/lib/demo-delivery";
import { cn } from "@/lib/cn";
import type { DriverState } from "../data/fixtures";

/** The sheets over the trip screen. K2.2 pickup, K2.3 location, K2.10 report, K2.12 problem. */
export function TripSheet({
  state,
  preview,
  westfield,
  shipmentId,
  report,
  reportBack,
  go,
  pickup,
  loaded,
  setLoaded,
  shareLocation,
  setShareLocation,
  reason,
  setReason,
  note,
  setNote,
}: {
  state: DriverState;
  preview: boolean;
  westfield: boolean;
  shipmentId: number;
  report: DemoReport;
  reportBack: DriverState;
  go: (s: DriverState) => void;
  pickup: () => void;
  loaded: boolean;
  setLoaded: (loaded: boolean) => void;
  shareLocation: boolean;
  setShareLocation: (share: boolean) => void;
  reason: string;
  setReason: (reason: string) => void;
  note: string;
  setNote: (note: string) => void;
}) {
  return (
    <ActionSheet
      wide={state === "K2.10"}
      stamp={state === "K2.3" ? <MapPin size={34} /> : undefined}
      title={
        state === "K2.2"
          ? "Confirm pickup"
          : state === "K2.3"
            ? "Allow location while driving"
            : state === "K2.10"
              ? "Problem report"
              : "What happened?"
      }
      onClose={() => go(state === "K2.10" ? reportBack : state === "K2.12" ? "K2.4" : "K2.1")}
      preview={preview}
    >
      {state === "K2.2" ? (
        <>
          <label className="flex items-center gap-12 rounded-row bg-ds-canvas p-16 text-label">
            <input
              type="checkbox"
              checked={loaded}
              onChange={(e) => setLoaded(e.target.checked)}
              className="size-20 shrink-0 accent-ds-ink"
            />
            All {westfield ? "60 boxes of oil" : "120 crates of coffee"} are loaded
          </label>
          <div className="flex items-center gap-12 rounded-row bg-ds-canvas p-16">
            <span className="text-label">
              Share my location during this trip
              <span className="mt-4 block text-caption text-ds-muted">
                Northwind sees where the truck is. Stops when you arrive.
              </span>
            </span>
            <Switch
              checked={shareLocation}
              onChange={setShareLocation}
              label="Share my location during this trip"
              className="ml-auto"
            />
          </div>
          <Button
            icon={<Package size={17} />}
            className="w-full justify-between"
            disabled={!loaded}
            onClick={pickup}
          >
            Confirm pickup
          </Button>
        </>
      ) : state === "K2.3" ? (
        <>
          <p className="text-body text-ds-muted">
            Your phone will ask next. Waybil only uses your location while a trip is on the road,
            and only Northwind can see it.
          </p>
          <Button
            className="w-full justify-between"
            onClick={() => {
              if (preview) {
                go("K2.4");
                return;
              }
              navigator.geolocation?.getCurrentPosition(
                () => go("K2.4"),
                () => go("K2.4"),
                { timeout: 10000 },
              );
              if (!navigator.geolocation) go("K2.4");
            }}
          >
            Continue
          </Button>
          <Button variant="quiet" className="w-full justify-center" onClick={() => go("K2.4")}>
            Not now
          </Button>
        </>
      ) : state === "K2.10" ? (
        <>
          <p className="text-caption text-ds-muted">Sent by Lena at Harbor Hub on Nov 12, 15:31.</p>
          <div className="grid grid-cols-3 gap-8">
            {report.photos.length
              ? report.photos.map((photo, i) => (
                  <img
                    key={photo.name + i}
                    src={photo.src}
                    alt={photo.name}
                    className="h-120 w-full rounded-small object-cover"
                  />
                ))
              : [1, 2, 3].map((n) => (
                  <span
                    key={n}
                    aria-label={`Demo report photo ${n}`}
                    className="grid h-120 place-items-center rounded-small bg-ds-canvas"
                  >
                    <Package size={32} className="text-ds-muted" />
                  </span>
                ))}
          </div>
          <div className="grid grid-cols-3 gap-8">
            {[
              ["Expected", 120],
              ["In good shape", report.goodQty],
              ["Damaged", 120 - report.goodQty],
            ].map(([label, count]) => (
              <div key={label} className="rounded-small bg-ds-canvas p-12">
                <p className="text-caption text-ds-muted">{label}</p>
                <p className={cn("mt-4 text-label", label === "Damaged" && "text-ds-danger")}>
                  {count} crates
                </p>
              </div>
            ))}
          </div>
          <p className="text-label">Lena&apos;s note</p>
          <p className="text-body">{report.note}</p>
          <DemoRecord title="Demo report receipt" />
          <Button variant="quiet" onClick={() => go(reportBack)}>
            Close
          </Button>
        </>
      ) : (
        <>
          <p className="text-caption text-ds-muted">Northwind gets a message right away.</p>
          {/* One reason at a time, so these are radios: arrows move and pick, Tab leaves. */}
          <fieldset className="flex flex-col gap-8">
            <legend className="sr-only">What is the problem?</legend>
            {[
              { label: "Running late", icon: <ClockCountdown size={18} /> },
              { label: "Truck broke down", icon: <Wrench size={18} /> },
              { label: "Accident", icon: <Warning size={18} /> },
              { label: "Something else", icon: <ChatCircle size={18} /> },
            ].map((r) => (
              <label
                key={r.label}
                className={cn(
                  "tap relative flex cursor-pointer items-center gap-12 rounded-small p-14 text-left text-body has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ds-ink",
                  r.label === reason ? "bg-ds-brand-soft" : "bg-ds-canvas hover:bg-ds-canvas-hover",
                )}
              >
                <input
                  type="radio"
                  name="problem"
                  className="sr-only"
                  checked={r.label === reason}
                  onChange={() => setReason(r.label)}
                />
                <span className="shrink-0">{r.icon}</span>
                {r.label}
              </label>
            ))}
          </fieldset>
          <label className="text-label">
            What happened
            <textarea
              className="focus-ring mt-8 min-h-100 w-full resize-y rounded-small bg-ds-canvas p-16 text-body"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <ButtonLink
            icon={<PaperPlaneTilt size={17} />}
            className="justify-between"
            href={`https://wa.me/?text=${encodeURIComponent(`Shipment #${shipmentId}. ${reason}. ${note}`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Send to Northwind
          </ButtonLink>
        </>
      )}
    </ActionSheet>
  );
}
