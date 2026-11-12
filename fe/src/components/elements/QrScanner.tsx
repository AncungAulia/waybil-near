"use client";
import { useEffect, useRef } from "react";
import jsQR from "jsqr";
import { cn } from "@/lib/cn";

export function QrScanner({
  active,
  onCode,
  onBlocked,
  className,
  torch = false,
  onTorchAvailable,
}: {
  active: boolean;
  onCode: (code: string) => void;
  onBlocked: () => void;
  className?: string;
  torch?: boolean;
  onTorchAvailable?: (available: boolean) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const cameraTrack = useRef<MediaStreamTrack | undefined>(undefined);
  const callbacks = useRef({ onCode, onBlocked, onTorchAvailable });
  useEffect(() => {
    callbacks.current = { onCode, onBlocked, onTorchAvailable };
  }, [onCode, onBlocked, onTorchAvailable]);
  useEffect(() => {
    const track = cameraTrack.current;
    if (
      track &&
      (track.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined)
        ?.torch
    ) {
      void track
        .applyConstraints({ advanced: [{ torch } as MediaTrackConstraintSet] })
        .catch(() => callbacks.current.onTorchAvailable?.(false));
    }
  }, [torch]);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const scan = () => {
      if (cancelled) return;
      const v = video.current;
      if (v && v.readyState >= 2 && context) {
        canvas.width = 640;
        canvas.height = Math.round((640 * v.videoHeight) / v.videoWidth);
        context.drawImage(v, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(pixels.data, pixels.width, pixels.height);
        if (code) {
          callbacks.current.onCode(code.data);
          return;
        }
      }
      timer = setTimeout(scan, 250);
    };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 640 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (video.current) {
          cameraTrack.current = stream.getVideoTracks()[0];
          callbacks.current.onTorchAvailable?.(
            Boolean(
              (
                cameraTrack.current?.getCapabilities?.() as
                  (MediaTrackCapabilities & { torch?: boolean }) | undefined
              )?.torch,
            ),
          );
          video.current.srcObject = stream;
          await video.current.play();
          scan();
        }
      } catch {
        if (!cancelled) callbacks.current.onBlocked();
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      cameraTrack.current = undefined;
      callbacks.current.onTorchAvailable?.(false);
    };
  }, [active]);
  return (
    <div
      className={cn(
        "relative grid min-h-360 place-items-center overflow-hidden rounded-card bg-ds-ink text-ds-bg",
        className,
      )}
    >
      {active ? (
        <video
          ref={video}
          muted
          playsInline
          aria-label="Camera preview"
          className="absolute size-full object-cover"
        />
      ) : null}
      <div className="pointer-events-none relative size-260 text-ds-brand" aria-hidden>
        <svg viewBox="0 0 260 260" className="absolute inset-0 size-full">
          <path
            d="M 4 32 V 4 H 32 M 228 4 H 256 V 32 M 256 228 V 256 H 228 M 32 256 H 4 V 228"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
        {/* The scan line sweeps the frame like a real scanner. It rests in the middle with reduced motion. */}
        <span className="qr-scan-line absolute inset-x-14 top-1/2 h-2 rounded-full bg-ds-brand shadow-[0_0_12px_3px_rgb(255_214_10/0.55)]" />
      </div>
      <p className="absolute right-16 bottom-24 left-16 text-center text-label">
        Point at the QR on the driver&apos;s phone
      </p>
    </div>
  );
}
