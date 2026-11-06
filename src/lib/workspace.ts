import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "./db";
import { Workspace } from "./models";
import type { Session } from "./token";

export const USABLE = ["trial", "active", "grace"];
export const isUsable = (status: string) => USABLE.includes(status);

/** Loads a workspace by subdomain and checks the user is owner / member / super admin. */
export async function getWorkspaceAccess(sub: string, s: Session) {
  await db();
  const ws = await Workspace.findOne({ subdomain: sub.toLowerCase() }).lean();
  if (!ws) notFound();
  const isOwner = String(ws.owner) === s.uid;
  const member = ws.members.find((m) => String(m.user) === s.uid);
  if (!isOwner && !member && s.role !== "superadmin") notFound();
  const role = isOwner ? "owner" : member ? member.role : "superadmin";
  return { ws, role: role as "owner" | "admin" | "member" | "superadmin" };
}

/** Same as above but sends the user to Billing when the plan is locked / unpaid. */
export async function getUsableWorkspace(sub: string, s: Session) {
  const access = await getWorkspaceAccess(sub, s);
  if (!isUsable(access.ws.status)) redirect(`${await wsBase(sub)}/billing`);
  return access;
}

/**
 * URL prefix for links inside a workspace: "" when the request came in on the
 * customer's subdomain (abc.yourcrm.com/billing), "/w/abc" otherwise.
 */
export async function wsBase(sub: string) {
  const host = ((await headers()).get("host") || "").toLowerCase();
  return host.startsWith(`${sub.toLowerCase()}.`) ? "" : `/w/${sub}`;
}

export const canManage = (role: string) => role === "owner" || role === "admin" || role === "superadmin";
