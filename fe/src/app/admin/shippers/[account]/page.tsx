import { notFound } from "next/navigation";
import { LIVE } from "@/lib/env";
import { Admin } from "@/modules/admin/components/Admin";

const DEMO = [
  "northwind-freight.testnet",
  "blue-ridge.testnet",
  "atlas-cargo.testnet",
  "meridian-shipping.testnet",
  "coastline-freight.testnet",
];

export default async function Page({ params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  /* Live accepts any NEAR account. The demo only has its sample companies. */
  if (LIVE ? !/^[a-z0-9._-]{2,64}$/.test(account) : !DEMO.includes(account)) notFound();
  return (
    <Admin
      view="shipper"
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
