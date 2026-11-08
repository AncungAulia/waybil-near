"use client";
import { QRCodeSVG } from "qrcode.react";

export function DeliveryQr({ code }: { code: string }) {
  return (
    <div className="mx-auto w-full max-w-300 rounded-row bg-ds-bg p-16">
      <QRCodeSVG
        value={code}
        size={268}
        marginSize={4}
        level="M"
        className="h-auto w-full"
        title="Delivery code"
      />
    </div>
  );
}
