import Image from "next/image";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AuthForms";
import { getSession } from "@/lib/auth";
import { BRAND } from "@/lib/utils";

export const metadata = { title: "Owner login", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if ((await getSession())?.role === "superadmin") redirect("/admin");
  return (
    <main className="grid min-h-screen bg-navy lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-indigo-600 to-navy p-12 text-white lg:flex">
        <Image src="/nnc-mark.png" alt="NNC" width={56} height={56} />
        <div>
          <h1 className="text-4xl font-extrabold text-white">{BRAND} admin</h1>
          <p className="mt-4 max-w-md text-lg text-indigo-100">
            Leads, customers, domains, subscriptions, renewals and payments for Travel CRM, Sales CRM and HRMS in one place.
          </p>
        </div>
        <p className="text-sm text-indigo-200">© {new Date().getFullYear()} NNC Digital</p>
      </div>
      <div className="grid place-items-center bg-paper px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Image src="/nnc-logo.png" alt="NNC digital" width={200} height={48} priority className="h-auto w-48" />
          </div>
          <div className="card p-7">
            <h2 className="text-xl font-bold">Sign in</h2>
            <p className="mt-1 mb-6 text-sm text-slate-500">Owner access only</p>
            <AdminLoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
