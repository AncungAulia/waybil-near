import { Package, WarningCircle } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Stat } from "@/components/elements/Stat";
import { cn } from "@/lib/cn";
import { HISTORY } from "../data/fixtures";

/** W3.1, everything received at Harbor Hub. */
export function History() {
  return (
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
        {HISTORY.map(([id, from, driver, cargo, status, time]) => (
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
                {status === "Confirmed" ? <Package size={17} /> : <WarningCircle size={17} />}
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
  );
}

/** W1.3 and W3.2, nothing expected today or nothing received yet. */
export function NothingYet({ history }: { history: boolean }) {
  return (
    <Panel className="warehouse-empty items-center justify-center text-center">
      {history ? (
        <Package size={26} className="text-ds-muted" />
      ) : (
        <img
          src="/illustrations/warehouse/empty.svg"
          alt=""
          className="h-210 w-280 rounded-row object-contain"
        />
      )}
      <h2 className="text-heading">
        {history ? "Nothing received yet" : "No trucks expected today"}
      </h2>
      <p className="max-w-400 text-body text-ds-muted">
        {history
          ? "Deliveries you confirm or report show up here."
          : "When a shipment to Harbor Hub is approved, it shows up here with the driver's name and arrival time."}
      </p>
    </Panel>
  );
}
