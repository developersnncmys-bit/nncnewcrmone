import Link from "next/link";
import { Badge, Empty, Panel, WorkspaceStatus } from "@/components/ui";
import { LEADS, PAYMENTS, WORKSPACES, byNewest, matches, wsById } from "@/lib/demo-data";
import { PRODUCTS, isProductKey, type ProductKey } from "@/lib/products";
import { fmtDate, inr, workspaceHost } from "@/lib/utils";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q || "").trim();
  if (!q) return <Empty title="Type something in the search box">Search by company, domain, contact name, phone, email or invoice number.</Empty>;
  const customers = WORKSPACES.filter((w) => matches(q, w.companyName, w.subdomain, w.contact.name, w.contact.email, w.contact.phone, w.billing.gstin));
  const leads = byNewest(LEADS).filter((l) => matches(q, l.name, l.email, l.phone, l.company));
  const payments = PAYMENTS.filter((p) => matches(q, p.invoiceNumber, p.razorpayPaymentId)).map((p) => ({ ...p, workspace: wsById(p.workspace) }));
  const total = customers.length + leads.length + payments.length;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Search results</h1>
        <p className="mt-1 text-sm text-slate-500">
          {total} result{total === 1 ? "" : "s"} for “{q}”
        </p>
      </div>
      {total === 0 && <Empty title="Nothing found">Try a company name, phone number, domain or invoice number.</Empty>}
      <div className="space-y-6">
        {customers.length > 0 && (
          <Panel title={`Customers (${customers.length})`}>
            <ul className="-my-2 divide-y divide-slate-100">
              {customers.map((w) => (
                <li key={String(w._id)} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <Link href={`/admin/workspaces/${w._id}`} className="font-semibold text-navy hover:text-indigo-600">
                      {w.companyName}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {PRODUCTS[w.product as ProductKey].name} · {workspaceHost(w.subdomain)} · {[w.contact?.name, w.contact?.phone].filter(Boolean).join(" ")}
                    </div>
                  </div>
                  <WorkspaceStatus status={w.status} />
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {leads.length > 0 && (
          <Panel title={`Leads (${leads.length})`}>
            <ul className="-my-2 divide-y divide-slate-100">
              {leads.map((l) => (
                <li key={String(l._id)} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <Link href={`/admin/leads?q=${encodeURIComponent(l.phone || l.email || l.name)}`} className="font-semibold text-navy hover:text-indigo-600">
                      {l.name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {[l.company, l.phone, l.email].filter(Boolean).join(" · ")} ·{" "}
                      {isProductKey(l.product) ? PRODUCTS[l.product as ProductKey].name : "product not chosen"}
                    </div>
                  </div>
                  <Badge>{l.status}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {payments.length > 0 && (
          <Panel title={`Payments (${payments.length})`}>
            <ul className="-my-2 divide-y divide-slate-100">
              {payments.map((p) => (
                <li key={String(p._id)} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <Link href={`/admin/workspaces/${p.workspace?._id}`} className="font-semibold text-navy hover:text-indigo-600">
                      {p.invoiceNumber || "Unpaid link"} · {p.workspace?.companyName}
                    </Link>
                    <div className="text-xs text-slate-500">{fmtDate(p.paidAt ?? p.createdAt)}</div>
                  </div>
                  <span className="font-semibold">{inr(p.total || p.amount)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
