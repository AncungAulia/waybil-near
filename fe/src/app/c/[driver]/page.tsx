import { notFound, redirect } from "next/navigation";
import { LIVE } from "@/lib/env";

/**
 * A driver's share link. Live, it opens the company's network with this driver ready to add.
 * The demo only has Sam's sample link.
 */
export default async function Page({ params }: { params: Promise<{ driver: string }> }) {
  const { driver } = await params;
  if (LIVE) {
    if (!/^[a-z0-9._-]{2,64}$/.test(driver)) notFound();
    redirect(`/shipper/network?driver=${encodeURIComponent(driver)}`);
  }
  if (driver !== "sam") notFound();
  redirect("/shipper/network");
}
