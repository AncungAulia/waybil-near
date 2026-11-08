"use client";
import { OnboardingScreen } from "@/modules/onboarding/components/OnboardingScreen";
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return <OnboardingScreen initialState="X2" onRetry={retry} />;
}
