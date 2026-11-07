import { getPlan, priceFor } from "./plans";
import type { Cycle, Tier } from "./types";
import { absWorkspaceUrl } from "./utils";

export const GRACE_DAYS = 7;
export const REMINDER_DAYS = [7, 3, 1];

/** Login page of a customer's CRM. */
export const loginUrl = (sub: string) => absWorkspaceUrl(sub, "/login");

/** Price + plan that will be charged at the next renewal (scheduled change wins). */
export function renewalPlanFor(ws: { product: string; plan: { tier: string; cycle: string }; scheduledChange?: { tier: string; cycle: string } | null }) {
  const tier = (ws.scheduledChange?.tier || ws.plan.tier) as Tier;
  const cycle = (ws.scheduledChange?.cycle || ws.plan.cycle) as Cycle;
  const plan = getPlan(ws.product, tier);
  return { tier, cycle, amount: plan ? priceFor(plan, cycle) : 0 };
}
