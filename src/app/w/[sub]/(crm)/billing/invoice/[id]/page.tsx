import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { PrintButton } from "@/components/client-bits";
import { requireUser } from "@/lib/auth";
import { Payment, User } from "@/lib/models";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { BRAND, cycleLabel, fmtDate, inr, tierLabel, workspaceHost } from "@/lib/utils";
import { canManage, getWorkspaceAccess } from "@/lib/workspace";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ sub: string; id: string }> }) {
  const { sub, id } = await params;
  const s = await requireUser();
  const { ws, role } = await getWorkspaceAccess(sub, s);
  if (!canManage(role) || !isValidObjectId(id)) notFound();
  const pay = await Payment.findOne({ _id: id, workspace: ws._id, status: "paid" }).lean();
  if (!pay) notFound();
  const owner = await User.findById(ws.owner).lean();
  const p = PRODUCTS[ws.product as ProductKey];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <div className="card p-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold text-indigo-600">{BRAND}</div>
            <div className="mt-1 text-sm text-slate-500">{process.env.COMPANY_ADDRESS || ""}</div>
            {process.env.COMPANY_GSTIN && <div className="text-sm text-slate-500">GSTIN: {process.env.COMPANY_GSTIN}</div>}
          </div>
          <div className="text-right">
            <div className="text-xl font-semibold text-slate-900">INVOICE</div>
            <div className="mt-1 font-mono text-sm">{pay.invoiceNumber}</div>
            <div className="text-sm text-slate-500">Date: {fmtDate(pay.paidAt)}</div>
          </div>
        </div>
        <div className="mt-8 text-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Billed to</div>
          <div className="mt-1 font-medium text-slate-900">{ws.companyName}</div>
          <div className="text-slate-600">{owner?.name}</div>
          <div className="text-slate-600">{owner?.email}</div>
        </div>
        <table className="mt-8 w-full">
          <thead>
            <tr>
              <th className="th">Description</th>
              <th className="th">Period</th>
              <th className="th text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="td">
                {p.name} – {tierLabel(pay.tier)} plan ({cycleLabel(pay.cycle)})
                <div className="text-xs text-slate-500">{workspaceHost(ws.subdomain)}</div>
              </td>
              <td className="td">
                {fmtDate(pay.periodStart)} → {fmtDate(pay.periodEnd)}
              </td>
              <td className="td text-right">{inr(pay.amount)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-4 flex justify-end">
          <div className="w-64 text-sm">
            <div className="flex justify-between border-t border-slate-200 py-1.5">
              <span className="text-slate-500">Subtotal</span>
              <span>{inr(pay.amount)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">GST {pay.gstRate}%</span>
              <span>{inr(pay.gstAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 py-2 text-base font-semibold">
              <span>Total paid</span>
              <span>{inr(pay.total || pay.amount)}</span>
            </div>
            <div className="text-xs text-slate-500">Payment ID: {pay.razorpayPaymentId}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
