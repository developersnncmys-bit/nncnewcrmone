"use server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireAdmin } from "@/lib/auth";
import { loginUrl, openPaymentFor, runBillingJob, sendAccessEmail } from "@/lib/billing";
import { db } from "@/lib/db";
import { CYCLES, Lead, Payment, TIERS, User, Workspace, type Cycle, type Tier } from "@/lib/models";
import { payLink } from "@/lib/paylink";
import { getPlan, priceFor } from "@/lib/plans";
import { isProductKey } from "@/lib/products";
import { DAY, cycleLabel, inr, tierLabel, validateSubdomain, withGst, workspaceHost } from "@/lib/utils";

export type AdminResult = { error?: string; ok?: boolean; message?: string; details?: [string, string][] } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const isTier = (v: string): v is Tier => (TIERS as readonly string[]).includes(v);
const isCycle = (v: string): v is Cycle => (CYCLES as readonly string[]).includes(v);
const LEAD_STATUSES = ["new", "contacted", "signed_up", "converted", "lost"];

/** Readable temporary password, e.g. "Nnc-7f3k9q2m". */
const tempPassword = () => `Nnc-${crypto.randomBytes(6).toString("base64url").slice(0, 8)}`;

/* ------------------------------------------------------------------ */
/* Create a customer CRM (the main admin flow)                         */
/* ------------------------------------------------------------------ */
export async function createCustomer(_: AdminResult, fd: FormData): Promise<AdminResult> {
  await requireAdmin();
  await db();
  const companyName = str(fd, "companyName");
  const contactName = str(fd, "contactName");
  const email = str(fd, "email").toLowerCase();
  const phone = str(fd, "phone");
  const product = str(fd, "product");
  const tier = str(fd, "tier");
  const cycle = str(fd, "cycle");
  const leadId = str(fd, "leadId");
  const notify = fd.get("notify") === "on";

  if (!companyName || !contactName) return { error: "Company name and contact person are required." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email for the customer login." };
  if (!isProductKey(product)) return { error: "Choose a product." };
  if (!isTier(tier) || !isCycle(cycle)) return { error: "Choose a plan and billing term." };
  const sub = validateSubdomain(str(fd, "subdomain"));
  if (!sub.ok) return { error: sub.error };
  if (await Workspace.exists({ subdomain: sub.value })) return { error: `${workspaceHost(sub.value)} is already taken.` };
  const plan = getPlan(product, tier)!;

  // Customer login (re-used if this email already has a CRM with us)
  let user = await User.findOne({ email });
  if (user?.role === "superadmin") return { error: "This email belongs to the admin account. Use the customer's email." };
  let password = "";
  if (!user) {
    password = tempPassword();
    user = await User.create({ name: contactName, email, phone, passwordHash: await bcrypt.hash(password, 10) });
  }

  let ws;
  try {
    ws = await Workspace.create({
      owner: user._id,
      product,
      subdomain: sub.value,
      companyName,
      plan: { tier, cycle, price: priceFor(plan, cycle) },
      status: "pending", // no free trial: the CRM opens after the first payment
      lead: leadId && isValidObjectId(leadId) ? leadId : null,
      contact: { name: contactName, email, phone },
      billing: { gstin: str(fd, "gstin").toUpperCase(), address: str(fd, "address"), state: str(fd, "state") },
      notes: str(fd, "notes"),
    });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { error: "That domain was just taken. Try another." };
    throw e;
  }

  const payment = await openPaymentFor(ws);
  if (leadId && isValidObjectId(leadId)) {
    await Lead.updateOne({ _id: leadId }, { $set: { status: "signed_up", workspace: ws._id, user: user._id } });
  }
  if (notify) await sendAccessEmail({ ws, to: email, name: contactName, password, payment });

  revalidatePath("/admin/workspaces");
  const details: [string, string][] = [
    ["CRM", workspaceHost(ws.subdomain)],
    ["Login page", loginUrl(ws.subdomain)],
    ["Login email", email],
    ["Password", password || "(existing customer – same password as their other CRM)"],
  ];
  details.push(["Amount", `${inr(payment.total)} incl. GST · ${tierLabel(tier)} ${cycleLabel(cycle)}`]);
  details.push(["Payment link", payLink(String(payment._id))]);
  return {
    ok: true,
    message: `${companyName}'s CRM is created.${notify ? " Login details were emailed to the customer." : ""}`,
    details: [...details, ["__id", String(ws._id)]],
  };
}

/* ------------------------------------------------------------------ */
/* Actions on one customer                                             */
/* ------------------------------------------------------------------ */
async function loadWs(id: string) {
  await requireAdmin();
  await db();
  if (!isValidObjectId(id)) throw new Error("Not found");
  const ws = await Workspace.findById(id);
  if (!ws) throw new Error("Not found");
  return ws;
}

/** Creates (or re-uses) the payment link for the next payment and emails it. */
export async function sendPaymentLink(id: string): Promise<AdminResult> {
  const ws = await loadWs(id);
  const pay = await openPaymentFor(ws);
  const owner = await User.findById(ws.owner).lean();
  if (owner) await sendAccessEmail({ ws, to: owner.email, name: owner.name, payment: pay });
  revalidatePath(`/admin/workspaces/${id}`);
  return {
    ok: true,
    message: `Payment link emailed to ${owner?.email}.`,
    details: [
      ["Amount", `${inr(pay.total)} incl. GST · ${tierLabel(pay.tier)} ${cycleLabel(pay.cycle)}`],
      ["Payment link", payLink(String(pay._id))],
    ],
  };
}

/** New temporary password for the CRM owner, emailed with the login link. */
export async function resetOwnerLogin(id: string): Promise<AdminResult> {
  const ws = await loadWs(id);
  const owner = await User.findById(ws.owner);
  if (!owner) return { error: "Owner not found" };
  const password = tempPassword();
  owner.passwordHash = await bcrypt.hash(password, 10);
  await owner.save();
  await sendAccessEmail({ ws, to: owner.email, name: owner.name, password });
  return {
    ok: true,
    message: `New password emailed to ${owner.email}.`,
    details: [
      ["Login page", loginUrl(ws.subdomain)],
      ["Login email", owner.email],
      ["Password", password],
    ],
  };
}

/** Change plan / billing term. Before the first payment it changes immediately, otherwise from the next renewal. */
export async function changePlan(id: string, _: AdminResult, fd: FormData): Promise<AdminResult> {
  const ws = await loadWs(id);
  const tier = str(fd, "tier");
  const cycle = str(fd, "cycle");
  if (!isTier(tier) || !isCycle(cycle)) return { error: "Choose a plan and billing term." };
  const neverPaid = ws.status === "pending" || ws.status === "trial" || !ws.currentPeriodStart;
  const price = priceFor(getPlan(ws.product, tier)!, cycle);
  if (neverPaid) {
    ws.plan = { tier, cycle, price };
    ws.scheduledChange = null;
    await Payment.updateMany({ workspace: ws._id, status: "created" }, { $set: { status: "failed" } });
  } else {
    ws.scheduledChange = tier === ws.plan.tier && cycle === ws.plan.cycle ? null : { tier, cycle };
  }
  await ws.save();
  revalidatePath(`/admin/workspaces/${id}`);
  return {
    ok: true,
    message: neverPaid
      ? `Plan changed to ${tierLabel(tier)} · ${cycleLabel(cycle)} (${inr(withGst(price).total)} incl. GST). Send a new payment link.`
      : `From the next renewal: ${tierLabel(tier)} · ${cycleLabel(cycle)} (${inr(withGst(price).total)} incl. GST).`,
  };
}

export async function updateCustomer(id: string, _: AdminResult, fd: FormData): Promise<AdminResult> {
  const ws = await loadWs(id);
  const companyName = str(fd, "companyName");
  if (!companyName) return { error: "Company name is required." };
  ws.companyName = companyName;
  ws.contact = { name: str(fd, "contactName"), email: str(fd, "contactEmail"), phone: str(fd, "phone") };
  ws.billing = { gstin: str(fd, "gstin").toUpperCase(), address: str(fd, "address"), state: str(fd, "state") };
  ws.notes = str(fd, "notes");
  await ws.save();
  revalidatePath(`/admin/workspaces/${id}`);
  return { ok: true, message: "Customer details saved." };
}

/** lock | extend (days) – extend also unlocks / reactivates a workspace. */
export async function adminWorkspaceAction(id: string, fd: FormData) {
  const ws = await loadWs(id);
  const op = str(fd, "op");
  if (op === "lock") ws.status = "locked";
  if (op === "extend") {
    const days = Math.max(1, Number(str(fd, "days")) || 30);
    const cur = ws.currentPeriodEnd && ws.currentPeriodEnd > new Date() ? ws.currentPeriodEnd : new Date();
    ws.currentPeriodEnd = new Date(cur.getTime() + days * DAY);
    ws.currentPeriodStart ??= new Date();
    ws.status = "active";
    ws.trialEndsAt = null;
    ws.graceEndsAt = null;
    ws.remindersSent = [];
  }
  await ws.save();
  revalidatePath(`/admin/workspaces/${id}`);
  revalidatePath("/admin/workspaces");
}

/* ------------------------------------------------------------------ */
/* Leads + jobs                                                        */
/* ------------------------------------------------------------------ */
export async function updateLead(id: string, fd: FormData) {
  await requireAdmin();
  await db();
  const status = str(fd, "status");
  const set: Record<string, string> = { notes: str(fd, "notes") };
  if (LEAD_STATUSES.includes(status)) set.status = status;
  const product = str(fd, "product");
  if (product === "" || isProductKey(product)) set.product = product;
  await Lead.updateOne({ _id: id }, { $set: set });
  revalidatePath("/admin/leads");
}

export async function runBillingNow() {
  await requireAdmin();
  const r = await runBillingJob();
  redirect(`/admin?job=${encodeURIComponent(`Checked ${r.checked} · reminders ${r.reminders} · grace ${r.movedToGrace} · locked ${r.locked}`)}`);
}

/** Add a lead by hand (phone call, walk-in, WhatsApp, referral …). */
export async function addLeadManually(_: AdminResult, fd: FormData): Promise<AdminResult> {
  await requireAdmin();
  const name = str(fd, "name");
  const phone = str(fd, "phone");
  const email = str(fd, "email").toLowerCase();
  if (!name || (!phone && !email)) return { error: "Enter the name and a phone number or email." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
  await db();
  const product = str(fd, "product");
  await Lead.create({
    name,
    phone,
    email,
    company: str(fd, "company"),
    product: isProductKey(product) ? product : "",
    source: str(fd, "source") || "Phone",
    message: str(fd, "message"),
    notes: str(fd, "notes"),
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: true, message: `Lead “${name}” added.` };
}

/** Admin › Settings: change the owner password. */
export async function changeAdminPassword(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const s = await requireAdmin();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== String(fd.get("confirm") ?? "")) return { error: "The two new passwords do not match." };
  await db();
  const user = await User.findById(s.uid);
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) return { error: "Current password is wrong." };
  user.passwordHash = await bcrypt.hash(next, 10);
  await user.save();
  return { ok: true, message: "Admin password changed." };
}

/** Admin › Settings: change the owner's display name / login email. */
export async function updateAdminProfile(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const s = await requireAdmin();
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter your name and a valid email." };
  await db();
  if (await User.exists({ email, _id: { $ne: s.uid } })) return { error: "That email is already used by another account." };
  await User.updateOne({ _id: s.uid }, { $set: { name, email } });
  return { ok: true, message: "Profile saved. Use the new email next time you log in." };
}
