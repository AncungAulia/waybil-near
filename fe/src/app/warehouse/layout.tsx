import { RoleGuard } from "@/modules/onboarding/components/RoleGuard";
export default function Layout({ children }: LayoutProps<"/warehouse">) {
  return <RoleGuard role="warehouse">{children}</RoleGuard>;
}
