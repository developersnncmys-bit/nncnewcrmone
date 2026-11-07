"use server";
/* eslint-disable @typescript-eslint/no-unused-vars -- demo stubs keep the same inputs as the forms that call them */
// UI-only mode: payments are simulated. Nothing is charged or saved.
import { redirect } from "next/navigation";
import { PAYMENTS, WORKSPACES, wsById, wsBySub } from "@/lib/demo-data";
import { validateSubdomain, workspaceHost, workspaceUrl } from "@/lib/utils";
import { wsBase } from "@/lib/workspace";

/** Live availability check for the domain field (admin "New customer" form). */
export async function checkSubdomain(name: string) {
  const v = validateSubdomain(name);
  if (!v.ok) return { ok: false, error: v.error };
  if (WORKSPACES.some((w) => w.subdomain === v.value)) return { ok: false, error: `${workspaceHost(v.value)} is already taken.` };
  return { ok: true, value: v.value };
}

/** Billing page: opens the payment page for this customer's open (or latest) payment. */
export async function payForWorkspace(sub: string, _fd: FormData) {
  const ws = wsBySub(sub);
  const pays = PAYMENTS.filter((p) => p.workspace === ws?._id);
  const pay = pays.find((p) => p.status === "created") ?? pays[pays.length - 1];
  redirect(pay ? `/pay/${pay._id}` : `${wsBase(sub)}/billing`);
}

export async function scheduleChange(sub: string, _fd: FormData) {
  redirect(`${wsBase(sub)}/billing?scheduled=1`);
}

/** Called by the pay page's button: pretends the payment went through. */
export async function verifyPaymentAction(input: { paymentId: string }): Promise<{ ok: true; redirect: string } | { ok: false; error: string }> {
  const pay = PAYMENTS.find((p) => p._id === input.paymentId);
  const ws = wsById(pay?.workspace);
  if (!pay || !ws) return { ok: false, error: "Payment not found." };
  return { ok: true, redirect: `${workspaceUrl(ws.subdomain)}?paid=1` };
}
