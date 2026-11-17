import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/client-bits";
import { InvoiceDocument } from "@/components/Invoice";
import { PAYMENTS, ownerOf, wsById } from "@/lib/demo-data";

export const metadata = { title: "Invoice" };

export default async function AdminInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pay = PAYMENTS.find((p) => p._id === id);
  const ws = wsById(pay?.workspace);
  if (!pay || !ws) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={pay.status === "paid" ? "/admin/payments" : "/admin/payments?status=created"} className="text-sm text-slate-500 hover:text-slate-800">
          ← Payments
        </Link>
        <div className="flex gap-2">
          <Link href={`/admin/workspaces/${ws._id}`} className="btn btn-outline">
            View customer
          </Link>
          <PrintButton />
        </div>
      </div>
      <InvoiceDocument pay={pay} ws={ws} owner={ownerOf(ws)} />
    </div>
  );
}
