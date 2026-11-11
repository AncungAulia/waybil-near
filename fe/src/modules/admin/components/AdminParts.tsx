import {
  Buildings,
  Hourglass,
  Pulse,
  ShieldCheck,
  Tray,
  Users,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

/* Small pieces shared by the demo screens (AdminScreen) and the live ones (LiveAdmin). */
export function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="admin-fact flex flex-wrap items-center justify-between gap-8 py-7 text-[14px] leading-17">
      <span className="text-ds-muted">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  );
}
export function AdminBadge({
  children,
  tone = "success",
  icon,
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "brand";
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-6 rounded-full px-10 py-5 text-[12px] leading-15 font-semibold",
        tone === "success"
          ? "bg-ds-check-soft text-ds-check-ink"
          : tone === "warning"
            ? "bg-ds-warning-soft text-ds-warning"
            : "bg-ds-brand-soft text-ds-brand-deep",
      )}
    >
      {icon ??
        (tone === "warning" ? (
          <WarningCircle size={14} />
        ) : tone === "brand" ? (
          <Hourglass size={14} />
        ) : (
          <ShieldCheck size={14} />
        ))}
      {children}
    </span>
  );
}
export function AdminTiles({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div
      className={cn(
        "admin-tiles grid gap-10",
        items.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="rounded-small bg-ds-canvas px-14 py-12">
          <p className="text-[12px] leading-15 text-ds-muted">{item.label}</p>
          <div className="mt-2 text-[16px] leading-20 font-medium">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
export function Empty({
  title,
  text,
  icon = "tray",
}: {
  title: string;
  text: string;
  icon?: "tray" | "company" | "activity" | "investors" | "applications";
}) {
  return (
    <div className="admin-empty grid min-h-240 place-content-center justify-items-center gap-12 text-center">
      {icon === "company" ? (
        <span className="grid size-56 place-items-center rounded-full bg-ds-canvas text-ds-muted">
          <Buildings size={24} />
        </span>
      ) : icon === "activity" ? (
        <span className="grid size-48 place-items-center rounded-full bg-ds-canvas text-ds-muted">
          <Pulse size={22} />
        </span>
      ) : icon === "investors" ? (
        <span className="grid size-48 place-items-center rounded-full bg-ds-canvas text-ds-muted">
          <Users size={22} />
        </span>
      ) : icon === "applications" ? (
        <span className="grid size-56 place-items-center rounded-full bg-ds-brand-soft text-ds-brand-deep">
          <svg
            aria-hidden="true"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 12 5 5a2 2 0 0 1 1.8-1h10.4A2 2 0 0 1 19 5l3 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" />
            <path d="M2 12h6l2 3h4l2-3h6" />
          </svg>
        </span>
      ) : (
        <Tray size={28} className="text-ds-muted" />
      )}
      <h2 className="text-heading">{title}</h2>
      <p className="mx-auto max-w-340 text-label text-ds-muted">{text}</p>
    </div>
  );
}
