import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// The app's main screen is the owner's admin panel. Customers use their own
// CRM domain (abc.nnccrm.com/login), never this root page.
export default async function Home() {
  const s = await getSession();
  redirect(s?.role === "superadmin" ? "/admin" : "/admin/login");
}
