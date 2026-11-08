import { notFound } from "next/navigation";
import { AdminScreen } from "@/modules/admin/components/AdminScreen";
export default async function Page({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  if (
    ![
      "northwind-freight.testnet",
      "blue-ridge.testnet",
      "atlas-cargo.testnet",
      "meridian-shipping.testnet",
      "coastline-freight.testnet",
    ].includes(account)
  )
    notFound();
  return (
    <AdminScreen
      account={account}
      initialState={
        ["northwind-freight.testnet", "blue-ridge.testnet", "atlas-cargo.testnet"].includes(account)
          ? "M2.7"
          : account === "coastline-freight.testnet"
            ? "M2.10"
            : "M2.3"
      }
    />
  );
}
