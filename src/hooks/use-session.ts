"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UNAUTHORIZED_EVENT } from "@/services/api-client";
import { authService } from "@/services/auth.service";
import type { Session } from "@/types";

export const SESSION_KEY = ["session"] as const;

export function useSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: ({ signal }) => authService.me(signal),
    staleTime: 60_000,
  });
}

/** Where a session should land, per the product's redirect rules. */
export function homeFor(session: Session | null | undefined) {
  if (!session) return "/login";
  return session.user.onboardingComplete && session.church ? "/dashboard" : "/onboarding";
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      qc.clear();
      router.replace("/login");
    },
  });
}

/** Clears cached data and returns to login when any request reports 401. */
export function useUnauthorizedRedirect() {
  const qc = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    const handler = () => {
      qc.setQueryData(SESSION_KEY, null);
      router.replace("/login");
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, [qc, router]);
}
