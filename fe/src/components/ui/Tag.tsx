import { cn } from "@/lib/cn";

/**
 * A small grey label for what something is, such as "Driver" or "Pickup point". Use it next
 * to a name instead of joining the two with a middle dot.
 */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-ds-canvas px-8 py-2 text-[12px] leading-[1.4] font-medium text-ds-ink-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A name followed by its Tag, wrapping onto a new line when space runs out. */
export function NameTag({
  name,
  tag,
  bold = false,
  className,
}: {
  name: React.ReactNode;
  tag: React.ReactNode;
  bold?: boolean;
  className?: string;
}) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-8 gap-y-2", className)}>
      <span className={cn("text-label break-words", bold && "font-semibold")}>{name}</span>
      <Tag>{tag}</Tag>
    </p>
  );
}
