import Image from "next/image";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { PayButton } from "@/components/PayButton";
import { getSession } from "@/lib/auth";
import { loginUrl } from "@/lib/billing";
import { db } from "@/lib/db";
import { Payment, User, Workspace } from "@/lib/models";
import { checkPayToken } from "@/lib/paylink";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { razorpayEnabled } from "@/lib/razorpay";
import { BRAND, cycleEvery, cycleLabel, fmtDate, inr, tierLabel, workspaceHost } from "@/lib/utils";

export const metadata = { title: "Payment", robots: { index: false } };

const KIND_LABEL = { new: "New subscription", renewal: "Subscription renewal", change: "Plan change" } as const;

/** Payment link page: /pay/<id>?t=<token>. Works without logging in. */
export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!isValidObjectId(id)) notFound();
  await db();
  const pay = await Payment.findById(id).lean();
  const s = await getSession();
  if (!pay || !(checkPayToken(id, t) || s?.role === "superadmin" || String(pay.user) === s?.uid)) notFound();
  const ws = await Workspace.findById(pay.workspace).lean();
  if (!ws) notFound();
  const user = await User.findById(pay.user).lean();
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
              <PayButton
                paymentId={String(pay._id)}
                token={t ?? ""}
                orderId={pay.orderId}
                amount={total}
                keyId={process.env.RAZORPAY_KEY_ID || ""}
                mock={!razorpayEnabled()}
                brand={BRAND}
                description={`${p.name} – ${tierLabel(pay.tier)} (${cycleLabel(pay.cycle)})`}
                prefill={{ name: user?.name ?? "", email: user?.email ?? "", contact: user?.phone ?? "" }}
                label={`Pay ${inr(total)}`}
              />
            )}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">Secure payment via Razorpay (UPI, cards, net banking).</p>
        </div>
      </div>
    </main>
  );
}
