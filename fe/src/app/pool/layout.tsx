import { RoleGuard } from "@/modules/onboarding/components/RoleGuard";
export default function Layout({ children }: LayoutProps<"/pool">) {
  return <RoleGuard role="investor">{children}</RoleGuard>;
}
