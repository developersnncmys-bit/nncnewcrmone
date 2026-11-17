import Image from "next/image";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import type { PaymentT, UserT, WorkspaceT } from "@/lib/types";
import { cycleLabel, fmtDate, inr, tierLabel, workspaceHost } from "@/lib/utils";

// Seller details printed on every invoice (dummy values for the UI demo).
export const COMPANY = {
  name: "NNC Digital",
  address: "2nd Floor, Vijayanagar 1st Stage, Mysuru, Karnataka 570017",
  state: "Karnataka",
  gstin: "29AAKCN0000A1Z9",
  email: "accounts@nncdigital.co.in",
  phone: "+91 98450 00000",
};

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function words(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim();
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} Hundred ${words(n % 100)}`.trim();
  if (n < 100000) return `${words(Math.floor(n / 1000))} Thousand ${words(n % 1000)}`.trim();
  if (n < 10000000) return `${words(Math.floor(n / 100000))} Lakh ${words(n % 100000)}`.trim();
  return `${words(Math.floor(n / 10000000))} Crore ${words(n % 10000000)}`.trim();
}
/** ₹10,028.82 → "Rupees Ten Thousand Twenty Eight and Eighty Two Paise Only" */
export function amountInWords(amount: number) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  return `Rupees ${words(rupees) || "Zero"}${paise ? ` and ${words(paise)} Paise` : ""} Only`;
}

/** Printable GST invoice. Unpaid payments are shown as a proforma invoice. */
export function InvoiceDocument({ pay, ws, owner }: { pay: PaymentT; ws: WorkspaceT; owner: UserT | null }) {
  const p = PRODUCTS[ws.product as ProductKey];
  const paid = pay.status === "paid";
  const sameState = ws.billing.state.toLowerCase() === COMPANY.state.toLowerCase();
  const half = Math.round((pay.gstAmount / 2) * 100) / 100;
  const total = pay.total || pay.amount;

  return (
    <div className="card p-6 sm:p-10 print:shadow-none print:ring-0">
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <Image src="/nnc-logo.png" alt="NNC digital" width={170} height={40} className="h-auto w-40" />
          <div className="mt-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{COMPANY.name}</div>
            <div className="max-w-xs">{COMPANY.address}</div>
            <div>GSTIN: {COMPANY.gstin}</div>
            <div>
              {COMPANY.email} · {COMPANY.phone}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-wide text-slate-900">{paid ? "TAX INVOICE" : "PROFORMA INVOICE"}</div>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-end gap-3">
              <dt className="text-slate-500">{paid ? "Invoice no." : "Reference"}</dt>
              <dd className="font-mono font-medium">{paid ? pay.invoiceNumber : `PRO-${pay._id.toUpperCase()}`}</dd>
            </div>
            <div className="flex justify-end gap-3">
              <dt className="text-slate-500">{paid ? "Invoice date" : "Issued on"}</dt>
              <dd>{fmtDate(pay.paidAt ?? pay.createdAt)}</dd>
            </div>
            <div className="flex justify-end gap-3">
              <dt className="text-slate-500">Status</dt>
              <dd className={paid ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>{paid ? "PAID" : "PAYMENT DUE"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid gap-6 py-6 text-sm sm:grid-cols-2">
        <div>
          <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Billed to</div>
          <div className="mt-1 font-semibold text-slate-900">{ws.companyName}</div>
          <div className="text-slate-600">{ws.contact.name || owner?.name}</div>
          {ws.billing.address && <div className="max-w-xs text-slate-600">{ws.billing.address}</div>}
          <div className="text-slate-600">{ws.contact.email || owner?.email}</div>
          {ws.billing.gstin && <div className="text-slate-600">GSTIN: {ws.billing.gstin}</div>}
        </div>
        <div className="sm:text-right">
          <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Place of supply</div>
          <div className="mt-1 text-slate-800">{ws.billing.state || "—"}</div>
          <div className="mt-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">CRM domain</div>
          <div className="mt-1 text-slate-800">{workspaceHost(ws.subdomain)}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">#</th>
              <th className="th">Description</th>
              <th className="th">SAC</th>
              <th className="th">Period</th>
              <th className="th text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="td">1</td>
              <td className="td whitespace-normal">
                <div className="font-medium text-slate-900">
                  {p.name} – {tierLabel(pay.tier)} plan
                </div>
                <div className="text-xs text-slate-500">
                  {cycleLabel(pay.cycle)} subscription · {pay.kind === "new" ? "New subscription" : pay.kind === "renewal" ? "Renewal" : "Plan change"}
                </div>
              </td>
              <td className="td">998314</td>
              <td className="td">{pay.periodStart ? `${fmtDate(pay.periodStart)} → ${fmtDate(pay.periodEnd)}` : "Starts on payment"}</td>
              <td className="td text-right tabular-nums">{inr(pay.amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-sm text-sm">
          <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Amount in words</div>
          <div className="mt-1 text-slate-800">{amountInWords(total)}</div>
          {paid && pay.razorpayPaymentId && <div className="mt-3 text-xs text-slate-500">Payment ID: {pay.razorpayPaymentId}</div>}
        </div>
        <div className="w-full max-w-xs text-sm">
          <div className="flex justify-between border-t border-slate-200 py-1.5">
            <span className="text-slate-500">Subtotal</span>
            <span className="tabular-nums">{inr(pay.amount)}</span>
          </div>
          {sameState ? (
            <>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">CGST {pay.gstRate / 2}%</span>
                <span className="tabular-nums">{inr(half)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">SGST {pay.gstRate / 2}%</span>
                <span className="tabular-nums">{inr(pay.gstAmount - half)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">IGST {pay.gstRate}%</span>
              <span className="tabular-nums">{inr(pay.gstAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 py-2 text-base font-semibold">
            <span>{paid ? "Total paid" : "Total due"}</span>
            <span className="tabular-nums">{inr(total)}</span>
          </div>
        </div>
      </div>

      <p className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
        {paid ? "This is a computer-generated invoice and does not need a signature." : "This is a proforma invoice, not a tax invoice. A tax invoice is issued after payment."}
      </p>
    </div>
  );
}
