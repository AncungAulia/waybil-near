import { notFound } from "next/navigation";
import { ShipperScreen } from "@/modules/shipper/components/ShipperScreen";
import { SHIPMENTS } from "@/modules/shipper/data/fixtures";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pay?: string; approved?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const row = SHIPMENTS.find((r) => String(r.shipment.id) === id);
  const custom = /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) >= 1045;
  if (!row && id !== "1036" && !custom) notFound();
  const state =
    query.pay === "on"
      ? "P4.1"
      : query.approved === "on" || id === "1044" || custom
        ? "P3.1"
        : id === "1032"
          ? "P3.5"
          : id === "1039" || id === "1036"
            ? "P3.4"
            : "P3.2";
  return (
    <ShipperScreen
      key={id + state}
      shipmentId={Number(id)}
      initialState={state}
      initialReceipt={query.approved === "on" ? "Demo shipment approval" : undefined}
    />
  );
}
