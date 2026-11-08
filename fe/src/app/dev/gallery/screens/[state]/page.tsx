import { ShipperScreen } from "@/modules/shipper/components/ShipperScreen";
import { SHIPPER_STATES, type ShipperState } from "@/modules/shipper/data/fixtures";
import { InvestorScreen } from "@/modules/investor/components/InvestorScreen";
import { INVESTOR_STATES, type InvestorState } from "@/modules/investor/data/fixtures";
import { AdminScreen } from "@/modules/admin/components/AdminScreen";
import { ADMIN_STATES, type AdminState } from "@/modules/admin/data/fixtures";
import { notFound } from "next/navigation";
import { DriverScreen } from "@/modules/driver/components/DriverScreen";
import { WarehouseScreen } from "@/modules/warehouse/components/WarehouseScreen";
import { DRIVER_STATES, type DriverState } from "@/modules/driver/data/fixtures";
import { WAREHOUSE_STATES, type WarehouseState } from "@/modules/warehouse/data/fixtures";
export default async function Page({ params }: { params: Promise<{ state: string }> }) {
  if (process.env.NEXT_PUBLIC_GALLERY !== "on") notFound();
  const { state } = await params;
  if (Object.hasOwn(SHIPPER_STATES, state))
    return <ShipperScreen key={state} initialState={state as ShipperState} preview />;
  if (Object.hasOwn(INVESTOR_STATES, state))
    return <InvestorScreen key={state} initialState={state as InvestorState} preview />;
  if (Object.hasOwn(ADMIN_STATES, state))
    return <AdminScreen key={state} initialState={state as AdminState} preview />;

  if (Object.hasOwn(DRIVER_STATES, state))
    return <DriverScreen key={state} initialState={state as DriverState} preview />;
  if (Object.hasOwn(WAREHOUSE_STATES, state))
    return <WarehouseScreen key={state} initialState={state as WarehouseState} preview />;
  notFound();
}
