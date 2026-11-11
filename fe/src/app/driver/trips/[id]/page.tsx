import { notFound } from "next/navigation";
import { LIVE } from "@/lib/env";
import { Driver } from "@/modules/driver/components/Driver";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ qr?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  /* Live accepts any of the driver's trips. The demo only has #1041 and #1044. */
  if (LIVE ? !/^\d+$/.test(id) : !["1041", "1044"].includes(id)) notFound();
  return (
    <Driver
      view="trip"
      shipmentId={Number(id)}
      initialState={query.qr === "on" ? "K2.5" : id === "1044" ? "K2.1" : "K2.4"}
    />
  );
}
