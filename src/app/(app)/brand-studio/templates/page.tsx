import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Templates · Brand Studio" };

export default function Page() {
  redirect("/brand-studio");
}
