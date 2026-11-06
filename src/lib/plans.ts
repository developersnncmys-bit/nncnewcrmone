import type { Cycle, Tier } from "./models";

// Fixed plans, same as the nncdigital.co.in pricing page (INR, before GST).
// Same for every product (Travel / Sales / HRMS). To change prices, edit here and redeploy.
export type PlanDef = { tier: Tier; name: string; maxUsers: number; prices: Record<Cycle, number>; features: string[] };

export const PLANS: PlanDef[] = [
  {
    tier: "starter",
    name: "Starter",
    maxUsers: 1,
    prices: { quarterly: 4499, halfyearly: 8499, yearly: 14999 },
    features: ["1 user", "Core CRM modules", "Reports & dashboards", "Email support"],
  },
  {
    tier: "growth",
    name: "Growth",
    maxUsers: 3,
    prices: { quarterly: 8999, halfyearly: 16999, yearly: 29999 },
    features: ["Up to 3 users", "Everything in Starter", "Board / pipeline views", "Priority support"],
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    maxUsers: 10,
    prices: { quarterly: 17999, halfyearly: 33999, yearly: 59999 },
    features: ["Up to 10 users", "Everything in Growth", "Data vault & hourly backups", "Dedicated account manager"],
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getPlans = (_product?: string) => PLANS;
export const getPlan = (_product: string, tier: string) => PLANS.find((p) => p.tier === tier) ?? null;

/** Plan price for a billing term, before GST. */
export const priceFor = (plan: { prices: Record<string, number> }, cycle: string) => Number(plan.prices?.[cycle] ?? 0);
