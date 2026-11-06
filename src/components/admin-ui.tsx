"use client";
import Link from "next/link";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { checkSubdomain } from "@/app/actions/checkout";
import { createCustomer, type AdminResult } from "@/app/actions/admin";
import { CYCLE_LIST, inr, withGst } from "@/lib/utils";

type Opt = { key: string; name: string };
type PlanOpt = { tier: string; name: string; maxUsers: number; prices: Record<string, number> };

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);

/** Shows the result of an admin action: message + copyable details (password, payment link …). */
export function ResultPanel({ state }: { state: AdminResult }) {
  const [copied, setCopied] = useState("");
  if (!state) return null;
  if (state.error) return <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>;
  const rows = (state.details ?? []).filter(([k]) => !k.startsWith("__"));
  return (
    <div className="mt-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
      <div className="font-medium">{state.message}</div>
      {rows.length > 0 && (
        <dl className="mt-3 space-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <dt className="w-32 shrink-0 text-emerald-700">{k}</dt>
              <dd className="min-w-0 flex-1 font-mono text-xs break-all">{v}</dd>
              {(v.startsWith("http") || k === "Password") && (
                <button
                  type="button"
                  className="btn btn-sm border border-emerald-300 bg-white"
                  onClick={() => {
                    navigator.clipboard?.writeText(v);
                    setCopied(k);
                  }}
                >
                  {copied === k ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** A button that runs a bound admin action and shows its result underneath. */
export function ActionButton({
  action,
  children,
  className = "btn btn-outline",
  confirmText,
}: {
  action: (s: AdminResult, fd: FormData) => Promise<AdminResult>; // bound server action
  children: ReactNode;
  className?: string;
  confirmText?: string;
}) {
  const [state, run, pending] = useActionState<AdminResult, FormData>(action, undefined);
  return (
    <form action={run}>
      <button
        className={className}
        disabled={pending}
        onClick={(e) => {
          if (confirmText && !confirm(confirmText)) e.preventDefault();
        }}
      >
        {pending ? "Please wait…" : children}
      </button>
      <ResultPanel state={state} />
    </form>
  );
}

/** Small form wrapper with result panel (change plan, edit details …). */
export function ResultForm({
  action,
  children,
  className,
}: {
  action: (s: AdminResult, fd: FormData) => Promise<AdminResult>;
  children: ReactNode;
  className?: string;
}) {
  const [state, run] = useActionState<AdminResult, FormData>(action, undefined);
  return (
    <form action={run} className={className}>
      {children}
      <div className="sm:col-span-2">
        <ResultPanel state={state} />
      </div>
    </form>
  );
}

/** Submit button that shows "Please wait…" while its form is submitting. */
export function SubmitButton({ children, className = "btn btn-primary" }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={className}>
      {pending ? "Please wait…" : children}
    </button>
  );
}

/** Admin: create a new customer CRM (company, domain, plan, billing term) and send the payment link. */
export function NewCustomerForm(props: {
  products: Opt[];
  plans: PlanOpt[];
  rootDomain: string;
  defaults: { leadId?: string; companyName?: string; contactName?: string; email?: string; phone?: string; product?: string };
}) {
  const [state, action, pending] = useActionState<AdminResult, FormData>(createCustomer, undefined);
  const [company, setCompany] = useState(props.defaults.companyName ?? "");
  const [sub, setSub] = useState(slug(props.defaults.companyName ?? ""));
  const [subEdited, setSubEdited] = useState(false);
  const [check, setCheck] = useState<{ s: "idle" | "checking" | "ok" | "err"; msg?: string }>({ s: "idle" });
  const [tier, setTier] = useState("growth");
  const [cycle, setCycle] = useState("yearly");

  useEffect(() => {
    if (!sub) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setCheck({ s: "checking" });
      const r = await checkSubdomain(sub);
      if (!cancelled) setCheck(r.ok ? { s: "ok" } : { s: "err", msg: r.error });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [sub]);

  const createdId = state?.ok ? state.details?.find(([k]) => k === "__id")?.[1] : undefined;
  if (state?.ok) {
    return (
      <div className="card p-6">
        <ResultPanel state={state} />
        <div className="mt-4 flex gap-2">
          {createdId && (
            <Link href={`/admin/workspaces/${createdId}`} className="btn btn-primary">
              Open customer
            </Link>
          )}
          {/* full reload on purpose: resets the form */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/admin/workspaces/new" className="btn btn-outline">
            Add another customer
          </a>
        </div>
      </div>
    );
  }

  const plan = props.plans.find((p) => p.tier === tier) ?? props.plans[0];
  const g = withGst(plan.prices[cycle] ?? 0);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <input type="hidden" name="leadId" value={props.defaults.leadId ?? ""} />
      <input type="hidden" name="tier" value={tier} />
      <input type="hidden" name="cycle" value={cycle} />
      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="mb-4 font-semibold text-slate-900">1. Customer</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Company name *</label>
              <input
                name="companyName"
                required
                className="input"
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  if (!subEdited) setSub(slug(e.target.value));
                }}
              />
            </div>
            <div>
              <label className="label">Contact person *</label>
              <input name="contactName" required className="input" defaultValue={props.defaults.contactName} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" className="input" defaultValue={props.defaults.phone} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email * (customer logs in with this)</label>
              <input name="email" type="email" required className="input" defaultValue={props.defaults.email} />
            </div>
            <div>
              <label className="label">GSTIN (for invoice)</label>
              <input name="gstin" className="input uppercase" placeholder="29ABCDE1234F1Z5" />
            </div>
            <div>
              <label className="label">State</label>
              <input name="state" className="input" placeholder="Karnataka" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Billing address</label>
              <textarea name="address" rows={2} className="input" />
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-semibold text-slate-900">2. CRM & domain</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Product *</label>
              <select name="product" className="input" defaultValue={props.defaults.product || props.products[0].key}>
                {props.products.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Domain *</label>
              <div className="flex overflow-hidden rounded-lg border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                <input
                  name="subdomain"
                  required
                  value={sub}
                  onChange={(e) => {
                    setSubEdited(true);
                    setSub(slug(e.target.value));
                    if (!e.target.value) setCheck({ s: "idle" });
                  }}
                  className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
                  placeholder="abctravels"
                />
                <span className="flex items-center bg-slate-50 px-2 text-xs text-slate-500">.{props.rootDomain}</span>
              </div>
              <div className="mt-1 min-h-5 text-xs">
                {check.s === "checking" && <span className="text-slate-500">Checking…</span>}
                {check.s === "ok" && <span className="text-emerald-600">✓ Available</span>}
                {check.s === "err" && <span className="text-rose-600">{check.msg}</span>}
              </div>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="mb-4 font-semibold text-slate-900">3. Plan & billing term</h2>
          <div className="mb-4 inline-flex flex-wrap rounded-full border border-slate-200 bg-white p-1 text-sm">
            {CYCLE_LIST.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCycle(c.key)}
                className={`cursor-pointer rounded-full px-4 py-1.5 font-medium ${cycle === c.key ? "bg-indigo-600 text-white" : "text-slate-600"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {props.plans.map((p) => (
              <button
                type="button"
                key={p.tier}
                onClick={() => setTier(p.tier)}
                className={`cursor-pointer rounded-xl border p-4 text-left ${tier === p.tier ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-slate-200"}`}
              >
                <div className="font-semibold text-slate-900">{p.name}</div>
                <div className="mt-1 text-lg font-bold">{inr(p.prices[cycle])}</div>
                <div className="text-xs text-slate-500">+ GST · {p.maxUsers} user{p.maxUsers === 1 ? "" : "s"}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <label className="label">Internal notes</label>
          <textarea name="notes" rows={2} className="input" placeholder="Only visible to you" />
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="card p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Domain</dt>
              <dd className="truncate pl-2 font-medium">{sub ? `${sub}.${props.rootDomain}` : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Plan</dt>
              <dd className="font-medium">
                {plan.name} · {CYCLE_LIST.find((c) => c.key === cycle)?.label}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <dt className="text-slate-500">Price</dt>
              <dd>{inr(g.base)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">GST {g.rate}%</dt>
              <dd>{inr(g.gst)}</dd>
            </div>
            <div className="flex justify-between text-base">
              <dt className="text-slate-500">Total</dt>
              <dd className="font-bold">{inr(g.total)}</dd>
            </div>
          </dl>
          <label className="mt-5 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="notify" defaultChecked /> Email login details + payment link to customer
          </label>
          <ResultPanel state={state} />
          <button disabled={pending || check.s !== "ok"} className="btn btn-primary mt-4 w-full">
            {pending ? "Creating…" : "Create CRM & payment link"}
          </button>
          <p className="mt-2 text-xs text-slate-500">The CRM opens for the customer after the first payment.</p>
        </div>
      </aside>
    </form>
  );
}
