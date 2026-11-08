import { CheckCircle, Warning, CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

/*
 * Proof tag from design/waybil.pen → Tag/Floating and the States board.
 * A white pill with a thin line, saying whether the record was checked.
 * The board's note: "Tags reflect proof status."
 */

type Proof = "verified" | "verifying" | "mismatch";

const TAG: Record<Proof, { label: string; icon: typeof CheckCircle; tone: string }> = {
  verified: { label: "Proof verified", icon: CheckCircle, tone: "text-ds-success" },
  verifying: { label: "Verifying", icon: CircleNotch, tone: "text-ds-muted" },
  mismatch: { label: "Proof mismatch", icon: Warning, tone: "text-ds-danger" },
};

export function ProofTag({ state, className }: { state: Proof; className?: string }) {
  const { label, icon: Icon, tone } = TAG[state];
  const bad = state === "mismatch";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-6 rounded-full border bg-ds-bg px-14 py-7 text-label font-medium",
        bad ? "border-ds-danger text-ds-danger" : "border-ds-line text-ds-ink",
        className,
      )}
    >
      <Icon
        size={15}
        /* The spinner needs its notch, so only the two solid icons are filled. */
        weight={state === "verifying" ? "bold" : "fill"}
        className={cn(tone, state === "verifying" && "animate-spin motion-reduce:animate-none")}
      />
      {label}
    </span>
  );
}
