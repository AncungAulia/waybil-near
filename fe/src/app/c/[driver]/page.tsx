import { notFound, redirect } from "next/navigation";

/** The local sample driver link opens the existing network preview. Registration is pending. */
export default async function Page({ params }: { params: Promise<{ driver: string }> }) {
  const { driver } = await params;
  if (driver !== "sam") notFound();
  redirect("/shipper/network");
}
