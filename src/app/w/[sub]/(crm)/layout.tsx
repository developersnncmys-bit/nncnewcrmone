import Link from "next/link";
import { SideNav, type NavItem } from "@/components/client-bits";
import { Icon } from "@/components/Icon";
import { WorkspaceStatus } from "@/components/ui";
import { workspaceLogoutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { cycleLabel, daysLeft, fmtDate, tierLabel, workspaceHost } from "@/lib/utils";
import { canManage, getWorkspaceAccess, wsBase } from "@/lib/workspace";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ sub: string }>;
}) {
  const { sub } = await params;
  const s = await requireUser();
  const { ws, role } = await getWorkspaceAccess(sub, s);
  const base = await wsBase(sub);
  const p = PRODUCTS[ws.product as ProductKey];

  const items: NavItem[] = [
    { href: base, label: "Dashboard", icon: "LayoutDashboard", exact: true },
    ...p.entities.map((e) => ({ href: `${base}/m/${e.key}`, label: e.label, icon: e.icon })),
    ...(canManage(role)
      ? [
          { href: `${base}/team`, label: "Team", icon: "Users" },
          { href: `${base}/billing`, label: "Billing", icon: "CreditCard" },
        ]
      : []),
    { href: `${base}/account`, label: "My account", icon: "Settings" },
  ];

  const billing = `${base}/billing`;
  let banner: React.ReactNode = null;
  if (ws.status === "trial") {
    const d = Math.max(0, daysLeft(ws.trialEndsAt));
    banner = (
      <div className="bg-sky-50 px-6 py-2 text-sm text-sky-800">
        Free trial: <b>{d} day{d === 1 ? "" : "s"} left</b> (ends {fmtDate(ws.trialEndsAt)}).{" "}
        <Link href={billing} className="font-semibold underline">
          Choose a plan
        </Link>
      </div>
    );
  } else if (ws.status === "active" && daysLeft(ws.currentPeriodEnd) <= 7) {
    banner = (
      <div className="bg-amber-50 px-6 py-2 text-sm text-amber-800">
        Your {cycleLabel(ws.plan.cycle).toLowerCase()} plan renews on <b>{fmtDate(ws.currentPeriodEnd)}</b>.{" "}
        <Link href={billing} className="font-semibold underline">
          Renew now
        </Link>
      </div>
    );
  } else if (ws.status === "grace") {
    banner = (
      <div className="bg-amber-100 px-6 py-2 text-sm text-amber-900">
        Your subscription has expired. Renew before <b>{fmtDate(ws.graceEndsAt)}</b> to avoid losing access.{" "}
        <Link href={billing} className="font-semibold underline">
          Renew now
        </Link>
      </div>
    );
  } else if (ws.status === "locked" || ws.status === "pending") {
    banner = (
      <div className="bg-rose-50 px-6 py-2 text-sm text-rose-800">
        {ws.status === "pending" ? "Payment pending — " : "Access paused — "}
        your data is safe.{" "}
        <Link href={billing} className="font-semibold underline">
          {ws.status === "pending" ? "Complete payment" : "Renew to continue"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="no-print border-b border-slate-200 bg-white p-4 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <div className="mb-4 flex items-center gap-3 px-1">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white ${p.theme.solid}`}>
            <Icon name={p.icon} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{ws.companyName}</div>
            <div className="truncate text-xs text-slate-500">{p.name}</div>
          </div>
        </div>
        <SideNav items={items} accent={p.theme.soft} />
        <div className="mt-auto hidden space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500 md:block">
          <div className="flex items-center gap-1.5">
            <Icon name="Globe" size={14} /> {workspaceHost(ws.subdomain)}
          </div>
          <div className="flex items-center gap-2">
            <WorkspaceStatus status={ws.status} />
            <span>
              {tierLabel(ws.plan.tier)} · {cycleLabel(ws.plan.cycle)}
            </span>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="no-print flex h-14 items-center justify-end gap-3 border-b border-slate-200 bg-white px-6 text-sm">
          <a href={`${base}/account`} className="text-slate-700 hover:text-slate-900">
            {s.name}
          </a>
          <form action={workspaceLogoutAction.bind(null, sub)}>
            <button className="btn btn-ghost btn-sm">
              <Icon name="LogOut" size={14} /> Log out
            </button>
          </form>
        </header>
        <div className="no-print">{banner}</div>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
