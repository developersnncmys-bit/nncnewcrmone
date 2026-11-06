"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, requireUser } from "@/lib/auth";
import { createPayment, markPaid, renewalPlanFor } from "@/lib/billing";
import { db } from "@/lib/db";
import { CYCLES, Payment, TIERS, Workspace, type Cycle, type Tier } from "@/lib/models";
import { checkPayToken, payToken } from "@/lib/paylink";
import { razorpayEnabled, verifyCheckoutSignature } from "@/lib/razorpay";
import { validateSubdomain, workspaceHost, workspaceUrl } from "@/lib/utils";
import { canManage, getWorkspaceAccess, wsBase } from "@/lib/workspace";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const isTier = (v: string): v is Tier => (TIERS as readonly string[]).includes(v);
const isCycle = (v: string): v is Cycle => (CYCLES as readonly string[]).includes(v);

/** Live availability check for the domain field (admin "New customer" form). */
export async function checkSubdomain(name: string) {
  const s = await getSession();
  if (s?.role !== "superadmin") return { ok: false, error: "Not allowed" };
  const v = validateSubdomain(name);
  if (!v.ok) return { ok: false, error: v.error };
  await db();
  if (await Workspace.exists({ subdomain: v.value })) return { ok: false, error: `${workspaceHost(v.value)} is already taken.` };
  return { ok: true, value: v.value };
}

/** Billing page (inside a customer CRM): pay to activate / renew / upgrade now. */
export async function payForWorkspace(sub: string, fd: FormData) {
  const s = await requireUser();
  const { ws, role } = await getWorkspaceAccess(sub, s);
  if (!canManage(role)) throw new Error("Only the workspace owner or an admin can manage billing.");
  const mode = str(fd, "mode");

  let tier: Tier;
  let cycle: Cycle;
  let kind: "new" | "renewal" | "change";
  const neverPaid = ws.status === "pending" || ws.status === "trial" || !ws.currentPeriodStart;
  if (mode === "renew") {
    const r = await renewalPlanFor(ws);
    tier = r.tier;
    cycle = r.cycle;
    kind = neverPaid ? "new" : "renewal";
  } else {
    const t = str(fd, "tier");
    const c = str(fd, "cycle");
    if (!isTier(t) || !isCycle(c)) throw new Error("Invalid plan");
    tier = t;
    cycle = c;
    kind = neverPaid ? "new" : "change";
  }
  const pay = await createPayment({ workspaceId: ws._id, userId: ws.owner, product: ws.product, tier, cycle, kind });
  redirect(`/pay/${pay._id}?t=${payToken(String(pay._id))}`);
}

/** Switch billing term (quarterly / half-yearly / yearly) or tier from the next renewal, no payment now. */
export async function scheduleChange(sub: string, fd: FormData) {
  const s = await requireUser();
  const { ws, role } = await getWorkspaceAccess(sub, s);
  if (!canManage(role)) throw new Error("Not allowed");
  const tier = str(fd, "tier");
  const cycle = str(fd, "cycle");
  if (!isTier(tier) || !isCycle(cycle)) throw new Error("Invalid plan");
  const same = tier === ws.plan.tier && cycle === ws.plan.cycle;
  await Workspace.updateOne({ _id: ws._id }, { $set: { scheduledChange: same ? null : { tier, cycle } } });
  const base = await wsBase(sub);
  revalidatePath(`/w/${sub}/billing`);
  redirect(`${base}/billing?scheduled=1`);
}

/** Called by the pay page after Razorpay checkout succeeds (or mock payment in dev). */
export async function verifyPaymentAction(input: {
  paymentId: string;
  token: string;
  orderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<{ ok: true; redirect: string } | { ok: false; error: string }> {
  await db();
  const s = await getSession();
  const pay = await Payment.findById(input.paymentId).lean();
  const allowed = !!pay && (checkPayToken(String(pay._id), input.token) || s?.role === "superadmin" || String(pay.user) === s?.uid);
  if (!pay || !allowed) return { ok: false, error: "Payment not found." };
  const ws = await Workspace.findById(pay.workspace).lean();
  if (!ws) return { ok: false, error: "Workspace not found." };

  if (pay.status === "failed") return { ok: false, error: "This payment link has expired. Please use the latest link we emailed you." };
  if (pay.status !== "paid") {
    if (razorpayEnabled()) {
      if (input.orderId !== pay.orderId || !verifyCheckoutSignature(input.orderId, input.razorpayPaymentId, input.signature)) {
        return { ok: false, error: "Payment verification failed. If money was deducted it will be confirmed automatically." };
      }
    } else if (!pay.orderId.startsWith("mock_")) {
      return { ok: false, error: "Payment gateway is not configured." };
    }
    await markPaid(pay._id, input.razorpayPaymentId);
  }
  return { ok: true, redirect: `${workspaceUrl(ws.subdomain)}?paid=1` };
}
