import { ShipperScreen } from "@/modules/shipper/components/ShipperScreen";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const query = await searchParams;
  return (
    <ShipperScreen
      key={query.invite ?? "network"}
      initialState={
        query.invite === "driver" ? "P5.3" : query.invite === "destination" ? "P5.4" : "P5.1"
      }
    />
  );
}
