import { notFound, redirect } from "next/navigation";
import { ownerOf, wsBySub } from "./demo-data";
import type { Session } from "./types";

export const USABLE = ["trial", "active", "grace"];
export const isUsable = (status: string) => USABLE.includes(status);

/** Loads a customer CRM by its domain name. In UI-only mode you are always its owner. */
export async function getWorkspaceAccess(sub: string) {
  const ws = wsBySub(sub);
  if (!ws) notFound();
  const owner = ownerOf(ws)!;
  const s: Session = { uid: owner._id, role: "customer", name: owner.name, email: owner.email };
  return { ws, s, role: "owner" as "owner" | "admin" | "member" | "superadmin" };
}

/** Same as above but sends the user to Billing when the plan is locked / unpaid. */
export async function getUsableWorkspace(sub: string) {
  const access = await getWorkspaceAccess(sub);
  if (!isUsable(access.ws.status)) redirect(`${wsBase(sub)}/billing`);
  return access;
}

/** URL prefix for links inside a customer CRM. */
export const wsBase = (sub: string) => `/w/${sub}`;

export const canManage = (role: string) => role === "owner" || role === "admin" || role === "superadmin";
