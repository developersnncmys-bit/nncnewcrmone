import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Lead, Payment, Workspace } from "@/lib/models";
import { PRODUCTS, isProductKey, type ProductKey } from "@/lib/products";
import { cycleLabel, tierLabel, workspaceHost } from "@/lib/utils";

/** CSV exports for the admin panel (open in Excel): /admin/export/customers | payments | leads */
const cell = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");

export async function GET(_: Request, { params }: { params: Promise<{ type: string }> }) {
  const s = await getSession();
  if (s?.role !== "superadmin") return new Response("Not found", { status: 404 });
  const { type } = await params;
  await db();
  let rows: unknown[][];

  if (type === "customers") {
    const list = await Workspace.find().sort({ createdAt: -1 }).populate<{ owner: { email: string } | null }>("owner", "email").lean();
    rows = [
      ["Company", "Product", "Domain", "Contact", "Phone", "Login email", "GSTIN", "State", "Plan", "Billing", "Price (before GST)", "Status", "Period start", "Period end", "Created"],
      ...list.map((w) => [
        w.companyName,
        PRODUCTS[w.product as ProductKey].name,
        workspaceHost(w.subdomain),
        w.contact?.name,
        w.contact?.phone,
        w.owner?.email,
        w.billing?.gstin,
        w.billing?.state,
        tierLabel(w.plan.tier),
        cycleLabel(w.plan.cycle),
        w.plan.price,
        w.status,
        w.currentPeriodStart,
        w.currentPeriodEnd,
        w.createdAt,
      ]),
    ];
  } else if (type === "payments") {
    const list = await Payment.find({ status: "paid" })
      .sort({ paidAt: -1 })
      .populate<{ workspace: { companyName: string; subdomain: string; billing?: { gstin?: string } } | null }>("workspace", "companyName subdomain billing")
      .lean();
    rows = [
      ["Invoice", "Paid on", "Company", "Customer GSTIN", "Domain", "Product", "Plan", "Billing", "Type", "Amount", "GST %", "GST", "Total", "Period start", "Period end", "Razorpay payment id"],
      ...list.map((p) => [
        p.invoiceNumber,
        p.paidAt,
        p.workspace?.companyName,
        p.workspace?.billing?.gstin,
        p.workspace && workspaceHost(p.workspace.subdomain),
        PRODUCTS[p.product as ProductKey].name,
        tierLabel(p.tier),
        cycleLabel(p.cycle),
        p.kind,
        p.amount,
        p.gstRate,
        p.gstAmount,
        p.total || p.amount,
        p.periodStart,
        p.periodEnd,
        p.razorpayPaymentId,
      ]),
    ];
  } else if (type === "leads") {
    const list = await Lead.find().sort({ createdAt: -1 }).lean();
    rows = [
      ["Name", "Company", "Phone", "Email", "Product", "Source", "Status", "Message", "Notes", "Received"],
      ...list.map((l) => [
        l.name,
        l.company,
        l.phone,
        l.email,
        isProductKey(l.product) ? PRODUCTS[l.product as ProductKey].name : "",
        l.source,
        l.status,
        l.message,
        l.notes,
        l.createdAt,
      ]),
    ];
  } else {
    return new Response("Not found", { status: 404 });
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nnc-crm-${type}-${date}.csv"`,
    },
  });
}
