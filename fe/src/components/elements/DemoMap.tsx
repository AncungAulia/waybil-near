import { Truck, Warehouse } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

/** The design's fictional geography. Real maps require location data from the backend. */
export function DemoMap({
  label = "Sharing location",
  className,
  twoTrucks = false,
}: {
  label?: string;
  className?: string;
  twoTrucks?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={`Demo route from Eastport to Harbor Hub. ${label}.`}
      className={cn("relative h-290 overflow-hidden rounded-[24px] bg-ds-surface-3", className)}
    >
      <img
        src="/illustrations/demo-map.svg"
        alt=""
        className="absolute h-full w-full object-cover object-left"
      />
      <svg
        viewBox="0 0 900 520"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <path
          d="M 85 470 Q 120 340 180 265 T 300 65"
          fill="none"
          stroke="var(--color-ds-bg)"
          strokeWidth="14"
        />
        <path
          d="M 85 470 Q 120 340 180 265 T 300 65"
          fill="none"
          stroke="var(--color-ds-brand)"
          strokeWidth="7"
        />
      </svg>
      <span className="absolute top-16 left-16 z-10 flex items-center gap-8 rounded-full bg-ds-bg px-12 py-8 text-caption">
        <span className="size-8 rounded-full bg-ds-success" />
        {label}
      </span>
      <span className="absolute top-[43%] left-[28%] grid size-44 place-items-center rounded-full border-3 border-ds-bg bg-ds-ink text-ds-brand ring-12 ring-ds-brand/30">
        <Truck size={20} />
      </span>
      {twoTrucks && (
        <span className="absolute top-[70%] left-[65%] grid size-40 place-items-center rounded-full border-3 border-ds-bg bg-ds-ink text-ds-brand">
          <Truck size={18} />
        </span>
      )}
      <span className="absolute top-[12%] left-[65%] grid size-32 place-items-center rounded-small border-3 border-ds-bg bg-ds-ink text-ds-bg">
        <Warehouse size={16} />
      </span>
      <span className="absolute right-12 bottom-8 text-[10px] text-ds-muted">
        Demo map · © OpenStreetMap
      </span>
    </div>
  );
}
