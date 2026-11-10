import { ShipperScreen } from "@/modules/shipper/components/ShipperScreen";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const query = await searchParams;
  return (
    <ShipperScreen
      initialState="P6.1"
      initialReceipt={
        query.cancelled &&
        Number.isSafeInteger(Number(query.cancelled)) &&
        (Number(query.cancelled) === 1044 || Number(query.cancelled) >= 1045)
          ? "Demo cancellation receipt"
          : undefined
      }
    />
  );
}
