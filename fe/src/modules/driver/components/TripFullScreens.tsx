import { CircleNotch, Copy, X } from "@phosphor-icons/react";
import { Money } from "@/components/elements/Money";
import { DeliveryQr } from "@/components/elements/DeliveryQr";
import { ResultScreen } from "@/components/elements/ResultScreen";
import { BackLink } from "@/components/elements/BackLink";
import { DEMO_CODE } from "@/lib/demo-delivery";
import { DEMO_CODE_LABEL, WESTFIELD_CODE, WESTFIELD_CODE_LABEL } from "../data/fixtures";

/** K2.5, the full-screen QR Sam shows at Harbor Hub. */
export function ShowQr({
  westfield,
  shipmentId,
  onClose,
}: {
  westfield: boolean;
  shipmentId: number;
  onClose: () => void;
}) {
  const code = westfield ? WESTFIELD_CODE : DEMO_CODE;
  return (
    <div className="flex min-h-dvh flex-col gap-24 bg-ds-bg px-16 py-12 md:px-32">
      <button
        type="button"
        className="press focus-ring flex w-fit items-center gap-8 rounded-full p-8 text-body"
        onClick={onClose}
      >
        <X size={22} />
        Close
      </button>
      <div className="my-auto flex w-full flex-col items-center gap-20 text-center">
        <h1 className="text-title md:text-[30px]">Show this to Harbor Hub</h1>
        <p className="text-label text-ds-muted">They scan it to confirm the goods arrived.</p>
        <div className="w-full max-w-340">
          <DeliveryQr code={code} />
        </div>
        <div className="flex items-center gap-10 rounded-small bg-ds-canvas px-20 py-10">
          <span className="text-title tracking-[0.08em]">
            {westfield ? WESTFIELD_CODE_LABEL : DEMO_CODE_LABEL}
          </span>
          <button
            type="button"
            aria-label="Copy the code"
            className="press focus-ring relative rounded-small p-4 text-ds-muted before:absolute before:-inset-8"
            onClick={() => navigator.clipboard?.writeText(code)}
          >
            <Copy size={18} />
          </button>
        </div>
        <p className="text-label">
          Shipment #{shipmentId} · {westfield ? "60 boxes of oil" : "120 crates of coffee"}
        </p>
        <p
          role="status"
          className="flex items-center gap-8 rounded-full bg-ds-canvas px-14 py-8 text-label"
        >
          <CircleNotch size={15} className="animate-spin motion-reduce:animate-none" />
          Waiting for them to scan
        </p>
        <p className="text-caption text-ds-muted">
          Turn your screen brightness up if the scan is slow.
        </p>
      </div>
    </div>
  );
}

/** K2.8, the full-screen paid stamp. */
export function PaidScreen({
  amount,
  onBack,
  onPayouts,
}: {
  amount: string;
  onBack: () => void;
  onPayouts: () => void;
}) {
  return (
    <div className="relative min-h-dvh bg-ds-canvas px-24">
      {/* Pinned to the corner so the full-screen stamp stays centred. */}
      <BackLink onClick={onBack} className="absolute top-16 left-24 z-10">
        Back to trips
      </BackLink>
      <ResultScreen
        fullScreen
        title="You got paid"
        description="Sent to your account seconds after Lena confirmed."
        recorded="Demo payment receipt"
        action="See your payouts"
        onAction={onPayouts}
      >
        {/* Scales with the screen so "USDC" never runs off a 320 px phone. */}
        <div className="@container w-full text-center">
          <Money
            amount={amount}
            className="text-[clamp(32px,15.5cqw,56px)] leading-[1.07] font-medium tracking-[-0.03em]"
          />
        </div>
      </ResultScreen>
    </div>
  );
}
