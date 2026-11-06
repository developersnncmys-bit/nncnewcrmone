import type { ReactNode } from "react";

const TONES = {
  slate: "bg-slate-100 text-slate-700",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}

const WS_STATUS: Record<string, [string, Tone]> = {
  pending: ["Payment pending", "amber"],
  trial: ["Free trial", "blue"],
  active: ["Active", "green"],
  grace: ["Expired – grace period", "amber"],
  locked: ["Locked", "red"],
  cancelled: ["Cancelled", "slate"],
};
export function WorkspaceStatus({ status }: { status: string }) {
  const [label, tone] = WS_STATUS[status] ?? [status, "slate"];
  return <Badge tone={tone}>{label}</Badge>;
}

// Colour for CRM record status values (New / Won / Lost / Approved …)
const GOOD = ["won", "booked", "confirmed", "completed", "approved", "paid", "present", "active", "done", "converted", "qualified"];
const BAD = ["lost", "cancelled", "rejected", "absent", "exited", "unqualified", "inactive"];
const WAIT = ["pending", "follow up", "negotiation", "proposal", "quotation sent", "in progress", "half day", "on leave", "on notice"];
export function valueTone(v: string): Tone {
  const s = v.toLowerCase();
  if (GOOD.includes(s)) return "green";
  if (BAD.includes(s)) return "red";
  if (WAIT.includes(s)) return "amber";
  if (s === "new" || s === "open" || s === "prospecting") return "indigo";
  return "slate";
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="font-medium text-slate-800">{title}</div>
      {children && <div className="text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "indigo", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${TONES[tone]}`}>{children}</div>;
}

const KPI_TONES = {
  indigo: "bg-indigo-50 text-indigo-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-rose-50 text-rose-600",
  blue: "bg-sky-50 text-sky-600",
  slate: "bg-slate-100 text-slate-600",
} as const;

/** Dashboard KPI card: icon chip, big value, optional change vs previous period. */
export function Kpi({
  label,
  value,
  icon,
  tone = "indigo",
  hint,
  delta,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: keyof typeof KPI_TONES;
  hint?: ReactNode;
  delta?: number | null;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${KPI_TONES[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
        {delta != null && Number.isFinite(delta) && (
          <span className={`rounded-md px-1.5 py-0.5 font-semibold ${delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
          </span>
        )}
        {hint}
      </div>
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
