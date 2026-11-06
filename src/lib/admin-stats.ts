import "server-only";
import { renewalPlanFor } from "./billing";
import { db } from "./db";
import { EmailLog, Lead, Payment, Workspace } from "./models";
import { DAY, withGst } from "./utils";

export const RENEWAL_TABS = [
  { key: "due", label: "Due in 30 days", hint: "Active plans ending soon" },
  { key: "grace", label: "Expired · grace", hint: "Plan ended, still usable for a few days" },
  { key: "lapsed", label: "Lapsed · locked", hint: "Not renewed, CRM is locked" },
  { key: "pending", label: "First payment pending", hint: "CRM created, never paid" },
  { key: "renewed", label: "Renewed (30 days)", hint: "Renewed in the last 30 days" },
] as const;
export type RenewalTab = (typeof RENEWAL_TABS)[number]["key"];

const OWNER = "name email phone";

/** Workspaces in each renewal bucket, with the amount due (incl. GST) and the last reminder sent. */
export async function renewalBuckets() {
  await db();
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * DAY);
  const [due, grace, lapsed, pending, renewedPays] = await Promise.all([
    Workspace.find({ status: "active", currentPeriodEnd: { $lte: in30 } }).sort({ currentPeriodEnd: 1 }).populate("owner", OWNER).lean(),
    Workspace.find({ status: "grace" }).sort({ graceEndsAt: 1 }).populate("owner", OWNER).lean(),
    Workspace.find({ status: "locked", currentPeriodStart: { $ne: null } }).sort({ currentPeriodEnd: -1 }).populate("owner", OWNER).lean(),
    Workspace.find({ status: "pending" }).sort({ createdAt: -1 }).populate("owner", OWNER).lean(),
    Payment.find({ status: "paid", kind: "renewal", paidAt: { $gte: new Date(now.getTime() - 30 * DAY) } }).sort({ paidAt: -1 }).lean(),
  ]);
  const renewedWs = await Workspace.find({ _id: { $in: renewedPays.map((p) => p.workspace) } }).populate("owner", OWNER).lean();

  const all = [...due, ...grace, ...lapsed, ...pending, ...renewedWs];
  const reminders = await EmailLog.aggregate<{ _id: unknown; at: Date; type: string }>([
    { $match: { workspace: { $in: all.map((w) => w._id) }, type: { $regex: /^(reminder_|expired|locked|payment_link|welcome)/ } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$workspace", at: { $first: "$createdAt" }, type: { $first: "$type" } } },
  ]);
  const lastMail = new Map(reminders.map((r) => [String(r._id), r]));

  const enrich = async (list: typeof due) =>
    Promise.all(
      list.map(async (w) => {
        const r = await renewalPlanFor(w);
        return {
          ws: w,
          owner: w.owner as unknown as { name: string; email: string; phone: string } | null,
          next: r,
          dueTotal: withGst(r.amount).total,
          lastMail: lastMail.get(String(w._id)) ?? null,
        };
      }),
    );

  const renewed = renewedWs.map((w) => {
    const p = renewedPays.find((x) => String(x.workspace) === String(w._id))!;
    return { ws: w, owner: w.owner as unknown as { name: string; email: string; phone: string } | null, payment: p };
  });

  return {
    due: await enrich(due),
    grace: await enrich(grace),
    lapsed: await enrich(lapsed),
    pending: await enrich(pending),
    renewed,
  };
}

/** Small counts for the sidebar badges. */
export async function navCounts() {
  await db();
  const in30 = new Date(Date.now() + 30 * DAY);
  const [due, grace, newLeads] = await Promise.all([
    Workspace.countDocuments({ status: "active", currentPeriodEnd: { $lte: in30 } }),
    Workspace.countDocuments({ status: { $in: ["grace"] } }),
    Lead.countDocuments({ status: "new" }),
  ]);
  return { renewals: due + grace, newLeads };
}
