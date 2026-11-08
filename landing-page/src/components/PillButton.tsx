import { ArrowSwap } from "./ArrowSwap";

const styles = {
  brand: { pill: "bg-ds-brand text-ds-ink", dot: "bg-ds-ink text-ds-brand" },
  dark: { pill: "bg-ds-ink text-white", dot: "bg-white text-ds-ink" },
  light: { pill: "bg-white text-ds-ink", dot: "bg-ds-ink text-white" },
} as const;

/** The pill button from the design: a label and a round arrow that swaps on hover. */
export function PillButton({
  href,
  children,
  tone = "brand",
  className = "",
}: {
  href: string;
  children: string;
  tone?: keyof typeof styles;
  className?: string;
}) {
  const s = styles[tone];
  return (
    <a
      href={href}
      className={`press group inline-flex h-48 items-center justify-between gap-16 rounded-full py-6 pr-6 pl-20 fs-15 font-medium ${s.pill} ${className}`}
    >
      {children}
      <ArrowSwap className={s.dot} />
    </a>
  );
}
