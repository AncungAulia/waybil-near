import { RoleGuard } from "@/modules/onboarding/components/RoleGuard";
export default function Layout({ children }: LayoutProps<"/driver">) {
  return <RoleGuard role="driver">{children}</RoleGuard>;
}
