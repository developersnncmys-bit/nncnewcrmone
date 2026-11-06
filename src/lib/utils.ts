// Shared helpers (safe for both server and client components).

export const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "NNC CRM";
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const USE_SUBDOMAINS = process.env.NEXT_PUBLIC_USE_SUBDOMAINS === "true";
export const DAY = 86_400_000;

export const inr = (n: number | null | undefined) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const fmtDate = (d?: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtDateTime = (d?: Date | string | null) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "https://nncdigital.co.in";

// Billing terms (same as the nncdigital.co.in pricing page). GST is added on top.
export const CYCLE_LIST = [
  { key: "quarterly", label: "Quarterly", per: "/ quarter", every: "every 3 months", months: 3 },
  { key: "halfyearly", label: "Half yearly", per: "/ 6 months", every: "every 6 months", months: 6 },
  { key: "yearly", label: "Yearly", per: "/ year", every: "every year", months: 12 },
] as const;
const cycleInfo = (c: string) => CYCLE_LIST.find((x) => x.key === c) ?? CYCLE_LIST[2];
export const cycleMonths = (c: string) => cycleInfo(c).months;
export const cyclePer = (c: string) => cycleInfo(c).per;
export const cycleEvery = (c: string) => cycleInfo(c).every;

export const GST_RATE = Number(process.env.NEXT_PUBLIC_GST_RATE ?? 18);
export const withGst = (base: number) => {
  const gst = Math.round(base * GST_RATE) / 100;
  return { base, rate: GST_RATE, gst, total: Math.round((base + gst) * 100) / 100 };
};

export function addCycle(start: Date, cycle: string) {
  const d = new Date(start);
  d.setMonth(d.getMonth() + cycleMonths(cycle));
  return d;
}

export const daysLeft = (end?: Date | string | null) =>
  end ? Math.ceil((new Date(end).getTime() - Date.now()) / DAY) : 0;

export const cycleLabel = (c: string) => cycleInfo(c).label;
export const tierLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const RESERVED = [
  "www", "admin", "api", "app", "mail", "smtp", "dashboard", "login", "signup", "w", "static",
  "assets", "billing", "support", "help", "blog", "pay", "status", "docs",
];

export function validateSubdomain(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const v = (input || "").trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/.test(v))
    return { ok: false, error: "Use 3–32 lowercase letters, numbers or hyphens (no hyphen at the start or end)." };
  if (RESERVED.includes(v)) return { ok: false, error: "This name is reserved. Please choose another." };
  return { ok: true, value: v };
}

/** Display host of a workspace, e.g. abctravels.yourcrm.com */
export const workspaceHost = (sub: string) => `${sub}.${ROOT_DOMAIN}`;

/** Link to open a workspace (subdomain in production, /w/<sub> path in local dev). */
export function workspaceUrl(sub: string) {
  if (USE_SUBDOMAINS) {
    const proto = APP_URL.startsWith("https") ? "https" : "http";
    return `${proto}://${workspaceHost(sub)}`;
  }
  return `/w/${sub}`;
}

/** Absolute link, used inside emails. */
export const absWorkspaceUrl = (sub: string, path = "") => {
  const u = workspaceUrl(sub);
  return (u.startsWith("http") ? u : APP_URL + u) + path;
};

export const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

