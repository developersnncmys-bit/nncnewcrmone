import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { adminWorkspaceAction, changePlan, resetOwnerLogin, sendPaymentLink, updateCustomer } from "@/app/actions/admin";
import { ConfirmButton } from "@/components/client-bits";
import { ActionButton, ResultForm, SubmitButton } from "@/components/admin-ui";
import { Badge, PageHeader, WorkspaceStatus } from "@/components/ui";
import { loginUrl, renewalPlanFor } from "@/lib/billing";
import { db } from "@/lib/db";
import { CrmRecord, EmailLog, Payment, User, Workspace } from "@/lib/models";
import { payLink } from "@/lib/paylink";
import { PLANS } from "@/lib/plans";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { CYCLE_LIST, cycleLabel, daysLeft, fmtDate, fmtDateTime, inr, tierLabel, withGst, workspaceHost, workspaceUrl } from "@/lib/utils";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await db();
  const ws = await Workspace.findById(id).lean();
  if (!ws) notFound();
  const [owner, payments, members, records, mails] = await Promise.all([
    User.findById(ws.owner).lean(),
    Payment.find({ workspace: ws._id }).sort({ createdAt: -1 }).lean(),
    User.find({ _id: { $in: ws.members.map((m) => m.user) } }).select("name email").lean(),
    CrmRecord.countDocuments({ workspace: ws._id }),
    EmailLog.find({ workspace: ws._id }).sort({ createdAt: -1 }).limit(30).lean(),
  ]);
  const activity = [
    { at: ws.createdAt, text: "CRM created", sub: `${tierLabel(ws.plan.tier)} plan`, tone: "indigo" as const },
    ...payments
      .filter((x) => x.status === "paid")
      .map((x) => ({ at: x.paidAt!, text: `Payment received · ${inr(x.total || x.amount)}`, sub: `${x.invoiceNumber} · ${cycleLabel(x.cycle)}`, tone: "green" as const })),
    ...mails.map((m) => ({ at: m.createdAt, text: m.subject, sub: `Email to ${m.to} · ${m.status === "sent" ? "sent" : m.status === "failed" ? "failed" : "logged (SMTP off)"}`, tone: m.status === "failed" ? ("red" as const) : ("slate" as const) })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const DOT = { indigo: "bg-indigo-600", green: "bg-emerald-500", red: "bg-rose-500", slate: "bg-slate-300" };
  const p = PRODUCTS[ws.product as ProductKey];
  const renewal = await renewalPlanFor(ws);
  const plan = PLANS.find((x) => x.tier === ws.plan.tier);
  const neverPaid = ws.status === "pending" || !ws.currentPeriodStart;
  const end = ws.status === "grace" ? ws.graceEndsAt : ws.currentPeriodEnd;
  const unpaid = payments.find((x) => x.status === "created");
  const paidTotal = payments.filter((x) => x.status === "paid").reduce((a, x) => a + (x.total || x.amount), 0);

  const info: [string, React.ReactNode][] = [
    ["Product", p.name],
    ["Domain", <a key="d" href={workspaceUrl(ws.subdomain)} target="_blank" className="text-indigo-600">{workspaceHost(ws.subdomain)}</a>],
    ["Login page", <span key="l" className="font-mono text-xs break-all">{loginUrl(ws.subdomain)}</span>],
    ["Login email", owner?.email ?? "—"],
    ["Status", <WorkspaceStatus key="s" status={ws.status} />],
    ["Plan", `${tierLabel(ws.plan.tier)} · ${cycleLabel(ws.plan.cycle)} · ${inr(ws.plan.price)} + GST`],
    ["Users", `${ws.members.length + 1} of ${plan?.maxUsers ?? "?"}`],
    ["Current period", ws.currentPeriodStart ? `${fmtDate(ws.currentPeriodStart)} → ${fmtDate(ws.currentPeriodEnd)}` : "Not paid yet"],
  ];
  if (end && !neverPaid) info.push([ws.status === "grace" ? "Grace ends" : "Renews on", `${fmtDate(end)} (${daysLeft(end)} days)`]);
  if (ws.scheduledChange) info.push(["Next renewal", `${tierLabel(ws.scheduledChange.tier)} · ${cycleLabel(ws.scheduledChange.cycle)}`]);
  info.push(["Next payment", `${inr(withGst(renewal.amount).total)} incl. GST`]);
  info.push(["Total paid so far", inr(paidTotal)]);
  info.push(["CRM records", String(records)]);
  info.push(["Created", fmtDate(ws.createdAt)]);

  return (
    <>
      <div className="mb-2 text-sm">
        <Link href="/admin/workspaces" className="text-slate-500 hover:text-slate-800">
          ← Customers
        </Link>
      </div>
      <PageHeader
        title={ws.companyName}
        subtitle={`${p.name} · ${workspaceHost(ws.subdomain)}`}
        actions={
          <a href={workspaceUrl(ws.subdomain)} target="_blank" className="btn btn-outline">
            Open CRM ↗
          </a>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-3 font-semibold text-slate-900">Subscription</h2>
            <dl className="divide-y divide-slate-100 text-sm">
              {info.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-slate-900">Customer details</h2>
            <ResultForm action={updateCustomer.bind(null, id)} className="grid gap-4 sm:grid-cols-2">
              <>
                  <div className="sm:col-span-2">
                    <label className="label">Company name</label>
                    <input name="companyName" defaultValue={ws.companyName} className="input" required />
                  </div>
                  <div>
                    <label className="label">Contact person</label>
                    <input name="contactName" defaultValue={ws.contact?.name || owner?.name} className="input" />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input name="phone" defaultValue={ws.contact?.phone || owner?.phone} className="input" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Contact email (for your records; login email stays {owner?.email})</label>
                    <input name="contactEmail" defaultValue={ws.contact?.email || owner?.email} className="input" />
                  </div>
                  <div>
                    <label className="label">GSTIN</label>
                    <input name="gstin" defaultValue={ws.billing?.gstin} className="input uppercase" />
                  </div>
                  <div>
                    <label className="label">State</label>
                    <input name="state" defaultValue={ws.billing?.state} className="input" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Billing address</label>
                    <textarea name="address" rows={2} defaultValue={ws.billing?.address} className="input" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Internal notes</label>
                    <textarea name="notes" rows={2} defaultValue={ws.notes} className="input" />
                  </div>
                  <div className="sm:col-span-2">
                    <SubmitButton>Save details</SubmitButton>
                  </div>
              </>
            </ResultForm>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-slate-900">Activity</h2>
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {activity.slice(0, 15).map((a, i) => (
                <li key={i} className="relative">
                  <span className={`absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full ring-4 ring-white ${DOT[a.tone]}`} />
                  <div className="text-sm font-medium text-navy">{a.text}</div>
                  <div className="text-xs text-slate-500">
                    {fmtDateTime(a.at)} · {a.sub}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            <h2 className="p-6 pb-3 font-semibold text-slate-900">Payments & invoices</h2>
            {payments.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-500">No payments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">Date</th>
                      <th className="th">Invoice</th>
                      <th className="th">Plan</th>
                      <th className="th">Status</th>
                      <th className="th text-right">Total</th>
                      <th className="th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((x) => (
                      <tr key={String(x._id)}>
                        <td className="td text-xs">{fmtDateTime(x.paidAt ?? x.createdAt)}</td>
                        <td className="td font-mono text-xs">{x.invoiceNumber || "—"}</td>
                        <td className="td">
                          {tierLabel(x.tier)} · {cycleLabel(x.cycle)}
                          {x.periodStart && (
                            <div className="text-xs text-slate-500">
                              {fmtDate(x.periodStart)} → {fmtDate(x.periodEnd)}
                            </div>
                          )}
                        </td>
                        <td className="td">
                          <Badge tone={x.status === "paid" ? "green" : x.status === "created" ? "amber" : "slate"}>
                            {x.status === "paid" ? "Paid" : x.status === "created" ? "Link sent – unpaid" : "Cancelled"}
                          </Badge>
                        </td>
                        <td className="td text-right font-medium">{inr(x.total || x.amount)}</td>
                        <td className="td text-right">
                          {x.status === "paid" ? (
                            <a href={`/w/${ws.subdomain}/billing/invoice/${x._id}`} target="_blank" className="btn btn-outline btn-sm">
                              Invoice
                            </a>
                          ) : x.status === "created" ? (
                            <a href={payLink(String(x._id))} target="_blank" className="btn btn-outline btn-sm">
                              Pay link
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="font-semibold text-slate-900">Payment link</h2>
            <p className="mt-1 mb-4 text-sm text-slate-500">
              {unpaid
                ? `An unpaid link for ${inr(unpaid.total || unpaid.amount)} exists. Sending again re-emails the same link.`
                : neverPaid
                  ? "Send the first payment link. The CRM opens after payment."
                  : "Send a renewal payment link now (renewal reminders also send it automatically)."}
            </p>
            <ActionButton action={sendPaymentLink.bind(null, id)} className="btn btn-primary w-full">
              Email payment link ({inr(withGst(renewal.amount).total)})
            </ActionButton>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 font-semibold text-slate-900">Change plan / billing term</h2>
            <ResultForm action={changePlan.bind(null, id)} className="space-y-3">
              <>
                  <select name="tier" defaultValue={renewal.tier} className="input">
                    {PLANS.map((pl) => (
                      <option key={pl.tier} value={pl.tier}>
                        {pl.name} ({pl.maxUsers} user{pl.maxUsers === 1 ? "" : "s"})
                      </option>
                    ))}
                  </select>
                  <select name="cycle" defaultValue={renewal.cycle} className="input">
                    {CYCLE_LIST.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <SubmitButton className="btn btn-outline w-full">{neverPaid ? "Change plan" : "Apply from next renewal"}</SubmitButton>
              </>
            </ResultForm>
          </section>

          <section className="card p-6">
            <h2 className="font-semibold text-slate-900">Customer login</h2>
            <p className="mt-1 mb-4 text-sm text-slate-500">
              {owner?.name} · {owner?.email}
              {members.length > 0 && ` · +${members.length} team member${members.length === 1 ? "" : "s"}`}
            </p>
            <ActionButton
              action={resetOwnerLogin.bind(null, id)}
              confirmText="Create a new password and email it to the customer?"
              className="btn btn-outline w-full"
            >
              Reset password & email login
            </ActionButton>
          </section>

          <section className="card space-y-3 p-6">
            <h2 className="font-semibold text-slate-900">Access</h2>
            <form action={adminWorkspaceAction.bind(null, id)} className="flex items-center gap-2">
              <input type="hidden" name="op" value="extend" />
              <input name="days" type="number" defaultValue={30} min={1} className="input w-24" />
              <button className="btn btn-outline flex-1">Extend days (free)</button>
            </form>
            {ws.status !== "locked" && (
              <form action={adminWorkspaceAction.bind(null, id)}>
                <input type="hidden" name="op" value="lock" />
                <ConfirmButton message={`Lock ${ws.companyName}'s CRM now?`} className="btn w-full text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                  Lock CRM
                </ConfirmButton>
              </form>
            )}
            <p className="text-xs text-slate-500">Extending also unlocks a locked / expired CRM.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
