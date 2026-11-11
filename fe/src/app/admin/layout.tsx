import { RoleGuard } from "@/modules/onboarding/components/RoleGuard";
export default function Layout({ children }: LayoutProps<"/admin">) {
  return <RoleGuard role="admin">{children}</RoleGuard>;
}
