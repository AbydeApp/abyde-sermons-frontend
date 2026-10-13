import { api } from "./api-client";
import type { MeResponse, Session } from "@/types";
import type { ForgotValues, LoginValues, SignupValues } from "@/schemas/auth";

/** Maps GET /auth/me (and login/register) to the UI session; null when signed out. */
export function toSession(me: MeResponse): Session | null {
  if (!me.authenticated || !me.user) return null;
  return { user: { ...me.user, onboardingComplete: me.onboardingCompleted }, church: me.church };
}

function required(me: MeResponse): Session {
  const s = toSession(me);
  if (!s) throw new Error("Expected an authenticated session");
  return s;
}

export const authService = {
  me: async (signal?: AbortSignal) => toSession(await api.get<MeResponse>("/auth/me", { signal })),
  login: async (v: LoginValues) => required(await api.post<MeResponse>("/auth/login", v)),
  register: async (v: Omit<SignupValues, "confirmPassword">) =>
    required(await api.post<MeResponse>("/auth/register", v)),
  logout: () => api.post<void>("/auth/logout"),
  updateAccount: async (v: { fullName: string; email: string }) =>
    required(await api.patch<MeResponse>("/auth/me", v)),
  changePassword: (v: { current: string; next: string }) =>
    api.post<void>("/auth/change-password", { currentPassword: v.current, newPassword: v.next }),
  forgotPassword: (v: ForgotValues) => api.post<void>("/auth/forgot-password", v),
  resetPassword: (v: { password: string; token: string }) => api.post<void>("/auth/reset-password", v),
};
