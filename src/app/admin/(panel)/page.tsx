import Link from "next/link";
import { runBillingNow } from "@/app/actions/admin";
import { BarList, ColumnChart } from "@/components/charts";
import { Icon } from "@/components/Icon";
import { Badge, Kpi, Notice, Panel } from "@/components/ui";
import { renewalBuckets } from "@/lib/admin-stats";
import { LEADS, PAYMENTS, WORKSPACES, byNewest, wsById } from "@/lib/demo-data";
import { PLANS } from "@/lib/plans";
import { PRODUCTS, isProductKey, productList, type ProductKey } from "@/lib/products";
import { CYCLE_LIST, cycleLabel, cycleMonths, daysLeft, fmtDate, fmtDateTime, inr, tierLabel } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const paid = PAYMENTS.filter((p) => p.status === "paid");
  const wsAll = WORKSPACES;
  const recentPays = [...paid]
    .sort((a, b) => +b.paidAt! - +a.paidAt!)
    .slice(0, 6)
    .map((p) => ({ ...p, workspace: wsById(p.workspace) }));
  const recentLeads = byNewest(LEADS).slice(0, 6);
  const buckets = renewalBuckets();
  const allTime = paid.reduce((a, p) => a + p.amount, 0);

  // ---- revenue (before GST) ----
  const monthVal = (y: number, m: number) =>
    paid.filter((p) => p.paidAt!.getFullYear() === y && p.paidAt!.getMonth() + 1 === m).reduce((a, p) => a + p.amount, 0);
  const series = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const v = monthVal(d.getFullYear(), d.getMonth() + 1);
    return { label: MONTHS[d.getMonth()], value: v, sub: `${MONTHS[d.getMonth()]} ${d.getFullYear()} · before GST` };
  });
  const thisMonth = monthVal(monthStart.getFullYear(), monthStart.getMonth() + 1);
  const lastMonth = monthVal(lastMonthStart.getFullYear(), lastMonthStart.getMonth() + 1);
  const delta = lastMonth ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;
  const yearTotal = series.reduce((a, s) => a + s.value, 0);

  // ---- customers / subscriptions ----
  const st = (k: string) => wsAll.filter((w) => w.status === k).length;
  const paying = wsAll.filter((w) => w.status === "active" || w.status === "grace");
  const mrr = paying.reduce((a, w) => a + w.plan.price / cycleMonths(w.plan.cycle), 0);
  const dueAmount = buckets.due.reduce((a, r) => a + r.dueTotal, 0);
  const overdueAmount = [...buckets.grace, ...buckets.lapsed].reduce((a, r) => a + r.dueTotal, 0);
  const pendingAmount = buckets.pending.reduce((a, r) => a + r.dueTotal, 0);
  const leadN = (k: string) => LEADS.filter((l) => l.status === k).length;
  const leadTotal = LEADS.length;

  const upcoming = [...buckets.grace, ...buckets.due].slice(0, 7);

  return (
    <>
      {job && <Notice tone="green">Reminder job finished: {job}</Notice>}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Revenue, subscriptions and renewals across Travel CRM, Sales CRM and HRMS.</p>
        </div>
        <form action={runBillingNow}>
          <button className="btn btn-outline">
            <Icon name="Bell" size={16} /> Run renewal reminders now
          </button>
        </form>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Revenue this month" value={inr(thisMonth)} icon={<Icon name="TrendingUp" />} tone="green" delta={delta} hint="vs last month · before GST" />
        <Kpi label="Monthly recurring revenue" value={inr(Math.round(mrr))} icon={<Icon name="Wallet" />} tone="indigo" hint={`ARR ${inr(Math.round(mrr * 12))}`} />
        <Kpi label="Active customers" value={st("active") + st("grace")} icon={<Icon name="Building2" />} tone="blue" hint={`${wsAll.length} customers in total`} />
        <Kpi label="Renewals due · 30 days" value={inr(dueAmount)} icon={<Icon name="CalendarDays" />} tone="amber" hint={`${buckets.due.length} customer${buckets.due.length === 1 ? "" : "s"} · incl. GST`} />
      </div>

      {/* Needs attention */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/admin/renewals?tab=grace", label: "Expired · in grace", n: buckets.grace.length, amt: buckets.grace.reduce((a, r) => a + r.dueTotal, 0), cls: "border-l-amber-500", icon: "Clock" },
          { href: "/admin/renewals?tab=lapsed", label: "Lapsed · locked", n: buckets.lapsed.length, amt: buckets.lapsed.reduce((a, r) => a + r.dueTotal, 0), cls: "border-l-rose-500", icon: "Lock" },
          { href: "/admin/renewals?tab=pending", label: "First payment pending", n: buckets.pending.length, amt: pendingAmount, cls: "border-l-sky-500", icon: "CreditCard" },
          { href: "/admin/leads?status=new", label: "New leads to call", n: leadN("new"), amt: null, cls: "border-l-indigo-500", icon: "Inbox" },
        ].map((t) => (
          <Link key={t.label} href={t.href} className={`card flex items-center gap-4 border-l-4 p-4 hover:shadow-md ${t.cls}`}>
            <Icon name={t.icon} className="text-slate-400" />
            <div className="flex-1">
              <div className="text-sm text-slate-500">{t.label}</div>
              <div className="text-lg font-semibold text-slate-900">
                {t.n}
                {t.amt != null && t.amt > 0 && <span className="ml-2 text-sm font-normal text-slate-500">{inr(t.amt)}</span>}
              </div>
            </div>
            <Icon name="ArrowRight" size={16} className="text-slate-300" />
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel
          title="Revenue · last 12 months"
          className="xl:col-span-2"
          action={<span className="text-sm text-slate-500">{inr(yearTotal)} total · before GST</span>}
        >
          <ColumnChart data={series} />
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
            <span>All-time revenue: <b className="text-slate-700">{inr(allTime)}</b></span>
            <span>Overdue renewals: <b className="text-slate-700">{inr(overdueAmount)}</b></span>
          </div>
        </Panel>

        <Panel title="Upcoming & expired renewals" action={<Link href="/admin/renewals" className="text-sm text-indigo-600">View all</Link>}>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">No renewals due in the next 30 days.</p>
          ) : (
            <ul className="-my-2 divide-y divide-slate-100">
              {upcoming.map(({ ws, dueTotal }) => {
                const end = ws.status === "grace" ? ws.graceEndsAt : ws.currentPeriodEnd;
                const d = daysLeft(ws.currentPeriodEnd);
                return (
                  <li key={String(ws._id)} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/admin/workspaces/${ws._id}`} className="block truncate text-sm font-medium text-slate-900 hover:text-indigo-600">
                        {ws.companyName}
                      </Link>
                      <div className="truncate text-xs text-slate-500">
                        {PRODUCTS[ws.product as ProductKey].short} · {tierLabel(ws.plan.tier)} {cycleLabel(ws.plan.cycle)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={ws.status === "grace" ? "red" : d <= 7 ? "amber" : "slate"}>
                        {ws.status === "grace" ? `Expired ${Math.abs(d)}d ago` : `${d}d left`}
                      </Badge>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {inr(dueTotal)} · {fmtDate(end)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Customers by product">
          <BarList rows={productList().map((p) => ({ label: p.name, value: wsAll.filter((w) => w.product === p.key).length }))} />
        </Panel>
        <Panel title="Active plans">
          <BarList
            rows={PLANS.flatMap((p) =>
              CYCLE_LIST.map((c) => ({
                label: `${p.name} · ${c.label}`,
                value: paying.filter((w) => w.plan.tier === p.tier && w.plan.cycle === c.key).length,
              })),
            ).filter((r) => r.value > 0)}
          />
          {paying.length === 0 && <p className="text-sm text-slate-500">No paying customers yet.</p>}
        </Panel>
        <Panel title="Lead funnel" action={<span className="text-sm text-slate-500">{leadTotal} leads</span>}>
          <BarList
            rows={[
              { label: "New", value: leadN("new") },
              { label: "Contacted", value: leadN("contacted") },
              { label: "CRM created", value: leadN("signed_up") },
              { label: "Converted (paid)", value: leadN("converted") },
              { label: "Lost", value: leadN("lost") },
            ]}
          />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Recent payments" action={<Link href="/admin/payments" className="text-sm text-indigo-600">View all</Link>}>
          {recentPays.length === 0 ? (
            <p className="text-sm text-slate-500">No payments yet.</p>
          ) : (
            <ul className="-my-2 divide-y divide-slate-100">
              {recentPays.map((p) => (
                <li key={String(p._id)} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">{p.workspace?.companyName}</div>
                    <div className="text-xs text-slate-500">
                      {fmtDateTime(p.paidAt)} · {p.kind === "new" ? "New" : p.kind === "renewal" ? "Renewal" : "Plan change"} · {tierLabel(p.tier)} {cycleLabel(p.cycle)}
                    </div>
                  </div>
                  <div className="shrink-0 font-semibold text-slate-900 tabular-nums">{inr(p.total || p.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Latest leads" action={<Link href="/admin/leads" className="text-sm text-indigo-600">View all</Link>}>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-slate-500">No leads yet.</p>
          ) : (
            <ul className="-my-2 divide-y divide-slate-100">
              {recentLeads.map((l) => (
                <li key={String(l._id)} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">
                      {l.name} {l.company && <span className="font-normal text-slate-500">· {l.company}</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      {isProductKey(l.product) ? PRODUCTS[l.product as ProductKey].name : "Product not chosen"} · {fmtDateTime(l.createdAt)}
                    </div>
                  </div>
                  {l.workspace ? (
                    <Link href={`/admin/workspaces/${l.workspace}`} className="shrink-0">
                      <Badge tone={l.status === "converted" ? "green" : "blue"}>{l.status === "converted" ? "Paid customer" : "CRM created"}</Badge>
                    </Link>
                  ) : (
                    <Link href={`/admin/workspaces/new?lead=${l._id}`} className="btn btn-outline btn-sm shrink-0">
                      Create CRM
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
