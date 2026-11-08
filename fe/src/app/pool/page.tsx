import { InvestorScreen } from "@/modules/investor/components/InvestorScreen";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ deposit?: string }>;
}) {
  const { deposit } = await searchParams;
  return <InvestorScreen initialState={deposit === "on" ? "I2.1" : "I1.1"} />;
}
