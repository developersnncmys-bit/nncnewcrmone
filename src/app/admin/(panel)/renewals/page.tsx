import Link from "next/link";
import { sendPaymentLink } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin-ui";
import { Badge, Empty, Kpi } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { RENEWAL_TABS, renewalBuckets, type RenewalTab } from "@/lib/admin-stats";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { cycleLabel, daysLeft, fmtDate, fmtDateTime, inr, tierLabel, workspaceHost } from "@/lib/utils";

export const metadata = { title: "Renewals" };

const MAIL_LABEL: Record<string, string> = {
  reminder_7d: "7-day reminder",
  reminder_3d: "3-day reminder",
  reminder_1d: "1-day reminder",
  expired: "Expiry notice",
  locked: "Locked notice",
  payment_link: "Payment link",
  welcome: "Welcome + link",
};

export default async function RenewalsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const b = await renewalBuckets();
  const tab: RenewalTab = RENEWAL_TABS.some((t) => t.key === tabParam) ? (tabParam as RenewalTab) : b.due.length || !b.grace.length ? "due" : "grace";
  const count = (k: RenewalTab) => b[k].length;
  const sum = (k: Exclude<RenewalTab, "renewed">) => b[k].reduce((a, r) => a + r.dueTotal, 0);
  const renewedSum = b.renewed.reduce((a, r) => a + (r.payment.total || r.payment.amount), 0);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Renewals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every plan that is ending, has ended or is waiting for payment. Reminder emails with a payment link go out automatically 7, 3 and 1
          day before the end date; use “Send payment link” to follow up any time.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Due in 30 days" value={inr(sum("due"))} icon={<Icon name="CalendarDays" />} tone="amber" hint={`${count("due")} customers · incl. GST`} />
        <Kpi label="Overdue (grace + locked)" value={inr(sum("grace") + sum("lapsed"))} icon={<Icon name="Clock" />} tone="red" hint={`${count("grace") + count("lapsed")} customers`} />
        <Kpi label="First payment pending" value={inr(sum("pending"))} icon={<Icon name="CreditCard" />} tone="blue" hint={`${count("pending")} new CRMs`} />
        <Kpi label="Renewed · last 30 days" value={inr(renewedSum)} icon={<Icon name="Check" />} tone="green" hint={`${count("renewed")} renewals`} />
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
        {RENEWAL_TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/renewals?tab=${t.key}`}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${tab === t.key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${tab === t.key ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>{count(t.key)}</span>
          </Link>
        ))}
      </div>
      <p className="mt-3 mb-4 text-sm text-slate-500">{RENEWAL_TABS.find((t) => t.key === tab)?.hint}</p>

      {tab === "renewed" ? (
        b.renewed.length === 0 ? (
          <Empty title="No renewals in the last 30 days" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Customer</th>
                  <th className="th">Plan</th>
                  <th className="th">Paid on</th>
                  <th className="th">New period</th>
                  <th className="th text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {b.renewed.map(({ ws, payment }) => (
                  <tr key={String(payment._id)}>
                    <td className="td">
                      <Link href={`/admin/workspaces/${ws._id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                        {ws.companyName}
                      </Link>
                      <div className="text-xs text-slate-500">{workspaceHost(ws.subdomain)}</div>
                    </td>
                    <td className="td">
                      {tierLabel(payment.tier)} · {cycleLabel(payment.cycle)}
                    </td>
                    <td className="td">{fmtDateTime(payment.paidAt)}</td>
                    <td className="td">
                      {fmtDate(payment.periodStart)} → {fmtDate(payment.periodEnd)}
                    </td>
                    <td className="td text-right font-semibold">{inr(payment.total || payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : b[tab].length === 0 ? (
        <Empty title="Nothing here 🎉">No customers in this list right now.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Customer</th>
                <th className="th">Product</th>
                <th className="th">Next payment</th>
                <th className="th">{tab === "pending" ? "Created" : tab === "due" ? "Ends on" : "Ended on"}</th>
                <th className="th">Last email</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {b[tab].map(({ ws, owner, next, dueTotal, lastMail }) => {
                const d = daysLeft(ws.currentPeriodEnd);
                const p = PRODUCTS[ws.product as ProductKey];
                return (
                  <tr key={String(ws._id)} className="align-top hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/admin/workspaces/${ws._id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                        {ws.companyName}
                      </Link>
                      <div className="text-xs text-slate-500">{workspaceHost(ws.subdomain)}</div>
                      <div className="text-xs text-slate-500">
                        {ws.contact?.name || owner?.name} · {ws.contact?.phone || owner?.phone || owner?.email}
                      </div>
                    </td>
                    <td className="td">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${p.theme.soft}`}>{p.name}</span>
                    </td>
                    <td className="td">
                      <div className="font-semibold text-slate-900">{inr(dueTotal)}</div>
                      <div className="text-xs text-slate-500">
                        {tierLabel(next.tier)} · {cycleLabel(next.cycle)} · incl. GST
                      </div>
                      {ws.scheduledChange && <div className="text-xs text-indigo-600">plan change at renewal</div>}
                    </td>
                    <td className="td">
                      {tab === "pending" ? (
                        fmtDate(ws.createdAt)
                      ) : (
                        <>
                          {fmtDate(ws.currentPeriodEnd)}
                          <div className="mt-1">
                            {tab === "due" && <Badge tone={d <= 3 ? "red" : d <= 7 ? "amber" : "slate"}>{d} day{d === 1 ? "" : "s"} left</Badge>}
                            {tab === "grace" && <Badge tone="amber">Locks {fmtDate(ws.graceEndsAt)}</Badge>}
                            {tab === "lapsed" && <Badge tone="red">Locked · {Math.abs(d)}d ago</Badge>}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="td text-xs text-slate-500">
                      {lastMail ? (
                        <>
                          <div className="text-slate-700">{MAIL_LABEL[lastMail.type] ?? lastMail.type}</div>
                          {fmtDateTime(lastMail.at)}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="td">
                      <div className="flex max-w-xs flex-col gap-2">
                        <ActionButton action={sendPaymentLink.bind(null, String(ws._id))} className="btn btn-primary btn-sm">
                          Send payment link
                        </ActionButton>
                        <Link href={`/admin/workspaces/${ws._id}`} className="btn btn-outline btn-sm">
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
