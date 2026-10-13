import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Set up your church" };

export default function Page() {
  redirect("/brand-studio");
}
