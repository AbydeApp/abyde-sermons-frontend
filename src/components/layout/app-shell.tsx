"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { homeFor, useSession, useUnauthorizedRedirect } from "@/hooks/use-session";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

const COLLAPSE_KEY = "abyde-sermon:sidebar-collapsed";
const listeners = new Set<() => void>();
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending, error, refetch } = useSession();
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  useUnauthorizedRedirect();

  // Client-side redirect is a UX convenience only; the API enforces authorization.
  const home = isPending ? null : homeFor(session);
  useEffect(() => {
    if (home && home !== "/dashboard") router.replace(home);
  }, [home, router]);

  function toggle() {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
    } catch {
      /* preference is optional */
    }
    listeners.forEach((l) => l());
  }

  if (error) return <ErrorState error={error} onRetry={() => refetch()} className="min-h-dvh justify-center" />;
  if (isPending || !session || home !== "/dashboard") {
    return (
      <div className="flex min-h-dvh" role="status" aria-label="Loading">
        <div className="hidden w-60 border-r border-border p-4 lg:block">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-8 h-4 w-40" />
          <Skeleton className="mt-3 h-4 w-32" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-6 h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar session={session} collapsed={collapsed} onToggle={toggle} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header session={session} />
        <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
