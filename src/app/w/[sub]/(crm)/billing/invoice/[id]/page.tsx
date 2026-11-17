import { notFound } from "next/navigation";
import { PrintButton } from "@/components/client-bits";
import { InvoiceDocument } from "@/components/Invoice";
import { ownerOf, paymentsOf } from "@/lib/demo-data";
import { canManage, getWorkspaceAccess } from "@/lib/workspace";

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ sub: string; id: string }> }) {
  const { sub, id } = await params;
  const { ws, role } = await getWorkspaceAccess(sub);
  if (!canManage(role)) notFound();
  const pay = paymentsOf(ws._id).find((p) => p._id === id && p.status === "paid");
  if (!pay) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <InvoiceDocument pay={pay} ws={ws} owner={ownerOf(ws)} />
    </div>
  );
}
