"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleShell } from "@/components/layout/RoleShell";
import { BackLink } from "@/components/elements/BackLink";
import { useDemoDelivery } from "@/hooks/useDemoDelivery";
import { confirmDemoDelivery, DEMO_CODE, readDemoDelivery } from "@/lib/demo-delivery";
import { cn } from "@/lib/cn";
import {
  DEFAULT_GOOD_QTY,
  DEFAULT_REASONS,
  DEFAULT_REPORT_NOTE,
  MISMATCHED_CODE,
  PARTIAL_CODE,
  WAREHOUSE_FIXTURES,
  type WarehouseState,
} from "../data/fixtures";
import { Arrivals } from "./Arrivals";
import { CheckGoods } from "./CheckGoods";
import { History, NothingYet } from "./History";
import { ReportForm, type ReportPhoto } from "./ReportForm";
import { ScanSheet, ScanView } from "./ScanFlow";
import { ScanResult, scanResult } from "./ScanResult";
import "./warehouse.css";

export function WarehouseScreen({
  initialState = "W1.1",
  preview = false,
}: {
  initialState?: WarehouseState;
  preview?: boolean;
}) {
  const [state, setState] = useState<WarehouseState>(initialState);
  const [code, setCode] = useState(
    initialState === "W2.10" ? MISMATCHED_CODE : initialState === "W2.9" ? PARTIAL_CODE : "",
  );
  const [camera, setCamera] = useState(false);
  const [torch, setTorch] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [allGood, setAllGood] = useState(true);
  const [reasons, setReasons] = useState(DEFAULT_REASONS);
  const [qty, setQty] = useState(DEFAULT_GOOD_QTY);
  const [note, setNote] = useState(DEFAULT_REPORT_NOTE);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const submitting = useRef(false);
  const router = useRouter();
  const delivery = useDemoDelivery();
  /* A rescan after a problem report must not say the driver was paid. */
  const reported = !preview && (delivery === "reported" || delivery === "settled");
  const shipment = WAREHOUSE_FIXTURES[state];
  const go = (next: WarehouseState) => {
    setError("");
    if (next !== "W2.1") {
      setCamera(false);
      setTorch(false);
    }
    setState(next);
  };
  const home = () => {
    if (preview) go("W1.1");
    else router.push("/warehouse");
  };
  const scan = () => {
    if (preview) go("W2.2");
    else router.push("/warehouse/scan");
  };
  const checkCode = (raw: string) => {
    const normalized = raw.replace(/\s/g, "").toUpperCase();
    if (normalized !== DEMO_CODE) {
      go("W2.10");
      return;
    }
    if (!preview && readDemoDelivery() !== "road") {
      go("W2.12");
      return;
    }
    go("W2.3");
  };
  const confirm = async (report = false) => {
    if (submitting.current) return;
    if (
      report &&
      (!/^\d+$/.test(qty) ||
        Number(qty) < 0 ||
        Number(qty) > shipment.qty ||
        !reasons.length ||
        !note.trim())
    ) {
      setError("Enter a count from 0 to 120, choose a problem and add a note.");
      return;
    }
    submitting.current = true;
    if (!report) go("W2.5");
    try {
      // Fixture transport. Authentication and the signed relayer replace this boundary later.
      if (!preview) {
        const changed = confirmDemoDelivery(
          report ? "reported" : "paid",
          report ? { goodQty: Number(qty), reasons, note, photos } : undefined,
        );
        if (!changed) {
          go("W2.12");
          return;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
      go(report ? "W2.8" : "W2.6");
    } catch {
      go(report ? "W2.7" : "W2.3");
      setError("Your confirmation was not saved. Please try again.");
    } finally {
      submitting.current = false;
    }
  };
  const current = state.startsWith("W1")
    ? "/warehouse"
    : state.startsWith("W3")
      ? "/warehouse/history"
      : "/warehouse/scan";
  const detail = state.startsWith("W2");
  /* The board keeps the scanner on screen and lays a dialog over it for these. */
  const scanning = ["W2.1", "W2.2", "W2.9", "W2.10", "W2.11"].includes(state);
  const asking = scanning && state !== "W2.1";
  const narrow = detail && !scanning;
  const title = state.startsWith("W1")
    ? state === "W1.3"
      ? "Arrivals"
      : "Good afternoon, Lena"
    : state.startsWith("W3")
      ? "History"
      : state === "W2.7"
        ? "Report a problem"
        : ["W2.3", "W2.5"].includes(state)
          ? "Confirm delivery"
          : "Scan a delivery";
  const result = scanResult(state, qty, reported, delivery);

  return (
    <div className="warehouse-ui" data-state={state}>
      <RoleShell role="warehouse" current={current} detail={detail}>
        {result ? (
          <ScanResult
            state={state}
            result={result}
            reported={reported}
            onHome={home}
            onScanAgain={() => go("W2.2")}
          />
        ) : (
          <div
            className={cn(
              "warehouse-content",
              asking && "warehouse-asking",
              narrow && "mx-auto w-full max-w-560",
            )}
          >
            {detail && !scanning && (
              <BackLink onClick={state === "W2.7" ? () => go("W2.3") : home} className="mb-20">
                {state === "W2.7" ? "Confirm delivery" : "Arrivals"}
              </BackLink>
            )}
            <h1 className="text-title md:text-amount">{title}</h1>
            {!asking && (
              <p className="warehouse-subtitle mt-6 mb-24 text-[14px] leading-17 text-ds-muted">
                {state.startsWith("W1")
                  ? state === "W1.3"
                    ? "Harbor Hub"
                    : "3 trucks expected at Harbor Hub today"
                  : state.startsWith("W3")
                    ? "Everything received at Harbor Hub"
                    : state === "W2.7"
                      ? "Shipment #1041 · Sam"
                      : ["W2.3", "W2.5"].includes(state)
                        ? "From Sam's phone · just now"
                        : "Scan the driver's QR"}
              </p>
            )}

            {state === "W1.3" || state === "W3.2" ? (
              <NothingYet history={state === "W3.2"} />
            ) : state.startsWith("W1") ? (
              <Arrivals arriving={state === "W1.2"} onScan={scan} />
            ) : state === "W3.1" ? (
              <History />
            ) : scanning ? (
              <ScanView
                state={state}
                preview={preview}
                asking={asking}
                camera={camera}
                setCamera={setCamera}
                torch={torch}
                setTorch={setTorch}
                torchAvailable={torchAvailable}
                setTorchAvailable={setTorchAvailable}
                code={code}
                setCode={setCode}
                checkCode={checkCode}
                onClose={home}
                go={go}
              />
            ) : state === "W2.7" ? (
              <ReportForm
                reasons={reasons}
                setReasons={setReasons}
                qty={qty}
                setQty={setQty}
                note={note}
                setNote={setNote}
                photos={photos}
                setPhotos={setPhotos}
                setError={setError}
                submitting={submitting.current}
                onSend={() => confirm(true)}
                onCancel={() => go("W2.3")}
              />
            ) : (
              <CheckGoods
                saving={state === "W2.5"}
                allGood={allGood}
                setAllGood={setAllGood}
                onConfirm={() => confirm()}
                onReport={() => go("W2.7")}
              />
            )}
            {error && (
              <p role="alert" className="mt-12 text-label text-ds-danger">
                {error}
              </p>
            )}
          </div>
        )}
        {asking && (
          <ScanSheet
            state={state}
            code={code}
            setCode={setCode}
            help={help}
            setHelp={setHelp}
            checkCode={checkCode}
            onAllowCamera={() => {
              setState("W2.1");
              setCamera(true);
            }}
            go={go}
          />
        )}
        <p className="mt-24 text-center text-caption text-ds-muted">
          This demo uses sample data. It does not move money.
        </p>
      </RoleShell>
    </div>
  );
}
