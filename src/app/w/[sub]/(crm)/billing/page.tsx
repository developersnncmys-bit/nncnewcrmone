import Link from "next/link";
import { payForWorkspace, scheduleChange } from "@/app/actions/checkout";
import { Badge, Notice, PageHeader, WorkspaceStatus } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { GRACE_DAYS, renewalPlanFor } from "@/lib/billing";
import { Payment } from "@/lib/models";
import { getPlans } from "@/lib/plans";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { CYCLE_LIST, GST_RATE, cycleLabel, cyclePer, daysLeft, fmtDate, inr, tierLabel, workspaceHost } from "@/lib/utils";
import { canManage, getWorkspaceAccess, wsBase } from "@/lib/workspace";

export const metadata = { title: "Billing" };

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ sub: string }>;
  searchParams: Promise<{ scheduled?: string }>;
}) {
  const { sub } = await params;
  const { scheduled } = await searchParams;
  const s = await requireUser();
  const { ws, role } = await getWorkspaceAccess(sub, s);
  const base = await wsBase(sub);
  const manage = canManage(role);
  const p = PRODUCTS[ws.product as ProductKey];
  const plans = await getPlans(ws.product as ProductKey);
  const renewal = await renewalPlanFor(ws);
  const payments = await Payment.find({ workspace: ws._id }).sort({ createdAt: -1 }).lean();
  const unpaid = payments.find((x) => x.status === "created");
  // Never paid yet (pending, trial, or a trial that ended and got locked)
  const isNew = ws.status === "pending" || ws.status === "trial" || !ws.currentPeriodStart;

  const end = ws.status === "trial" ? ws.trialEndsAt : ws.currentPeriodEnd;
  const rows: [string, React.ReactNode][] = [
    ["Product", p.name],
    ["Domain", workspaceHost(ws.subdomain)],
    ["Status", <WorkspaceStatus key="s" status={ws.status} />],
    ["Plan", `${tierLabel(ws.plan.tier)} · ${cycleLabel(ws.plan.cycle)} · ${inr(ws.plan.price)}`],
  ];
  if (ws.status === "trial") rows.push(["Trial ends", `${fmtDate(ws.trialEndsAt)} (${Math.max(0, daysLeft(ws.trialEndsAt))} days left)`]);
  if (ws.currentPeriodStart && ws.status !== "trial")
    rows.push(["Current period", `${fmtDate(ws.currentPeriodStart)} → ${fmtDate(ws.currentPeriodEnd)}`]);
  if (ws.status === "active") rows.push(["Next renewal", `${fmtDate(end)} (${Math.max(0, daysLeft(end))} days)`]);
  if (ws.status === "grace") rows.push(["Access until", `${fmtDate(ws.graceEndsAt)} (grace period)`]);

  return (
    <>
      {scheduled && <Notice tone="green">Plan change saved. It will apply from your next renewal.</Notice>}
      <PageHeader title="Billing & subscription" subtitle="Your plan, renewal date, billing term and invoices." />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="card p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Current subscription</h2>
          <dl className="divide-y divide-slate-100 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
          {ws.scheduledChange && (
            <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
              From next renewal: <b>{tierLabel(ws.scheduledChange.tier)} · {cycleLabel(ws.scheduledChange.cycle)}</b> ({inr(renewal.amount)})
            </p>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Reminder emails are sent 7, 3 and 1 day before renewal. If a renewal is missed you get a {GRACE_DAYS}-day grace period
            before access is paused. Your data is never deleted.
          </p>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold text-slate-900">{isNew ? "Activate your plan" : "Renew"}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {isNew
              ? `Pay for ${tierLabel(renewal.tier)} · ${cycleLabel(renewal.cycle)} to activate.`
              : ws.status === "active"
                ? "Renew early — the new period starts after your current one ends, so you lose no days."
                : "Renew to restore full access immediately."}
          </p>
          <div className="mt-4 text-3xl font-bold text-slate-900">{inr(renewal.amount)}</div>
          <div className="text-sm text-slate-500">
            {tierLabel(renewal.tier)} · {cycleLabel(renewal.cycle)} {cyclePer(renewal.cycle)} + {GST_RATE}% GST
          </div>
          {manage ? (
            <div className="mt-5 space-y-2">
              {unpaid && ws.status === "pending" ? (
                <Link href={`/pay/${unpaid._id}`} className="btn btn-primary w-full">
                  Complete pending payment
                </Link>
              ) : (
                <form action={payForWorkspace.bind(null, sub)}>
                  <input type="hidden" name="mode" value="renew" />
                  <button className="btn btn-primary w-full">{isNew ? "Pay & activate" : "Renew now"}</button>
                </form>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Ask your workspace owner to renew.</p>
          )}
        </section>
      </div>

      {manage && (
        <section className="card mt-6 p-6">
          <h2 className="font-semibold text-slate-900">Change plan or billing term (quarterly / half yearly / yearly)</h2>
          <p className="mt-1 text-xs text-slate-500">Prices are before {GST_RATE}% GST.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Plan</th>
                  <th className="th">Users</th>
                  {CYCLE_LIST.map((c) => (
                    <th key={c.key} className="th">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map((pl) => (
                  <tr key={pl.tier}>
                    <td className="td font-medium">
                      {pl.name} {pl.tier === ws.plan.tier && <Badge tone="indigo">current</Badge>}
                    </td>
                    <td className="td">{pl.maxUsers}</td>
                    {CYCLE_LIST.map((c) => (
                      <td key={c.key} className="td">
                        {pl.prices?.[c.key] ? inr(pl.prices[c.key]) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className="mt-5 flex flex-wrap items-end gap-3">
            <div>
              <label className="label">Plan</label>
              <select name="tier" defaultValue={renewal.tier} className="input">
                {plans.map((pl) => (
                  <option key={pl.tier} value={pl.tier}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Billing</label>
              <select name="cycle" defaultValue={renewal.cycle} className="input">
                {CYCLE_LIST.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <input type="hidden" name="mode" value="change" />
            {!isNew && (
              <button formAction={scheduleChange.bind(null, sub)} className="btn btn-outline">
                Apply from next renewal
              </button>
            )}
            <button formAction={payForWorkspace.bind(null, sub)} className="btn btn-primary">
              {isNew ? "Pay & activate this plan" : "Pay now & start today"}
            </button>
          </form>
          {!isNew && (
            <p className="mt-2 text-xs text-slate-500">
              “Apply from next renewal” changes what you pay next time. “Pay now” starts a fresh period today.
            </p>
          )}
        </section>
      )}

      <section className="card mt-6">
        <h2 className="p-6 pb-3 font-semibold text-slate-900">Payment history & invoices</h2>
        {payments.filter((x) => x.status === "paid").length === 0 ? (
          <p className="px-6 pb-6 text-sm text-slate-500">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Invoice</th>
                  <th className="th">Plan</th>
                  <th className="th">Period</th>
                  <th className="th">Amount</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {payments
                  .filter((x) => x.status === "paid")
                  .map((x) => (
                    <tr key={String(x._id)}>
                      <td className="td">{fmtDate(x.paidAt)}</td>
                      <td className="td font-mono text-xs">{x.invoiceNumber}</td>
                      <td className="td">
                        {tierLabel(x.tier)} · {cycleLabel(x.cycle)}
                      </td>
                      <td className="td">
                        {fmtDate(x.periodStart)} → {fmtDate(x.periodEnd)}
                      </td>
                      <td className="td font-medium">{inr(x.amount)}</td>
                      <td className="td text-right">
                        <Link href={`${base}/billing/invoice/${x._id}`} className="btn btn-outline btn-sm">
                          Invoice
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
