import { notFound } from "next/navigation";
import { DriverScreen } from "@/modules/driver/components/DriverScreen";
import { WarehouseScreen } from "@/modules/warehouse/components/WarehouseScreen";
import { DRIVER_STATES, type DriverState } from "@/modules/driver/data/fixtures";
import { WAREHOUSE_STATES, type WarehouseState } from "@/modules/warehouse/data/fixtures";
export default async function Page({ params }: { params: Promise<{ state: string }> }) {
  if (process.env.NEXT_PUBLIC_GALLERY !== "on") notFound();
  const { state } = await params;
  if (Object.hasOwn(DRIVER_STATES, state))
    return <DriverScreen key={state} initialState={state as DriverState} preview />;
  if (Object.hasOwn(WAREHOUSE_STATES, state))
    return <WarehouseScreen key={state} initialState={state as WarehouseState} preview />;
  notFound();
}
