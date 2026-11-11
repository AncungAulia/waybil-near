import { Shipper } from "@/modules/shipper/components/Shipper";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const query = await searchParams;
  return (
    <Shipper
      view="network"
      key={query.invite ?? "network"}
      initialState={
        query.invite === "driver" ? "P5.3" : query.invite === "destination" ? "P5.4" : "P5.1"
      }
    />
  );
}
