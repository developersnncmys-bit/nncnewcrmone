import Image from "next/image";
import { notFound } from "next/navigation";
import { PayButton } from "@/components/PayButton";
import { loginUrl } from "@/lib/billing";
import { PAYMENTS, wsById } from "@/lib/demo-data";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { cycleEvery, cycleLabel, fmtDate, inr, tierLabel, workspaceHost } from "@/lib/utils";

export const metadata = { title: "Payment", robots: { index: false } };

const KIND_LABEL = { new: "New subscription", renewal: "Subscription renewal", change: "Plan change" } as const;

/** Payment link page: /pay/<id>. Demo only: the button simulates a successful payment. */
export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pay = PAYMENTS.find((p) => p._id === id);
  if (!pay) notFound();
  const ws = wsById(pay.workspace);
  if (!ws) notFound();
  const p = PRODUCTS[ws.product as ProductKey];
  const total = pay.total || pay.amount;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center">
          <Image src="/nnc-logo.png" alt="NNC digital" width={180} height={44} priority className="h-auto w-44" />
        </div>
        <div className="card p-6">
          <h1 className="text-xl font-semibold text-slate-900">
            {pay.status === "paid" ? "Payment successful ✓" : pay.status === "failed" ? "This payment link has expired" : "Complete your payment"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{KIND_LABEL[pay.kind as keyof typeof KIND_LABEL]}</p>
          <dl className="mt-6 space-y-2 text-sm">
            {[
              ["CRM", p.name],
              ["Company", ws.companyName],
              ["Domain", workspaceHost(ws.subdomain)],
              ["Plan", `${tierLabel(pay.tier)} · ${cycleLabel(pay.cycle)}`],
              ["Billing", `Renews ${cycleEvery(pay.cycle)}`],
              ...(pay.status === "paid" ? [["Valid till", fmtDate(pay.periodEnd)]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <dt className="text-slate-500">Plan price</dt>
              <dd>{inr(pay.amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">GST {pay.gstRate}%</dt>
              <dd>{inr(pay.gstAmount)}</dd>
            </div>
            <div className="flex justify-between text-base">
              <dt className="text-slate-500">Total</dt>
              <dd className="font-bold text-slate-900">{inr(total)}</dd>
            </div>
          </dl>
          <div className="mt-6">
            {pay.status === "paid" ? (
              <a href={loginUrl(ws.subdomain)} className="btn btn-primary w-full">
                Log in to your CRM
              </a>
            ) : pay.status === "failed" ? (
              <p className="text-center text-sm text-slate-500">Please use the latest payment link we emailed you, or contact us.</p>
            ) : (
              <PayButton paymentId={pay._id} label={`Pay ${inr(total)}`} />
            )}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">Secure payment via Razorpay (UPI, cards, net banking).</p>
        </div>
      </div>
    </main>
  );
}
