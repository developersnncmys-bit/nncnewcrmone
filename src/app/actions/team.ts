"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { emailLayout, sendEmail } from "@/lib/mail";
import { User, Workspace } from "@/lib/models";
import { getPlan } from "@/lib/plans";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { workspaceHost } from "@/lib/utils";
import { loginUrl } from "@/lib/billing";
import { canManage, getUsableWorkspace } from "@/lib/workspace";
import type { FormState } from "./auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function addMember(sub: string, _: FormState, fd: FormData): Promise<FormState> {
  const s = await requireUser();
  const { ws, role } = await getUsableWorkspace(sub, s);
  if (!canManage(role)) return { error: "Only the owner or an admin can add team members." };

  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const memberRole = str(fd, "role") === "admin" ? "admin" : "member";
  if (!name || !email) return { error: "Name and email are required." };

  const plan = await getPlan(ws.product, ws.plan.tier);
  const maxUsers = plan?.maxUsers ?? 3;
  if (ws.members.length + 1 >= maxUsers) {
    return { error: `Your ${plan?.name ?? ""} plan allows ${maxUsers} users. Upgrade the plan from Billing to add more.` };
  }

  let user = await User.findOne({ email });
  if (!user) {
    if (password.length < 6) return { error: "New users need a password of at least 6 characters." };
    user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
  }
  if (String(user._id) === String(ws.owner) || ws.members.some((m) => String(m.user) === String(user._id))) {
    return { error: "This user is already in the team." };
  }
  await Workspace.updateOne({ _id: ws._id }, { $push: { members: { user: user._id, role: memberRole } } });

  await sendEmail({
    to: email,
    type: "team_invite",
    workspace: ws._id,
    subject: `You were added to ${ws.companyName} on ${PRODUCTS[ws.product as ProductKey].name}`,
    html: emailLayout({
      title: "You have been added to a team",
      intro: `${s.name} added you to ${ws.companyName} (${workspaceHost(ws.subdomain)}).`,
      rows: [["Login email", email], ...(password ? ([["Temporary password", password]] as [string, string][]) : [])],
      cta: { label: "Log in", url: loginUrl(ws.subdomain) },
    }),
  });

  revalidatePath(`/w/${sub}/team`);
  return { ok: true, message: `${name} was added to the team.` };
}

export async function removeMember(sub: string, userId: string) {
  const s = await requireUser();
  const { ws, role } = await getUsableWorkspace(sub, s);
  if (!canManage(role)) throw new Error("Not allowed");
  await Workspace.updateOne({ _id: ws._id }, { $pull: { members: { user: userId } } });
  revalidatePath(`/w/${sub}/team`);
}
