import type { Metadata } from "next";
import { VisualForm } from "@/features/brand-studio/visual-form";

export const metadata: Metadata = { title: "Brand Studio" };

export default function Page() {
  return <VisualForm />;
}
