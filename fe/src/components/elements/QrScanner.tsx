"use client";
import { useEffect, useRef, useState } from "react";
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
  /*
   * What the person sees under the frame. It changes when nothing reads for a while, and the
   * frame turns green for a moment when a code reads.
   */
  const [hint, setHint] = useState<"point" | "closer" | "type" | "read">("point");
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
    /* Reads the whole frame, then the middle of it enlarged, which helps with a small QR. */
    const read = (v: HTMLVideoElement) => {
      if (!context) return null;
      const width = 800;
      const height = Math.round((width * v.videoHeight) / v.videoWidth);
      canvas.width = width;
      canvas.height = height;
      context.drawImage(v, 0, 0, width, height);
      const whole = context.getImageData(0, 0, width, height);
      const found = jsQR(whole.data, width, height, { inversionAttempts: "attemptBoth" });
      if (found) return found.data;
      const side = Math.min(v.videoWidth, v.videoHeight) * 0.6;
      canvas.width = 600;
      canvas.height = 600;
      context.drawImage(
        v,
        (v.videoWidth - side) / 2,
        (v.videoHeight - side) / 2,
        side,
        side,
        0,
        0,
        600,
        600,
      );
      const middle = context.getImageData(0, 0, 600, 600);
      return jsQR(middle.data, 600, 600, { inversionAttempts: "attemptBoth" })?.data ?? null;
    };
    let started = Date.now();
    let last = { value: "", at: 0 };
    let shown: ReturnType<typeof setTimeout> | undefined;
    const scan = () => {
      if (cancelled) return;
      const v = video.current;
      if (v && v.readyState >= 2 && v.videoWidth) {
        const value = read(v);
        const now = Date.now();
        /* The same code again within 3 seconds is the same scan. Keep watching for others. */
        if (value && (value !== last.value || now - last.at > 3000)) {
          last = { value, at: now };
          started = now;
          setHint("read");
          clearTimeout(shown);
          shown = setTimeout(() => !cancelled && setHint("point"), 1500);
          callbacks.current.onCode(value);
        } else if (!value) {
          const waited = now - started;
          setHint((h) =>
            h === "read" ? h : waited > 10000 ? "type" : waited > 5000 ? "closer" : "point",
          );
        }
      }
      timer = setTimeout(scan, 200);
    };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
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
      clearTimeout(shown);
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
      <div
        className={cn(
          "pointer-events-none relative size-260 transition-colors duration-200",
          hint === "read" ? "text-ds-success" : "text-ds-brand",
        )}
        aria-hidden
      >
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
        {hint !== "read" && (
          <span className="qr-scan-line absolute inset-x-14 top-1/2 h-2 rounded-full bg-ds-brand shadow-[0_0_12px_3px_rgb(255_214_10/0.55)]" />
        )}
      </div>
      <p aria-live="polite" className="absolute right-16 bottom-24 left-16 text-center text-label">
        {hint === "read"
          ? "Code read."
          : hint === "closer"
            ? "Hold it closer and keep it still."
            : hint === "type"
              ? "Still can’t read it? Type the code below."
              : "Point at the QR on the driver’s phone."}
      </p>
    </div>
  );
}
