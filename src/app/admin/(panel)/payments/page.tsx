import Link from "next/link";
import { ExportButton } from "@/components/client-bits";
import { Badge, Empty, PageHeader, Pagination, paginate } from "@/components/ui";
import { PAYMENTS, byNewest, wsById } from "@/lib/demo-data";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { cycleLabel, fmtDateTime, inr, tierLabel, workspaceHost } from "@/lib/utils";

export const metadata = { title: "Payments" };

const PER_PAGE = 10;

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const { status, page: pageParam } = await searchParams;
  const filter = { status: status === "created" ? "created" : "paid" };
  const list = byNewest(PAYMENTS)
    .filter((p) => p.status === filter.status)
    .map((p) => ({ ...p, workspace: wsById(p.workspace) }));
  const total = list.filter((p) => p.status === "paid").reduce((a, p) => a + (p.total || p.amount), 0);
  const pg = paginate(list, pageParam, PER_PAGE);
  const pageHref = (n: number) => `/admin/payments?${filter.status === "created" ? "status=created&" : ""}page=${n}`;
  const exportRows = [
    ["Date", "Invoice", "Customer", "Domain", "Product", "Plan", "Billing", "Type", "Amount", "GST", "Total", "Status"],
    ...byNewest(PAYMENTS).map((p) => {
      const w = wsById(p.workspace);
      return [fmtDateTime(p.paidAt ?? p.createdAt), p.invoiceNumber, w?.companyName ?? "", w ? workspaceHost(w.subdomain) : "", PRODUCTS[p.product as ProductKey].name, tierLabel(p.tier), cycleLabel(p.cycle), p.kind, p.amount, p.gstAmount, p.total, p.status];
    }),
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle={filter.status === "paid" ? `Total collected (incl. GST): ${inr(total)}` : "Checkouts started but not paid yet"}
        actions={
          <>
            <ExportButton filename="payments.csv" rows={exportRows} className="btn btn-outline">
              Export to Excel
            </ExportButton>
            <Link href="/admin/payments" className={`btn ${filter.status === "paid" ? "btn-primary" : "btn-outline"}`}>
              Paid
            </Link>
            <Link href="/admin/payments?status=created" className={`btn ${filter.status === "created" ? "btn-primary" : "btn-outline"}`}>
              Unpaid / abandoned
            </Link>
          </>
        }
      />
      {list.length === 0 ? (
        <Empty title="No payments" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Date</th>
                <th className="th">Invoice</th>
                <th className="th">Customer</th>
                <th className="th">Product</th>
                <th className="th">Plan</th>
                <th className="th">Type</th>
                <th className="th text-right">Amount</th>
                <th className="th text-right">GST</th>
                <th className="th text-right">Total</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {pg.rows.map((p) => (
                <tr key={String(p._id)} className="hover:bg-slate-50">
                  <td className="td text-xs">{fmtDateTime(p.paidAt ?? p.createdAt)}</td>
                  <td className="td font-mono text-xs">
                    {p.invoiceNumber ? (
                      <Link href={`/admin/payments/${p._id}`} className="text-indigo-600 hover:underline">
                        {p.invoiceNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="td">
                    <div className="font-medium">{p.workspace?.companyName}</div>
                    <div className="text-xs text-slate-500">{p.workspace && workspaceHost(p.workspace.subdomain)}</div>
                  </td>
                  <td className="td">{PRODUCTS[p.product as ProductKey].name}</td>
                  <td className="td">
                    {tierLabel(p.tier)} · {cycleLabel(p.cycle)}
                  </td>
                  <td className="td">
                    <Badge tone={p.kind === "new" ? "green" : p.kind === "renewal" ? "blue" : "indigo"}>{p.kind}</Badge>
                  </td>
                  <td className="td text-right">{inr(p.amount)}</td>
                  <td className="td text-right">{inr(p.gstAmount)}</td>
                  <td className="td text-right font-medium">{inr(p.total || p.amount)}</td>
                  <td className="td text-right">
                    <Link href={`/admin/payments/${p._id}`} className="btn btn-outline btn-sm">
                      {p.status === "paid" ? "Invoice" : "Proforma"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination {...pg} href={pageHref} />
    </>
  );
}
