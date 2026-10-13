"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingState } from "@/components/shared/states";
import { homeFor, useSession } from "@/hooks/use-session";

/** Onboarding entry: sends the user to church setup, or onward if already done. */
export default function OnboardingIndex() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  useEffect(() => {
    if (isPending) return;
    const home = homeFor(session);
    router.replace(home === "/onboarding" ? "/onboarding/church" : home);
  }, [session, isPending, router]);
  return <LoadingState className="min-h-dvh" />;
}
