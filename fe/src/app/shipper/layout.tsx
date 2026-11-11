import { RoleGuard } from "@/modules/onboarding/components/RoleGuard";
export default function Layout({ children }: LayoutProps<"/shipper">) {
  return <RoleGuard role="shipper">{children}</RoleGuard>;
}
