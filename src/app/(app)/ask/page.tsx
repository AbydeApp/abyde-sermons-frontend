import type { Metadata } from "next";
import { AskPage } from "@/features/ask-ministry/ask-page";

export const metadata: Metadata = { title: "Ask Abyde Sermon" };

export default function Page() {
  return <AskPage />;
}
