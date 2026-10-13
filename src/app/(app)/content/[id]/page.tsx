import type { Metadata } from "next";
import { ContentEditor } from "@/features/content/content-editor";

export const metadata: Metadata = { title: "Edit content" };

export default async function Page({ params }: PageProps<"/content/[id]">) {
  const { id } = await params;
  return <ContentEditor id={id} />;
}
