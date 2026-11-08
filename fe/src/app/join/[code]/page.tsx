import { OnboardingScreen } from "@/modules/onboarding/components/OnboardingScreen";
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const state = code === "demo-driver" ? "F1" : code === "demo-warehouse" ? "F5" : "F4";
  return <OnboardingScreen initialState={state} inviteCode={code} />;
}
