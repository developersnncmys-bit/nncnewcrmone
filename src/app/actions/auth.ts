"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { User, Workspace } from "@/lib/models";
import { ROOT_DOMAIN } from "@/lib/utils";
import { wsBase } from "@/lib/workspace";
import { explainError } from "@/lib/config";

export type FormState = { error?: string; ok?: boolean; message?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Only allow redirects to our own pages / customer subdomains. */
function safeNext(next: string) {
  if (!next) return "";
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  try {
    const u = new URL(next);
    const root = ROOT_DOMAIN.toLowerCase();
    if (u.host === root || u.host.endsWith(`.${root}`)) return u.toString();
  } catch {}
  return "";
}

/** Login page of one customer CRM (abc.nnccrm.com/login). Only that CRM's owner / team can log in. */
export async function workspaceLoginAction(sub: string, _: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  await db();
  const ws = await Workspace.findOne({ subdomain: sub.toLowerCase() }).lean();
  const user = await User.findOne({ email, role: "customer" });
  const ok = !!ws && !!user && (await bcrypt.compare(password, user.passwordHash));
  const belongs = ok && (String(ws!.owner) === String(user!._id) || ws!.members.some((m) => String(m.user) === String(user!._id)));
  if (!ok || !belongs) return { error: "Invalid email or password." };

  await createSession({ uid: String(user!._id), role: "customer", name: user!.name, email: user!.email });
  const base = await wsBase(sub);
  redirect(safeNext(str(fd, "next")) || base || "/");
}

export async function workspaceLogoutAction(sub: string) {
  await destroySession();
  redirect(`${await wsBase(sub)}/login`);
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("password") ?? "");
  if (next.length < 6) return { error: "New password must be at least 6 characters." };
  if (next !== String(fd.get("confirm") ?? "")) return { error: "The two new passwords do not match." };
  await db();
  const user = await User.findById(s.uid);
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) return { error: "Current password is wrong." };
  user.passwordHash = await bcrypt.hash(next, 10);
  await user.save();
  return { ok: true, message: "Password changed." };
}

/** Owner login (/admin/login). Only the super admin account works here. */
export async function adminLoginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  let user;
  try {
    await db();
    user = await User.findOne({ email, role: "superadmin" });
  } catch (e) {
    console.error("[admin login]", e);
    return { error: explainError(e) };
  }
  // First login on a fresh database (e.g. new Vercel deploy): create the owner account
  // from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD, but only if no admin exists yet.
  const envEmail = (process.env.SUPERADMIN_EMAIL || "").toLowerCase();
  const envPass = process.env.SUPERADMIN_PASSWORD || "";
  if (!user && envEmail && envPass && email === envEmail && password === envPass && !(await User.exists({ role: "superadmin" }))) {
    user = await User.findOneAndUpdate(
      { email },
      { $set: { role: "superadmin", passwordHash: await bcrypt.hash(envPass, 10) }, $setOnInsert: { name: "Admin", email } },
      { upsert: true, new: true },
    );
  }
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Invalid email or password." };
  try {
    await createSession({ uid: String(user._id), role: "superadmin", name: user.name, email: user.email });
  } catch (e) {
    return { error: explainError(e) };
  }
  redirect("/admin");
}

export async function adminLogoutAction() {
  await destroySession();
  redirect("/admin/login");
}
