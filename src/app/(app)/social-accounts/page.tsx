import type { Metadata } from "next";
import { Suspense } from "react";
import { SocialAccountsPage } from "@/features/social/social-accounts-page";

export const metadata: Metadata = { title: "Social Accounts" };

export default function Page() {
  return (
    <Suspense>
      <SocialAccountsPage />
    </Suspense>
  );
}
