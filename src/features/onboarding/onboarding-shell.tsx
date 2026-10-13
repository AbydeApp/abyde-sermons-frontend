"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/layout/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession, useUnauthorizedRedirect } from "@/hooks/use-session";

/** Onboarding is a single step: creating the church completes it. */
export function OnboardingShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  useUnauthorizedRedirect();

  useEffect(() => {
    if (isPending) return;
    if (!session) router.replace("/login");
    else if (session.user.onboardingComplete && session.church) router.replace("/dashboard");
  }, [session, isPending, router]);

  return (
    <div className="min-h-dvh">
      <header className="flex h-14 items-center border-b border-border px-5 sm:px-10">
        <Logo href="/onboarding" />
      </header>
      <main id="main" className="mx-auto w-full max-w-xl px-5 py-12 sm:py-16">
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
        <div className="mt-8">
          {isPending || !session ? (
            <div role="status" aria-label="Loading" className="space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-2/3" />
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
