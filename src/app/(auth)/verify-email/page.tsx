import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { VerifyEmailForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Check your email"
      description="Enter the code we sent you to finish creating your account."
      footer={
        <>
          Wrong email?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Start again
          </Link>
        </>
      }
    >
      <VerifyEmailForm />
    </AuthShell>
  );
}
