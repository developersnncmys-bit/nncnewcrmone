import Link from "next/link";
import { adminLogoutAction } from "@/app/actions/auth";
import { AdminSideNav } from "@/components/client-bits";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/SiteHeader";
import { requireAdmin } from "@/lib/auth";
import { navCounts } from "@/lib/admin-stats";

export const metadata = { title: { default: "Admin", template: "%s · NNC CRM Admin" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireAdmin();
  const counts = await navCounts();
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-navy p-4 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
        <div className="mb-7 px-2 pt-1">
          <Logo dark sub="Admin console" />
        </div>
        <AdminSideNav
          sections={[
            {
              title: "Overview",
              items: [
                { href: "/admin", label: "Dashboard", icon: "LayoutDashboard", exact: true },
                { href: "/admin/renewals", label: "Renewals", icon: "Bell", badge: counts.renewals, tone: "red" },
              ],
            },
            {
              title: "Customers",
              items: [
                { href: "/admin/workspaces", label: "All customers", icon: "Building2" },
                { href: "/admin/workspaces/new", label: "New customer", icon: "Sparkles" },
                { href: "/admin/payments", label: "Payments & invoices", icon: "CreditCard" },
              ],
            },
            {
              title: "Sales",
              items: [{ href: "/admin/leads", label: "Leads", icon: "Inbox", badge: counts.newLeads }],
            },
            {
              title: "System",
              items: [
                { href: "/admin/emails", label: "Email log", icon: "Mail" },
                { href: "/admin/settings", label: "Settings", icon: "Settings" },
              ],
            },
          ]}
        />
        <div className="mt-auto hidden md:block">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-green to-brand-teal text-sm font-bold text-white">
                {s.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{s.name}</div>
                <div className="truncate text-xs text-slate-400">{s.email}</div>
              </div>
              <form action={adminLogoutAction}>
                <button title="Log out" className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                  <Icon name="LogOut" size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <form action="/admin/search" className="relative w-full max-w-md">
            <Icon name="Search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
            <input name="q" placeholder="Search customers, domains, leads, invoices…" className="input pl-9" />
          </form>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-500 lg:inline">{today}</span>
            <Link href="/admin/renewals" className="btn btn-ghost relative" title="Renewals">
              <Icon name="Bell" size={18} />
              {counts.renewals > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {counts.renewals}
                </span>
              )}
            </Link>
            <Link href="/admin/workspaces/new" className="btn btn-primary">
              + New customer
            </Link>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
