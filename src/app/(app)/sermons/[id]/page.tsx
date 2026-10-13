import type { Metadata } from "next";
import { Suspense } from "react";
import { SermonDetail } from "@/features/sermons/sermon-detail";

export const metadata: Metadata = { title: "Sermon" };

export default async function Page({ params }: PageProps<"/sermons/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <SermonDetail id={id} />
    </Suspense>
  );
}
