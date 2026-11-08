import { redirect } from "next/navigation";

/** Issue #26 builds /start (sign in). Until then the root route points at the gallery. */
export default function Page() {
  redirect("/dev/gallery");
}
