import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { ResetPasswordForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password" description="Make it at least 8 characters, with a letter and a number.">
      <ResetPasswordForm token={typeof token === "string" ? token : undefined} />
    </AuthShell>
  );
}
