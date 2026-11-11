import { formatUsdc, type Shipment } from "@waybil/shared";
import {
  ArrowRight,
  ArrowUUpLeft,
  ChatCircle,
  Image as ImageIcon,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { cn } from "@/lib/cn";
import type { DEFAULT_REPORT } from "@/lib/demo-delivery";
import type { ShipperState } from "../../data/fixtures";

/* The warehouse's problem report (P3.7). */
export function ReportSheet({
  shipment,
  report,
  place,
  receiver,
  back,
  go,
}: {
  shipment: Shipment;
  report: typeof DEFAULT_REPORT;
  place: string;
  receiver?: string;
  /** Where closing the report goes back to. */
  back: ShipperState;
  go: (s: ShipperState) => void;
}) {
  return (
    <ActionSheet
      title="Problem report"
      subtitle={`From ${receiver ? `${receiver} at ` : ""}${place} · Nov 12, 15:31`}
      appearance="shipment"
      wide
      className="gap-18 [&_h2]:text-[22px]"
      onClose={() => go(back)}
    >
      <div className="grid grid-cols-3 gap-8">
        {report.photos.length
          ? report.photos.map((p, i) => (
              <img
                key={p.name + i}
                src={p.src}
                alt={p.name}
                className="h-120 w-full rounded-small object-cover"
              />
            ))
          : [1, 2, 3].map((i) => (
              <span key={i} className="grid h-120 place-items-center rounded-[16px] bg-ds-canvas">
                <ImageIcon size={24} className="text-ds-muted" />
              </span>
            ))}
      </div>
      <div className="grid grid-cols-3 gap-8">
        {[
          ["Expected", shipment.qty],
          ["In good shape", report.goodQty],
          ["Damaged", shipment.qty - report.goodQty],
        ].map(([label, count]) => (
          <div key={label} className="rounded-[14px] bg-ds-canvas px-14 py-12">
            <p className="text-caption text-ds-muted">{label}</p>
            <p
              className={cn(
                "mt-2 text-[16px] font-semibold",
                label === "Damaged" && "text-ds-danger",
              )}
            >
              {count} {shipment.unit}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6">
        <p className="text-[13px] text-ds-muted">
          {receiver ? `${receiver}'s note` : "The receiver's note"}
        </p>
        <p className="text-body">&ldquo;{report.note}&rdquo;</p>
      </div>
      <DemoRecord
        title="Report recorded"
        className="rounded-[18px] px-16 py-12 [&>span:first-child]:size-32 [&>span:first-child>svg]:size-16 [&>span:nth-child(2)>span:first-child]:font-semibold"
      />
      <div className="flex flex-wrap justify-end gap-10 [&_button]:text-[15px]">
        <Button variant="quiet" onClick={() => go(back)}>
          Close
        </Button>
        {back !== "P3.9" && (
          <Button icon={<ArrowRight size={17} />} onClick={() => go("P3.8")}>
            Choose what to pay
          </Button>
        )}
      </div>
    </ActionSheet>
  );
}

/* A covered bill is settled with the team, not in the app (P3.13). */
export function TalkSheet({
  shipment,
  bill,
  onClose,
}: {
  shipment: Shipment;
  bill: string;
  onClose: () => void;
}) {
  return (
    <ActionSheet
      title="Talk to the Waybil team"
      subtitle={`They will help you settle the ${formatUsdc(BigInt(bill))} USDC for shipment #${shipment.id}.`}
      appearance="shipment"
      onClose={onClose}
    >
      <p className="flex items-start gap-10 rounded-[14px] bg-ds-canvas p-16 text-[14px] leading-[1.45] text-ds-ink-2">
        <ChatCircle size={18} className="mt-1 shrink-0 text-ds-ink" />
        Our team will message you on WhatsApp today.
      </p>
      <div className="flex justify-end [&_button]:text-[15px]">
        <Button variant="quiet" onClick={onClose}>
          Close
        </Button>
      </div>
    </ActionSheet>
  );
}

/* Cancel before pickup (P3.11). */
export function CancelSheet({
  shipment,
  driver,
  go,
  onCancel,
}: {
  shipment: Shipment;
  driver: string;
  go: (s: ShipperState) => void;
  onCancel: () => void;
}) {
  return (
    <ActionSheet
      title={`Cancel shipment #${shipment.id}?`}
      subtitle={`${driver} hasn't picked it up yet.`}
      appearance="shipment"
      onClose={() => go("P3.1")}
    >
      <div className="flex flex-col gap-10 rounded-[14px] bg-ds-canvas p-16">
        <p className="flex items-start gap-10 text-[13px] leading-[1.2] font-normal text-ds-ink-2">
          <Wallet size={16} className="shrink-0 text-ds-ink-2" />
          The {formatUsdc(BigInt(shipment.bill))} USDC goes back to your limit.
        </p>
        <p className="flex items-start gap-10 text-[13px] leading-[1.2] font-normal text-ds-ink-2">
          <ChatCircle size={16} className="shrink-0 text-ds-ink-2" />
          {driver} gets a WhatsApp message.
        </p>
        <p className="flex items-start gap-10 text-[13px] leading-[1.2] font-normal text-ds-ink-2">
          <ArrowUUpLeft size={16} className="shrink-0 text-ds-ink-2" />
          You can&apos;t undo this. You can make a new shipment anytime.
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-10 [&_button]:text-[15px]">
        <Button variant="quiet" onClick={() => go("P3.1")}>
          Keep it
        </Button>
        <Button variant="danger" icon={<X size={17} />} onClick={onCancel}>
          Cancel shipment
        </Button>
      </div>
    </ActionSheet>
  );
}
