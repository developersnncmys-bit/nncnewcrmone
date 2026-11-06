import Link from "next/link";
import { Empty, PageHeader, WorkspaceStatus } from "@/components/ui";
import { db } from "@/lib/db";
import { Workspace } from "@/lib/models";
import { PRODUCTS, isProductKey, productList, type ProductKey } from "@/lib/products";
import { CYCLE_LIST, cycleLabel, daysLeft, escapeRegex, fmtDate, inr, tierLabel, workspaceHost } from "@/lib/utils";

export const metadata = { title: "Customers" };

const STATUSES = [
  ["pending", "Payment pending"],
  ["active", "Active"],
  ["grace", "Expired (grace)"],
  ["locked", "Locked"],
];

export default async function AdminWorkspaces({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; status?: string; cycle?: string; q?: string }>;
}) {
  const sp = await searchParams;
  await db();
  const filter: Record<string, unknown> = {};
  if (isProductKey(sp.product)) filter.product = sp.product;
  if (sp.status && STATUSES.some(([k]) => k === sp.status)) filter.status = sp.status;
  if (CYCLE_LIST.some((c) => c.key === sp.cycle)) filter["plan.cycle"] = sp.cycle;
  if (sp.q) {
    const rx = { $regex: escapeRegex(sp.q), $options: "i" };
    filter.$or = [{ companyName: rx }, { subdomain: rx }, { "contact.name": rx }, { "contact.email": rx }, { "contact.phone": rx }];
  }
  const list = await Workspace.find(filter)
    .sort({ createdAt: -1 })
    .limit(500)
    .populate<{ owner: { name: string; email: string } | null }>("owner", "name email")
    .lean();

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Every customer CRM with its domain, plan, billing term and subscription status."
        actions={
          <>
            { }
            <a href="/admin/export/customers" download className="btn btn-outline">
              Export to Excel
            </a>
            <Link href="/admin/workspaces/new" className="btn btn-primary">
              + New customer
            </Link>
          </>
        }
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Company, domain, contact, phone…" className="input max-w-xs" />
        <select name="product" defaultValue={sp.product ?? ""} className="input max-w-[160px]">
          <option value="">All products</option>
          {productList().map((p) => (
            <option key={p.key} value={p.key}>
              {p.name}
            </option>
          ))}
        </select>
        <select name="cycle" defaultValue={sp.cycle ?? ""} className="input max-w-[160px]">
          <option value="">All billing terms</option>
          {CYCLE_LIST.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className="input max-w-[170px]">
          <option value="">All statuses</option>
          {STATUSES.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <button className="btn btn-outline">Filter</button>
        <Link href="/admin/workspaces" className="btn btn-ghost">
          Clear
        </Link>
      </form>

      {list.length === 0 ? (
        <Empty title="No customers yet">
          <Link href="/admin/workspaces/new" className="btn btn-primary mt-3">
            Create the first customer CRM
          </Link>
        </Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Customer</th>
                <th className="th">Product</th>
                <th className="th">Plan</th>
                <th className="th">Status</th>
                <th className="th">Valid till</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((w) => {
                const p = PRODUCTS[w.product as ProductKey];
                const end = w.status === "grace" ? w.graceEndsAt : w.currentPeriodEnd;
                return (
                  <tr key={String(w._id)} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/admin/workspaces/${w._id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                        {w.companyName}
                      </Link>
                      <div className="text-xs text-slate-500">{workspaceHost(w.subdomain)}</div>
                      <div className="text-xs text-slate-500">
                        {w.contact?.name || w.owner?.name} · {w.contact?.phone || w.owner?.email}
                      </div>
                    </td>
                    <td className="td">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${p.theme.soft}`}>{p.name}</span>
                    </td>
                    <td className="td">
                      {tierLabel(w.plan.tier)} · <b>{cycleLabel(w.plan.cycle)}</b>
                      <div className="text-xs text-slate-500">{inr(w.plan.price)} + GST</div>
                    </td>
                    <td className="td">
                      <WorkspaceStatus status={w.status} />
                    </td>
                    <td className="td text-xs">
                      {end ? (
                        <>
                          {fmtDate(end)}
                          <div className="text-slate-500">{daysLeft(end)} days</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="td text-right">
                      <Link href={`/admin/workspaces/${w._id}`} className="btn btn-outline btn-sm">
                        Manage
                      </Link>
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
