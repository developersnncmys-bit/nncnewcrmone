"use server";
// UI-only mode: any email + password signs in. Nothing is checked or stored.
import { redirect } from "next/navigation";
import { wsBase } from "@/lib/workspace";

export type FormState = { error?: string; ok?: boolean; message?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function workspaceLoginAction(sub: string, _: FormState, fd: FormData): Promise<FormState> {
  if (!str(fd, "email") || !str(fd, "password")) return { error: "Enter your email and password." };
  const next = str(fd, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : wsBase(sub));
}

export async function workspaceLogoutAction(sub: string) {
  redirect(`${wsBase(sub)}/login`);
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const next = str(fd, "password");
  if (next.length < 6) return { error: "New password must be at least 6 characters." };
  if (next !== str(fd, "confirm")) return { error: "The two new passwords do not match." };
  return { ok: true, message: "Password changed. (Demo – nothing is saved.)" };
}

export async function adminLoginAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!str(fd, "email") || !str(fd, "password")) return { error: "Enter your email and password." };
  redirect("/admin");
}

export async function adminLogoutAction() {
  redirect("/admin/login");
}
