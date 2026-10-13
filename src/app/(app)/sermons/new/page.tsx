import type { Metadata } from "next";
import { NewSermonPage } from "@/features/sermons/new-sermon-page";

export const metadata: Metadata = { title: "New sermon" };

export default function Page() {
  return <NewSermonPage />;
}
