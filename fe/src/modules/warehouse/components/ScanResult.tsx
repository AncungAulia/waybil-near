import Link from "next/link";
import { PaperPlaneTilt, Scan, SealCheck, WarningCircle, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { DemoRecord } from "@/components/elements/DemoRecord";
import { BackLink } from "@/components/elements/BackLink";
import type { DemoDelivery } from "@/lib/demo-delivery";
import { cn } from "@/lib/cn";
import type { WarehouseState } from "../data/fixtures";

interface Result {
  title: string;
  description: string;
  recorded: string | undefined;
}

/** The result screens W2.4, W2.6, W2.8 and W2.12, or null for any other state. */
export function scanResult(
  state: WarehouseState,
  qty: string,
  reported: boolean,
  delivery: DemoDelivery,
): Result | null {
  return state === "W2.6"
    ? {
        title: "Delivery confirmed",
        description: "120 crates from Northwind are in. Sam is getting paid right now.",
        recorded: "Demo confirmation receipt",
      }
    : state === "W2.8"
      ? {
          title: "Report sent",
          description: `Northwind and Sam can see your report. The ${qty} good crates and the ${120 - Number(qty)} damaged ones are recorded.`,
          recorded: "Demo report receipt",
        }
      : state === "W2.12"
        ? reported
          ? {
              title: "Already reported",
              description:
                delivery === "settled"
                  ? "A problem was already reported for shipment #1041, and Northwind has settled it with Sam. There’s nothing else to do."
                  : "A problem was already reported for shipment #1041. Sam gets paid after Northwind chooses what to pay. There’s nothing else to do.",
              recorded: undefined,
            }
          : {
              title: "Already confirmed",
              description:
                "Lena confirmed shipment #1041 today at 15:36. Sam is already paid. There’s nothing else to do.",
              recorded: undefined,
            }
        : state === "W2.4"
          ? {
              title: "Not for this warehouse",
              description:
                "Shipment #1052 goes to Riverton branch, not Harbor Hub. Ask the driver to check the address.",
              recorded: undefined,
            }
          : null;
}

export function ScanResult({
  state,
  result,
  reported,
  onHome,
  onScanAgain,
}: {
  state: WarehouseState;
  result: Result;
  reported: boolean;
  onHome: () => void;
  onScanAgain: () => void;
}) {
  return (
    <>
      <section className="warehouse-result relative">
        {/* Pinned to the corner so the result stays centred. */}
        <BackLink onClick={onHome} className="absolute top-0 left-0 z-10">
          Back to arrivals
        </BackLink>
        <div className="warehouse-result-body">
          {state === "W2.6" ? (
            <img
              src="/illustrations/warehouse/confirmed.svg"
              alt=""
              className="h-210 w-280 rounded-row"
            />
          ) : (
            <span
              className={cn(
                "grid size-80 place-items-center rounded-full",
                state === "W2.4"
                  ? "bg-ds-danger-result text-ds-danger"
                  : state === "W2.12"
                    ? reported
                      ? "bg-ds-brand-soft text-ds-brand-deep"
                      : "bg-ds-success-soft text-ds-success"
                    : "bg-ds-brand-soft text-ds-brand-deep",
              )}
            >
              {state === "W2.4" ? (
                <XCircle size={34} />
              ) : state === "W2.12" ? (
                reported ? (
                  <WarningCircle size={34} />
                ) : (
                  <SealCheck size={34} />
                )
              ) : (
                <PaperPlaneTilt size={34} />
              )}
            </span>
          )}
          <h1>{result.title}</h1>
          <p className="text-[14px] leading-20 text-ds-muted">{result.description}</p>
          {result.recorded && (
            <div className="warehouse-receipt">
              <DemoRecord title={result.recorded} />
            </div>
          )}
          {(state === "W2.4" || state === "W2.12") && (
            <div className="warehouse-result-actions">
              {state === "W2.4" && (
                <Button icon={<Scan size={17} />} className="h-52 w-full" onClick={onScanAgain}>
                  Scan another QR
                </Button>
              )}
              {state === "W2.12" && (
                <Link
                  href="/warehouse/history"
                  className="tap focus-ring grid h-48 place-items-center rounded-full bg-ds-canvas text-[14px] hover:bg-ds-canvas-hover"
                >
                  See it in history
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
