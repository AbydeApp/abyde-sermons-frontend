import type { Metadata } from "next";
import { VisualEditor } from "@/features/visual/visual-editor";

export const metadata: Metadata = { title: "Create visual" };

export default async function Page({ params }: PageProps<"/content/[id]/visual">) {
  const { id } = await params;
  return <VisualEditor id={id} />;
}
