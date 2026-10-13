import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentPage } from "@/features/content/content-page";

export const metadata: Metadata = { title: "Content" };

export default function Page() {
  return (
    <Suspense>
      <ContentPage />
    </Suspense>
  );
}
