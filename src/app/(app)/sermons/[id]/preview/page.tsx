import type { Metadata } from "next";
import { Suspense } from "react";
import { WeekPreview } from "@/features/sermons/week-preview";

export const metadata: Metadata = { title: "Preview your week" };

export default async function Page({ params }: PageProps<"/sermons/[id]/preview">) {
  const { id } = await params;
  return <Suspense><WeekPreview sermonId={id} /></Suspense>;
}
