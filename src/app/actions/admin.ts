"use server";
/* eslint-disable @typescript-eslint/no-unused-vars -- demo stubs keep the same inputs as the forms that call them */
// UI-only mode: these actions only validate the form and show a result. Nothing is saved.
import { redirect } from "next/navigation";
import { loginUrl, renewalPlanFor } from "@/lib/billing";
import { ownerOf, wsById } from "@/lib/demo-data";
import { getPlan, priceFor } from "@/lib/plans";
import { isProductKey } from "@/lib/products";
import { CYCLES, TIERS, type Cycle, type Tier } from "@/lib/types";
import { cycleLabel, inr, tierLabel, validateSubdomain, withGst, workspaceHost } from "@/lib/utils";

export type AdminResult = { error?: string; ok?: boolean; message?: string; details?: [string, string][] } | undefined;

const DEMO = " (Demo – nothing is saved.)";
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const isTier = (v: string): v is Tier => (TIERS as readonly string[]).includes(v);
const isCycle = (v: string): v is Cycle => (CYCLES as readonly string[]).includes(v);

export async function createCustomer(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const companyName = str(fd, "companyName");
  const email = str(fd, "email").toLowerCase();
  const product = str(fd, "product");
  const tier = str(fd, "tier");
  const cycle = str(fd, "cycle");
  if (!companyName || !str(fd, "contactName")) return { error: "Company name and contact person are required." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email for the customer login." };
  if (!isProductKey(product)) return { error: "Choose a product." };
  if (!isTier(tier) || !isCycle(cycle)) return { error: "Choose a plan and billing term." };
  const sub = validateSubdomain(str(fd, "subdomain"));
  if (!sub.ok) return { error: sub.error };
  const total = withGst(priceFor(getPlan(product, tier)!, cycle)).total;
  return {
    ok: true,
    message: `${companyName}'s CRM is created.${DEMO}`,
    details: [
      ["CRM", workspaceHost(sub.value)],
      ["Login page", loginUrl(sub.value)],
      ["Login email", email],
      ["Password", "Nnc-Demo1234"],
      ["Amount", `${inr(total)} incl. GST · ${tierLabel(tier)} ${cycleLabel(cycle)}`],
    ],
  };
}

export async function sendPaymentLink(id: string): Promise<AdminResult> {
  const ws = wsById(id);
  if (!ws) return { error: "Customer not found." };
  const r = renewalPlanFor(ws);
  return {
    ok: true,
    message: `Payment link emailed to ${ownerOf(ws)?.email}.${DEMO}`,
    details: [["Amount", `${inr(withGst(r.amount).total)} incl. GST · ${tierLabel(r.tier)} ${cycleLabel(r.cycle)}`]],
  };
}

export async function resetOwnerLogin(id: string): Promise<AdminResult> {
  const ws = wsById(id);
  const owner = ws && ownerOf(ws);
  if (!ws || !owner) return { error: "Owner not found." };
  return {
    ok: true,
    message: `New password emailed to ${owner.email}.${DEMO}`,
    details: [
      ["Login page", loginUrl(ws.subdomain)],
      ["Login email", owner.email],
      ["Password", "Nnc-Demo1234"],
    ],
  };
}

export async function changePlan(id: string, _: AdminResult, fd: FormData): Promise<AdminResult> {
  const ws = wsById(id);
  const tier = str(fd, "tier");
  const cycle = str(fd, "cycle");
  if (!ws) return { error: "Customer not found." };
  if (!isTier(tier) || !isCycle(cycle)) return { error: "Choose a plan and billing term." };
  const total = withGst(priceFor(getPlan(ws.product, tier)!, cycle)).total;
  return { ok: true, message: `Plan set to ${tierLabel(tier)} · ${cycleLabel(cycle)} (${inr(total)} incl. GST).${DEMO}` };
}

export async function updateCustomer(_id: string, _: AdminResult, fd: FormData): Promise<AdminResult> {
  if (!str(fd, "companyName")) return { error: "Company name is required." };
  return { ok: true, message: `Customer details saved.${DEMO}` };
}

export async function adminWorkspaceAction(id: string, _fd: FormData) {
  redirect(`/admin/workspaces/${id}`);
}

export async function updateLead(_id: string, _fd: FormData) {
  redirect("/admin/leads");
}

export async function runBillingNow() {
  redirect(`/admin?job=${encodeURIComponent("Demo run · no emails were sent")}`);
}

export async function addLeadManually(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const name = str(fd, "name");
  if (!name || (!str(fd, "phone") && !str(fd, "email"))) return { error: "Enter the name and a phone number or email." };
  return { ok: true, message: `Lead “${name}” added.${DEMO}` };
}

export async function changeAdminPassword(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const next = str(fd, "password");
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== str(fd, "confirm")) return { error: "The two new passwords do not match." };
  return { ok: true, message: `Admin password changed.${DEMO}` };
}

export async function updateAdminProfile(_: AdminResult, fd: FormData): Promise<AdminResult> {
  if (!str(fd, "name") || !/^\S+@\S+\.\S+$/.test(str(fd, "email"))) return { error: "Enter your name and a valid email." };
  return { ok: true, message: `Profile saved.${DEMO}` };
}
