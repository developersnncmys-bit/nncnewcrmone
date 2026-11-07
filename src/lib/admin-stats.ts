import { renewalPlanFor } from "./billing";
import { EMAILS, LEADS, PAYMENTS, WORKSPACES, ownerOf, wsById } from "./demo-data";
import type { WorkspaceT } from "./types";
import { DAY, withGst } from "./utils";

export const RENEWAL_TABS = [
  { key: "due", label: "Due in 30 days", hint: "Active plans ending soon" },
  { key: "grace", label: "Expired · grace", hint: "Plan ended, still usable for a few days" },
  { key: "lapsed", label: "Lapsed · locked", hint: "Not renewed, CRM is locked" },
  { key: "pending", label: "First payment pending", hint: "CRM created, never paid" },
  { key: "renewed", label: "Renewed (30 days)", hint: "Renewed in the last 30 days" },
] as const;
export type RenewalTab = (typeof RENEWAL_TABS)[number]["key"];

const MAIL_TYPES = /^(reminder_|expired|locked|payment_link|welcome)/;
const time = (d: Date | null) => (d ? d.getTime() : 0);

/** Customers in each renewal bucket, with the amount due (incl. GST) and the last reminder sent. */
export function renewalBuckets() {
  const now = Date.now();
  const in30 = now + 30 * DAY;
  const by = (f: (w: WorkspaceT) => boolean, sort: (a: WorkspaceT, b: WorkspaceT) => number) => WORKSPACES.filter(f).sort(sort);

  const enrich = (list: WorkspaceT[]) =>
    list.map((ws) => {
      const next = renewalPlanFor(ws);
      const last = EMAILS.find((m) => m.workspace === ws._id && MAIL_TYPES.test(m.type));
      return {
        ws,
        owner: ownerOf(ws),
        next,
        dueTotal: withGst(next.amount).total,
        lastMail: last ? { at: last.createdAt, type: last.type } : null,
      };
    });

  const renewed = PAYMENTS.filter((p) => p.status === "paid" && p.kind === "renewal" && time(p.paidAt) >= now - 30 * DAY)
    .sort((a, b) => time(b.paidAt) - time(a.paidAt))
    .map((payment) => ({ ws: wsById(payment.workspace)!, owner: ownerOf(wsById(payment.workspace)!), payment }));

  return {
    due: enrich(by((w) => w.status === "active" && time(w.currentPeriodEnd) <= in30, (a, b) => time(a.currentPeriodEnd) - time(b.currentPeriodEnd))),
    grace: enrich(by((w) => w.status === "grace", (a, b) => time(a.graceEndsAt) - time(b.graceEndsAt))),
    lapsed: enrich(by((w) => w.status === "locked" && !!w.currentPeriodStart, (a, b) => time(b.currentPeriodEnd) - time(a.currentPeriodEnd))),
    pending: enrich(by((w) => w.status === "pending", (a, b) => +b.createdAt - +a.createdAt)),
    renewed,
  };
}

/** Small counts for the sidebar badges. */
export function navCounts() {
  const in30 = Date.now() + 30 * DAY;
  const due = WORKSPACES.filter((w) => w.status === "active" && time(w.currentPeriodEnd) <= in30).length;
  const grace = WORKSPACES.filter((w) => w.status === "grace").length;
  return { renewals: due + grace, newLeads: LEADS.filter((l) => l.status === "new").length };
}
