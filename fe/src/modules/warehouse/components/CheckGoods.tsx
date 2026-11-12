import { Check } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { KeyValue } from "@/components/elements/KeyValue";
import { cn } from "@/lib/cn";

/** W2.3 and W2.5, Lena checks the goods and confirms. `saving` is W2.5. */
export function CheckGoods({
  saving,
  allGood,
  setAllGood,
  onConfirm,
  onReport,
}: {
  saving: boolean;
  allGood: boolean;
  setAllGood: (allGood: boolean) => void;
  onConfirm: () => void;
  onReport: () => void;
}) {
  return (
    <div className="flex flex-col gap-16">
      <Panel title="Shipment #1041" className="warehouse-shipment" gap={4}>
        <div>
          <KeyValue label="From" value="Northwind, Eastport" />
          <KeyValue label="Driver" value="Sam, truck NWF-204" />
          <KeyValue label="Cargo" value="120 crates of coffee" />
          <KeyValue label="Picked up" value="Today, 09:14" />
        </div>
      </Panel>
      <Panel title="Check the goods" className="warehouse-check" gap={18}>
        <fieldset disabled={saving}>
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
        {!saving && (
          <Button variant="quiet" className="justify-center text-ds-danger" onClick={onReport}>
            Report a problem
          </Button>
        )}
        <Button
          loading={saving}
          loadingLabel="Saving your confirmation"
          icon={allGood ? <Check size={17} weight="bold" /> : undefined}
          className="h-52 w-full justify-between md:w-fit"
          onClick={() => (allGood ? onConfirm() : onReport())}
        >
          {allGood ? "Confirm full delivery" : "Report a problem"}
        </Button>
      </div>
      {saving && (
        <p role="status" className="text-center text-caption text-ds-muted">
          Takes a second. Keep this page open.
        </p>
      )}
    </div>
  );
}
