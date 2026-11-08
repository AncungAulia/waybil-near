import { notFound } from "next/navigation";
import { DriverScreen } from "@/modules/driver/components/DriverScreen";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ qr?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!["1041", "1044"].includes(id)) notFound();
  return (
    <DriverScreen
      shipmentId={Number(id)}
      initialState={query.qr === "on" ? "K2.5" : id === "1044" ? "K2.1" : "K2.4"}
    />
  );
}
