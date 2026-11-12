import { Truck, Scan } from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ARRIVING_SOON, EXPECTED_ARRIVALS } from "../data/fixtures";
import { WarehouseMap } from "./WarehouseMap";

/** W1.1 and W1.2, the trucks expected today. `arriving` is W1.2, Sam is almost here. */
export function Arrivals({ arriving, onScan }: { arriving: boolean; onScan: () => void }) {
  return (
    <div className="warehouse-arrivals">
      {arriving && (
        <Panel className="warehouse-arriving ready-card bg-ds-brand">
          <p className="flex items-center gap-8 text-label">
            <Truck size={18} className="shrink-0" />
            Arriving in about 5 minutes
          </p>
          <p className="text-title">Sam, truck NWF-204</p>
          <p className="text-label text-ds-ink-2">
            #1041 from Northwind carries 120 crates of coffee.
          </p>
          <Button
            icon={<Scan size={17} />}
            className="w-full justify-between md:w-fit"
            onClick={onScan}
          >
            Scan the driver&apos;s QR
          </Button>
        </Panel>
      )}
      <Panel title="Expected today" gap={4} className="warehouse-expected">
        {EXPECTED_ARRIVALS.map(([name, meta, time], i) => (
          <div key={name} className="warehouse-arrival-row flex items-center gap-12 py-14">
            <span
              className={cn(
                "grid size-40 shrink-0 place-items-center rounded-full",
                arriving && i === 0 ? "bg-ds-brand" : "bg-ds-canvas",
              )}
            >
              <Truck size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] leading-18 font-medium">{name}</h3>
              <p className="mt-2 text-[12.5px] leading-18 text-ds-muted">{meta}</p>
            </div>
            <span className={cn("shrink-0 text-[13.5px] font-medium", i === 2 && "text-ds-muted")}>
              {arriving && i === 0 ? ARRIVING_SOON : time}
            </span>
          </div>
        ))}
      </Panel>
      <WarehouseMap arriving={arriving} />
    </div>
  );
}
