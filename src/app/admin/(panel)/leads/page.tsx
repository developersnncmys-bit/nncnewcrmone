import Link from "next/link";
import { addLeadManually, updateLead } from "@/app/actions/admin";
import { ResultForm, SubmitButton } from "@/components/admin-ui";
import { ExportButton, Modal } from "@/components/client-bits";
import { Icon } from "@/components/Icon";
import { Badge, DetailList, Empty, whatsappLink, type Tone } from "@/components/ui";
import { EMAILS, LEADS, byNewest, matches, wsById } from "@/lib/demo-data";
import { PRODUCTS, isProductKey, productList, type ProductKey } from "@/lib/products";
import { fmtDateTime, workspaceHost } from "@/lib/utils";

export const metadata = { title: "Leads" };

const STATUS: Record<string, [string, Tone]> = {
  new: ["New", "indigo"],
  contacted: ["Contacted", "amber"],
  signed_up: ["CRM created · unpaid", "blue"],
  converted: ["Paid customer", "green"],
  lost: ["Lost", "red"],
};
const SOURCES = ["Phone", "WhatsApp", "Walk-in", "Referral", "Email", "Social media", "Event", "Other"];

export default async function AdminLeads({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; status?: string; q?: string; id?: string; add?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const leads = byNewest(LEADS)
    .filter((l) => !isProductKey(sp.product) || l.product === sp.product)
    .filter((l) => !(sp.status && STATUS[sp.status]) || l.status === sp.status)
    .filter((l) => matches(sp.q ?? "", l.name, l.email, l.phone, l.company))
    .map((l) => ({ ...l, workspace: wsById(l.workspace) }));
  const count = (k?: string) => (k ? LEADS.filter((l) => l.status === k).length : LEADS.length);
  const exportRows = [
    ["Received", "Name", "Company", "Phone", "Email", "Product", "Source", "Status", "Message", "Notes"],
    ...byNewest(LEADS).map((l) => [fmtDateTime(l.createdAt), l.name, l.company, l.phone, l.email, isProductKey(l.product) ? PRODUCTS[l.product].name : "", l.source, STATUS[l.status]?.[0] ?? l.status, l.message, l.notes]),
  ];
  const tabHref = (status?: string) => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (sp.product) q.set("product", sp.product);
    if (sp.q) q.set("q", sp.q);
    return `/admin/leads${q.size ? `?${q}` : ""}`;
  };
  // Popup: ?view=<lead id> opens it; closing keeps the current tab / filters.
  const viewHref = (id?: string) => {
    const q = new URLSearchParams();
    for (const k of ["status", "product", "q"] as const) if (sp[k]) q.set(k, sp[k]!);
    if (id) q.set("view", id);
    return `/admin/leads${q.size ? `?${q}` : ""}`;
  };
  const viewing = sp.view ? LEADS.find((l) => l._id === sp.view) : undefined;
  const viewingWs = viewing ? wsById(viewing.workspace) : null;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enquiries from nncdigital.co.in arrive here automatically. Add phone / walk-in leads by hand, then click “Create CRM” to set them up.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton filename="leads.csv" rows={exportRows} className="btn btn-outline">
            <Icon name="Download" size={16} /> Export
          </ExportButton>
          <Link href={sp.add ? "/admin/leads" : "/admin/leads?add=1"} className="btn btn-primary">
            <Icon name="Plus" size={16} /> Add lead
          </Link>
        </div>
      </div>

      {sp.add && (
        <section className="card mb-6 p-6">
          <h2 className="mb-4 font-bold">New lead</h2>
          <ResultForm action={addLeadManually} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Name *</label>
              <input name="name" required className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" />
            </div>
            <div>
              <label className="label">Company</label>
              <input name="company" className="input" />
            </div>
            <div>
              <label className="label">Interested in</label>
              <select name="product" className="input">
                <option value="">Not decided</option>
                {productList().map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Source</label>
              <select name="source" className="input">
                {SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="label">Requirement / notes</label>
              <input name="message" className="input" placeholder="What does the customer need?" />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <SubmitButton>Save lead</SubmitButton>
            </div>
          </ResultForm>
        </section>
      )}

      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {[undefined, ...Object.keys(STATUS)].map((k) => {
          const active = (sp.status ?? undefined) === k;
          return (
            <Link
              key={k ?? "all"}
              href={tabHref(k)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${active ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-navy"}`}
            >
              {k ? STATUS[k][0] : "All"}
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>{count(k)}</span>
            </Link>
          );
        })}
      </div>

      <form className="mb-4 flex flex-wrap gap-2">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input name="q" defaultValue={sp.q} placeholder="Search name, company, phone, email…" className="input max-w-xs" />
        <select name="product" defaultValue={sp.product ?? ""} className="input max-w-[180px]">
          <option value="">All products</option>
          {productList().map((p) => (
            <option key={p.key} value={p.key}>
              {p.name}
            </option>
          ))}
        </select>
        <button className="btn btn-outline">Filter</button>
        {(sp.q || sp.product) && (
          <Link href={tabHref(sp.status)} className="btn btn-ghost">
            Clear
          </Link>
        )}
      </form>

      {leads.length === 0 ? (
        <Empty title="No leads here">Website enquiries and leads you add by hand appear in this list.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Lead</th>
                <th className="th">Interested in</th>
                <th className="th">Status</th>
                <th className="th">Received</th>
                <th className="th">Follow-up</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const p = isProductKey(l.product) ? PRODUCTS[l.product as ProductKey] : null;
                const [label, tone] = STATUS[l.status] ?? [l.status, "slate"];
                return (
                  <tr key={String(l._id)} className={`align-top ${sp.id === String(l._id) || sp.view === l._id ? "bg-indigo-50/60" : "hover:bg-slate-50/60"}`}>
                    <td className="td">
                      <Link href={viewHref(l._id)} scroll={false} className="group flex items-start gap-3" title="View lead details">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">
                          {l.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <div className="font-semibold text-navy group-hover:text-indigo-600 group-hover:underline">{l.name}</div>
                          {l.company && <div className="text-xs text-slate-600">{l.company}</div>}
                          <div className="text-xs text-slate-500">{[l.phone, l.email].filter(Boolean).join(" · ")}</div>
                          {l.message && <div className="mt-1 max-w-xs text-xs whitespace-normal text-slate-500 italic">“{l.message}”</div>}
                        </div>
                      </Link>
                    </td>
                    <td className="td">
                      {p ? (
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${p.theme.soft}`}>{p.name}</span>
                      ) : (
                        <span className="text-xs text-slate-400">Not chosen</span>
                      )}
                      <div className="mt-1 text-xs text-slate-400">via {l.source || "website"}</div>
                    </td>
                    <td className="td">
                      <Badge tone={tone}>{label}</Badge>
                      {l.workspace && <div className="mt-1 text-xs text-slate-500">{workspaceHost(l.workspace.subdomain)}</div>}
                    </td>
                    <td className="td text-xs text-slate-500">{fmtDateTime(l.createdAt)}</td>
                    <td className="td">
                      <form action={updateLead.bind(null, String(l._id))} className="flex flex-wrap items-start gap-2">
                        <select name="product" defaultValue={l.product} className="input w-32 py-1 text-xs">
                          <option value="">Product?</option>
                          {productList().map((x) => (
                            <option key={x.key} value={x.key}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                        <select name="status" defaultValue={l.status} className="input w-40 py-1 text-xs">
                          {Object.entries(STATUS).map(([k, [lab]]) => (
                            <option key={k} value={k}>
                              {lab}
                            </option>
                          ))}
                        </select>
                        <input name="notes" defaultValue={l.notes} placeholder="Notes (e.g. call back Monday)" className="input w-56 py-1 text-xs" />
                        <button className="btn btn-outline btn-sm">Save</button>
                      </form>
                    </td>
                    <td className="td text-right">
                      <div className="flex flex-col items-end gap-2">
                        {l.workspace ? (
                          <Link href={`/admin/workspaces/${l.workspace._id}`} className="btn btn-outline btn-sm">
                            View customer
                          </Link>
                        ) : (
                          <Link href={`/admin/workspaces/new?lead=${l._id}`} className="btn btn-primary btn-sm">
                            Create CRM →
                          </Link>
                        )}
                        <Link href={viewHref(l._id)} scroll={false} className="btn btn-ghost btn-sm">
                          Details
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

      {viewing && (
        <Modal
          closeHref={viewHref()}
          title={viewing.name}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              {viewing.company || "No company"}
              <Badge tone={(STATUS[viewing.status] ?? [viewing.status, "slate"])[1]}>{(STATUS[viewing.status] ?? [viewing.status])[0]}</Badge>
            </span>
          }
          footer={
            <>
              <Link href={viewHref()} scroll={false} className="btn btn-outline">
                Close
              </Link>
              {viewingWs ? (
                <Link href={`/admin/workspaces/${viewingWs._id}`} className="btn btn-primary">
                  View customer
                </Link>
              ) : (
                <Link href={`/admin/workspaces/new?lead=${viewing._id}`} className="btn btn-primary">
                  Create CRM →
                </Link>
              )}
            </>
          }
        >
          <div className="mb-5 flex flex-wrap gap-2">
            {viewing.phone && (
              <a href={`tel:${viewing.phone.replace(/\s/g, "")}`} className="btn btn-outline btn-sm">
                <Icon name="Phone" size={14} /> Call
              </a>
            )}
            {viewing.phone && (
              <a href={whatsappLink(viewing.phone)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                <Icon name="MessageCircle" size={14} /> WhatsApp
              </a>
            )}
            {viewing.email && (
              <a href={`mailto:${viewing.email}`} className="btn btn-outline btn-sm">
                <Icon name="Mail" size={14} /> Email
              </a>
            )}
          </div>

          <DetailList
            rows={[
              ["Phone", viewing.phone],
              ["Email", viewing.email],
              ["Company", viewing.company],
              ["Interested in", isProductKey(viewing.product) ? PRODUCTS[viewing.product].name : "Not decided"],
              ["Source", viewing.source || "website"],
              ["Received", fmtDateTime(viewing.createdAt)],
              ["Customer CRM", viewingWs ? workspaceHost(viewingWs.subdomain) : "Not created yet"],
            ]}
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Requirement</div>
              <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{viewing.message || "—"}</p>
            </div>
            <div className="rounded-xl bg-amber-50/70 p-4">
              <div className="text-xs font-semibold tracking-wide text-amber-700 uppercase">Follow-up notes</div>
              <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{viewing.notes || "No notes yet."}</p>
            </div>
          </div>

          {(() => {
            const mails = EMAILS.filter((m) => m.to === viewing.email || (viewingWs && m.workspace === viewingWs._id)).slice(0, 5);
            return mails.length > 0 ? (
              <div className="mt-5">
                <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Recent emails</div>
                <ul className="divide-y divide-slate-100 text-sm">
                  {mails.map((m) => (
                    <li key={m._id} className="flex justify-between gap-4 py-2">
                      <span className="text-slate-700">{m.subject}</span>
                      <span className="shrink-0 text-xs text-slate-500">{fmtDateTime(m.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null;
          })()}
        </Modal>
      )}
    </>
  );
}
