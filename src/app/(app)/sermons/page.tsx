import type { Metadata } from "next";
import { Suspense } from "react";
import { SermonsPage } from "@/features/sermons/sermons-page";

export const metadata: Metadata = { title: "Sermons" };

export default function Page() {
  return (
    <Suspense>
      <SermonsPage />
    </Suspense>
  );
}
