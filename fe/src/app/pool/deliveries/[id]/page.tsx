import { notFound } from "next/navigation";
import { LIVE } from "@/lib/env";
import { InvestorScreen } from "@/modules/investor/components/InvestorScreen";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  /* Live accepts any shipment id. The demo only has its four sample deliveries. */
  if (LIVE ? !/^\d+$/.test(id) : !["1041", "1043", "1039", "1032"].includes(id)) notFound();
  return <InvestorScreen initialState="I3.2" shipmentId={Number(id)} />;
}
