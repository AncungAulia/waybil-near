import { Avatar } from "@/components/elements/Avatar";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

/*
 * Mobile header from design/waybil.pen → Organism/MobileHeader and the States board.
 * The logo on the left, the person's role and their avatar on the right.
 */

export function MobileHeader({
  /** The person's role in plain words, for example "Driver". */
  role,
  name,
  className,
}: {
  role: string;
  name: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex w-full items-center justify-between rounded-[22px] bg-ds-bg px-16 py-12",
        className,
      )}
    >
      <Logo />
      <div className="flex items-center gap-8">
        <span className="rounded-full bg-ds-canvas px-12 py-6 text-caption font-medium text-ds-ink">
          {role}
        </span>
        <Avatar name={name} className="size-36 text-caption" />
      </div>
    </header>
  );
}
