import { notFound } from "next/navigation";
import { InvestorScreen } from "@/modules/investor/components/InvestorScreen";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!["1041", "1043", "1039", "1032"].includes(id)) notFound();
  return <InvestorScreen initialState="I3.2" shipmentId={Number(id)} />;
}
