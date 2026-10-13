import type { Metadata } from "next";
import { SermonsPage } from "@/features/sermons/sermons-page";

export const metadata: Metadata = { title: "Sermons" };

export default function Page() {
  return <SermonsPage />;
}
