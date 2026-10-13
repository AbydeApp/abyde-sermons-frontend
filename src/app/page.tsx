import { redirect } from "next/navigation";

/** The public website lives in a separate repository; the app starts at authentication. */
/** Signed-in users are forwarded onward by the login form. */
export default function Home() {
  redirect("/login");
}
