import { cn } from "@/lib/cn";

/*
 * Avatar from design/waybil.pen → Atom/Avatar and the States board.
 * 40 px round, grey with the person's initials. The active one is brand yellow.
 * The board's note: "Avatars fall back to initials, then to an icon."
 */

export function Avatar({
  name,
  active = false,
  className,
}: {
  /** The person's full name, for example "Sam Carter". Only the initials are shown. */
  name: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      title={name}
      className={cn(
        "grid size-40 shrink-0 place-items-center rounded-full text-[14px] font-semibold text-ds-ink",
        active ? "bg-ds-brand" : "bg-ds-surface-3",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** The avatar's place while the person is still loading. */
export function AvatarSkeleton({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("size-40 shrink-0 rounded-full bg-ds-canvas", className)} />
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
