import {
  Camera,
  CameraSlash,
  Check,
  Keyboard,
  Lightning,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { Panel } from "@/components/layout/Panel";
import { ActionSheet } from "@/components/layout/ActionSheet";
import { Button } from "@/components/ui/Button";
import { QrScanner } from "@/components/elements/QrScanner";
import { cn } from "@/lib/cn";
import type { WarehouseState } from "../data/fixtures";
import { DeliveryCodeInput } from "./DeliveryCodeInput";

/** W2.1 and the scanner behind the W2.2, W2.9, W2.10 and W2.11 sheets. */
export function ScanView({
  state,
  preview,
  asking,
  camera,
  setCamera,
  torch,
  setTorch,
  torchAvailable,
  setTorchAvailable,
  code,
  setCode,
  checkCode,
  onClose,
  go,
}: {
  state: WarehouseState;
  preview: boolean;
  asking: boolean;
  camera: boolean;
  setCamera: (on: boolean) => void;
  torch: boolean;
  setTorch: (on: boolean) => void;
  torchAvailable: boolean;
  setTorchAvailable: (available: boolean) => void;
  code: string;
  setCode: (code: string) => void;
  checkCode: (raw: string) => void;
  onClose: () => void;
  go: (next: WarehouseState) => void;
}) {
  return (
    <div
      className={cn(
        "warehouse-scan grid gap-16",
        !asking && "lg:grid-cols-[minmax(0,720px)_minmax(0,1fr)]",
      )}
    >
      <div
        className={cn(
          "warehouse-camera flex flex-col bg-ds-ink md:rounded-card",
          !asking && "warehouse-camera-fullscreen",
        )}
      >
        <button
          className={cn(
            "press focus-ring flex h-50 shrink-0 items-center gap-8 self-start px-20 text-[15px] text-ds-bg md:hidden",
            asking && "hidden",
          )}
          onClick={onClose}
        >
          <X size={22} /> Close
        </button>
        {!asking && (
          <button
            type="button"
            aria-label="Toggle flashlight"
            aria-pressed={torch}
            disabled={!torchAvailable}
            onClick={() => setTorch(!torch)}
            className="warehouse-torch press focus-ring absolute top-20 right-20 z-10 text-ds-bg before:absolute before:-inset-10 disabled:text-ds-muted md:hidden"
          >
            <Lightning size={22} weight={torch ? "fill" : "regular"} />
          </button>
        )}
        <QrScanner
          className="warehouse-viewfinder flex-1 rounded-none md:rounded-card"
          active={camera && !preview}
          onCode={checkCode}
          onBlocked={() => go("W2.11")}
          torch={torch}
          onTorchAvailable={setTorchAvailable}
        />
        {/* Closing the camera sheet leaves the camera off, so offer a way back on. */}
        {state === "W2.1" && !camera && !preview && (
          <Button
            variant="moment"
            icon={<Camera size={17} />}
            className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
            onClick={() => setCamera(true)}
          >
            Turn on camera
          </Button>
        )}
        <Button
          variant="quiet"
          className={cn("mx-auto my-16 h-41 bg-ds-bg/10 text-ds-bg md:hidden", asking && "hidden")}
          onClick={() => go("W2.9")}
        >
          Type code
        </Button>
      </div>
      {!asking && (
        <Panel title="Type code" gap={12} className="warehouse-type-code hidden h-fit md:flex">
          <DeliveryCodeInput value={code} onChange={setCode} />
          <p className="text-[12.5px] leading-15 text-ds-muted">
            The code has eight characters. It is under the QR on the driver&apos;s phone.
          </p>
          <Button
            className="h-52 self-start"
            disabled={code.length !== 8}
            onClick={() => checkCode(code)}
          >
            Find delivery
          </Button>
        </Panel>
      )}
    </div>
  );
}

/** The sheets over the scanner. W2.2 camera, W2.9 type code, W2.10 wrong code, W2.11 blocked. */
export function ScanSheet({
  state,
  code,
  setCode,
  help,
  setHelp,
  checkCode,
  onAllowCamera,
  go,
}: {
  state: WarehouseState;
  code: string;
  setCode: (code: string) => void;
  help: boolean;
  setHelp: (help: boolean) => void;
  checkCode: (raw: string) => void;
  onAllowCamera: () => void;
  go: (next: WarehouseState) => void;
}) {
  const typing = ["W2.9", "W2.10"].includes(state);
  return (
    <ActionSheet
      className={cn("warehouse-sheet", state === "W2.10" && "warehouse-sheet-code-error")}
      stampTone={state === "W2.10" ? "error" : "soft"}
      title={
        state === "W2.2"
          ? "Allow the camera"
          : state === "W2.11"
            ? "The camera is blocked"
            : state === "W2.10"
              ? "That code doesn’t match"
              : "Type the code"
      }
      stamp={
        state === "W2.2" ? (
          <Camera size={34} />
        ) : state === "W2.11" ? (
          <CameraSlash size={34} />
        ) : state === "W2.10" ? (
          <WarningCircle size={34} />
        ) : (
          <Keyboard size={34} />
        )
      }
      onClose={() => go("W2.1")}
    >
      <p className="text-[14px] leading-20 text-ds-muted">
        {state === "W2.2"
          ? "Your phone asks next. Waybil only uses the camera to read the driver’s QR."
          : state === "W2.11"
            ? "Turn the camera on in your settings, or type the code from the driver’s phone."
            : state === "W2.10"
              ? "It isn’t an arrival for Harbor Hub today. Check the code under the driver’s QR."
              : "It’s under the QR on the driver’s phone."}
      </p>
      {typing && (
        <DeliveryCodeInput value={code} onChange={setCode} invalid={state === "W2.10"} compact />
      )}
      <Button
        icon={
          state === "W2.11" ? (
            <Keyboard size={17} />
          ) : typing ? (
            <Check size={17} weight="bold" />
          ) : undefined
        }
        className="h-52 w-full justify-between"
        disabled={typing && code.length !== 8}
        onClick={() => {
          if (state === "W2.11") go("W2.9");
          else if (typing) checkCode(code);
          else onAllowCamera();
        }}
      >
        {state === "W2.2" ? "Continue" : state === "W2.11" ? "Type the code" : "Confirm code"}
      </Button>
      <Button
        variant="quiet"
        className={cn("w-full justify-center", state === "W2.2" && "warehouse-camera-fallback")}
        onClick={() => {
          if (state === "W2.2") go("W2.9");
          else if (state === "W2.11") setHelp(!help);
          else go("W2.2");
        }}
      >
        {state === "W2.2" ? "Type code" : state === "W2.11" ? "How to turn it on" : "Scan instead"}
      </Button>
      {help && state === "W2.11" && (
        <p className="text-caption text-ds-muted">
          Open the site settings beside the address bar, allow camera access, then reload this page.
        </p>
      )}
    </ActionSheet>
  );
}
