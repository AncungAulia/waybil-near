import { LIVE } from "@/lib/env";
import { OnboardingScreen } from "@/modules/onboarding/components/OnboardingScreen";
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  /* Live reads the invite from the backend and picks F1, F2, F4 or F5 itself. */
  const state = LIVE
    ? "A5"
    : code === "demo-driver"
      ? "F1"
      : code === "demo-warehouse"
        ? "F5"
        : "F4";
  return <OnboardingScreen initialState={state} inviteCode={code} />;
}
