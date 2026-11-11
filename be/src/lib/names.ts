import type { Application, Profile } from "@waybil/shared";
import type { Store } from "../types/db";

/**
 * The name other people see for an account. A shipper signs in with a wallet and has no
 * profile name, so their newest application that was not rejected gives the company name.
 * Everyone else uses the name on their profile. Empty when neither has one.
 */
export async function displayName(store: Store, accountId: string): Promise<string> {
  const company = (await store.list<Application>("applications", { shipperId: accountId }))
    .filter((row) => row.value.state !== "rejected")
    .sort((a, b) => b.value.createdAt.localeCompare(a.value.createdAt))[0]?.value.company.name;
  if (company) return company;
  return (await store.get<Profile>("profiles", accountId))?.value.name ?? "";
}
