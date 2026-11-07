import { redirect } from "next/navigation";

// The app's main screen is the owner's admin panel (UI-only demo, starts at the login screen).
export default function Home() {
  redirect("/admin/login");
}
