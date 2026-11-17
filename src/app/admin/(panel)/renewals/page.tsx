import Link from "next/link";
import { sendPaymentLink } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin-ui";
import { Modal } from "@/components/client-bits";
import { Badge, DetailList, Empty, Kpi, WorkspaceStatus, whatsappLink } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { RENEWAL_TABS, renewalBuckets, type RenewalTab } from "@/lib/admin-stats";
import { renewalPlanFor } from "@/lib/billing";
import { EMAILS, ownerOf, paymentsOf, wsById } from "@/lib/demo-data";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { cycleLabel, daysLeft, fmtDate, fmtDateTime, inr, tierLabel, withGst, workspaceHost } from "@/lib/utils";

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

export default async function RenewalsPage({ searchParams }: { searchParams: Promise<{ tab?: string; view?: string }> }) {
  const { tab: tabParam, view } = await searchParams;
  const b = await renewalBuckets();
  const tab: RenewalTab = RENEWAL_TABS.some((t) => t.key === tabParam) ? (tabParam as RenewalTab) : b.due.length || !b.grace.length ? "due" : "grace";
  const count = (k: RenewalTab) => b[k].length;
  const sum = (k: Exclude<RenewalTab, "renewed">) => b[k].reduce((a, r) => a + r.dueTotal, 0);
  const renewedSum = b.renewed.reduce((a, r) => a + (r.payment.total || r.payment.amount), 0);
  // Popup: ?view=<customer id> opens it; closing stays on the same tab.
  const viewHref = (id?: string) => `/admin/renewals?tab=${tab}${id ? `&view=${id}` : ""}`;
  const vw = view ? wsById(view) : null;

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
                      <Link href={viewHref(String(ws._id))} scroll={false} title="View details" className="font-medium text-slate-900 hover:text-indigo-600 hover:underline">
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
                      <Link href={viewHref(String(ws._id))} scroll={false} title="View details" className="font-medium text-slate-900 hover:text-indigo-600 hover:underline">
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
                        <Link href={viewHref(String(ws._id))} scroll={false} className="btn btn-outline btn-sm">
                          Details
                        </Link>
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
      {vw &&
        (() => {
          const owner = ownerOf(vw);
          const p = PRODUCTS[vw.product as ProductKey];
          const next = renewalPlanFor(vw);
          const g = withGst(next.amount);
          const pays = paymentsOf(vw._id).slice(0, 4);
          const mails = EMAILS.filter((m) => m.workspace === vw._id).slice(0, 4);
          const phone = vw.contact.phone || owner?.phone || "";
          const email = vw.contact.email || owner?.email || "";
          const end = vw.status === "grace" ? vw.graceEndsAt : vw.currentPeriodEnd;
          const d = daysLeft(vw.currentPeriodEnd);
          return (
            <Modal
              closeHref={viewHref()}
              title={vw.companyName}
              subtitle={
                <span className="flex flex-wrap items-center gap-2">
                  {p.name} · {workspaceHost(vw.subdomain)} <WorkspaceStatus status={vw.status} />
                </span>
              }
              footer={
                <>
                  <Link href={viewHref()} scroll={false} className="btn btn-outline">
                    Close
                  </Link>
                  <Link href={`/admin/workspaces/${vw._id}`} className="btn btn-outline">
                    Manage customer
                  </Link>
                </>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-indigo-50/70 p-4">
                  <div className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">Next payment</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{inr(g.total)}</div>
                  <div className="text-xs text-slate-600">
                    {tierLabel(next.tier)} · {cycleLabel(next.cycle)} · {inr(next.amount)} + {inr(g.gst)} GST
                  </div>
                  {vw.scheduledChange && <div className="mt-1 text-xs text-indigo-700">Plan change applies at this renewal</div>}
                </div>
                <div className={`rounded-xl p-4 ${vw.status === "active" ? "bg-amber-50/70" : vw.status === "pending" ? "bg-sky-50/70" : "bg-rose-50/70"}`}>
                  <div className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
                    {vw.status === "pending" ? "Waiting since" : vw.status === "grace" ? "Locks on" : vw.status === "locked" ? "Locked since" : "Renews on"}
                  </div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{fmtDate(vw.status === "pending" ? vw.createdAt : end)}</div>
                  <div className="text-xs text-slate-600">
                    {vw.status === "pending"
                      ? "CRM created, first payment not received"
                      : vw.status === "active"
                        ? `${d} day${d === 1 ? "" : "s"} left`
                        : `Plan ended ${fmtDate(vw.currentPeriodEnd)} · ${Math.abs(d)} days ago`}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-start gap-2">
                <ActionButton action={sendPaymentLink.bind(null, String(vw._id))} className="btn btn-primary btn-sm">
                  Send payment link
                </ActionButton>
                {phone && (
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="btn btn-outline btn-sm">
                    <Icon name="Phone" size={14} /> Call
                  </a>
                )}
                {phone && (
                  <a href={whatsappLink(phone)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                    <Icon name="MessageCircle" size={14} /> WhatsApp
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="btn btn-outline btn-sm">
                    <Icon name="Mail" size={14} /> Email
                  </a>
                )}
              </div>

              <h3 className="mt-6 mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Customer</h3>
              <DetailList
                rows={[
                  ["Contact person", vw.contact.name || owner?.name || ""],
                  ["Phone", phone],
                  ["Email", email],
                  ["Current plan", `${tierLabel(vw.plan.tier)} · ${cycleLabel(vw.plan.cycle)} · ${inr(vw.plan.price)} + GST`],
                  ["Current period", vw.currentPeriodStart ? `${fmtDate(vw.currentPeriodStart)} → ${fmtDate(vw.currentPeriodEnd)}` : "Not paid yet"],
                  ["GSTIN", vw.billing.gstin],
                  ["State", vw.billing.state],
                  ["Customer since", fmtDate(vw.createdAt)],
                ]}
              />
              {vw.notes && <p className="mt-3 rounded-lg bg-amber-50/70 px-3 py-2 text-sm text-slate-700">Note: {vw.notes}</p>}

              {pays.length > 0 && (
                <>
                  <h3 className="mt-6 mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Recent payments</h3>
                  <ul className="divide-y divide-slate-100 text-sm">
                    {pays.map((x) => (
                      <li key={x._id} className="flex items-center justify-between gap-4 py-2">
                        <span>
                          <span className="font-medium text-slate-800">{inr(x.total || x.amount)}</span>{" "}
                          <span className="text-xs text-slate-500">
                            · {fmtDate(x.paidAt ?? x.createdAt)} · {tierLabel(x.tier)} {cycleLabel(x.cycle)}
                          </span>
                        </span>
                        <Link href={`/admin/payments/${x._id}`} className="shrink-0 text-xs font-medium text-indigo-600 hover:underline">
                          {x.status === "paid" ? x.invoiceNumber : x.status === "created" ? "Unpaid · proforma" : "Cancelled"}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {mails.length > 0 && (
                <>
                  <h3 className="mt-6 mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Recent emails</h3>
                  <ul className="divide-y divide-slate-100 text-sm">
                    {mails.map((m) => (
                      <li key={m._id} className="flex justify-between gap-4 py-2">
                        <span className="text-slate-700">
                          {MAIL_LABEL[m.type] ?? m.subject}
                          {m.status === "failed" && <span className="ml-2 text-xs text-rose-600">failed</span>}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{fmtDateTime(m.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Modal>
          );
        })()}
    </>
  );
}
