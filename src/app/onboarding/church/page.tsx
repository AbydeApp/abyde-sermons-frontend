import type { Metadata } from "next";
import { ChurchStep } from "@/features/onboarding/church-step";
import { OnboardingShell } from "@/features/onboarding/onboarding-shell";

export const metadata: Metadata = { title: "Set up your church" };

export default function Page() {
  return (
    <OnboardingShell title="Tell us about your church" description="This shapes how Abyde Sermon writes for your ministry.">
      <ChurchStep />
    </OnboardingShell>
  );
}
