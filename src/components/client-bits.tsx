"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";
import type { FormState } from "@/app/actions/auth";

export type NavItem = { href: string; label: string; icon: string; exact?: boolean };

export function SideNav({ items, accent }: { items: NavItem[]; accent: string }) {
  const path = usePathname();
  const active = (i: NavItem) => {
    const href = i.href || "/";
    return i.exact ? path === href || path === `${href}/` : path === href || path.startsWith(`${href}/`);
  };
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {items.map((i) => (
        <Link
          key={i.href + i.label}
          href={i.href || "/"}
          className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${active(i) ? accent : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
        >
          <Icon name={i.icon} size={17} />
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** <select> that submits its form as soon as the value changes (board status moves). */
export function AutoSubmitSelect({ name, value, options }: { name: string; value: string; options: string[] }) {
  return (
    <select
      name={name}
      defaultValue={value}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
    >
      {!options.includes(value) && <option value="">—</option>}
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

export function ConfirmButton({ children, message, className }: { children: ReactNode; message: string; className?: string }) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn btn-primary no-print">
      Print / Save PDF
    </button>
  );
}

export function TeamForm({ action }: { action: (s: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Name</label>
        <input name="name" required className="input" />
      </div>
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" required className="input" />
      </div>
      <div>
        <label className="label">Password (for new users)</label>
        <input name="password" type="text" minLength={6} className="input" placeholder="min 6 characters" />
      </div>
      <div>
        <label className="label">Role</label>
        <select name="role" className="input">
          <option value="member">Member</option>
          <option value="admin">Admin (can manage billing & team)</option>
        </select>
      </div>
      {state?.error && <p className="text-sm text-rose-600 sm:col-span-2">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600 sm:col-span-2">{state.message}</p>}
      <div className="sm:col-span-2">
        <button disabled={pending} className="btn btn-primary">
          {pending ? "Adding…" : "Add member"}
        </button>
      </div>
    </form>
  );
}

export type AdminNavItem = { href: string; label: string; icon: string; exact?: boolean; badge?: number; tone?: "red" | "blue" };

/** Dark sidebar navigation for the admin panel, grouped in sections with count badges. */
export function AdminSideNav({ sections }: { sections: { title: string; items: AdminNavItem[] }[] }) {
  const path = usePathname();
  const isActive = (i: AdminNavItem) => {
    if (i.exact) return path === i.href;
    // "/admin/workspaces" must not light up on "/admin/workspaces/new"
    if (i.href === "/admin/workspaces") return path === i.href || (path.startsWith(`${i.href}/`) && !path.endsWith("/new"));
    return path === i.href || path.startsWith(`${i.href}/`);
  };
  return (
    <nav className="space-y-5">
      {sections.map((s) => (
        <div key={s.title}>
          <div className="mb-1.5 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">{s.title}</div>
          <div className="space-y-0.5">
            {s.items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive(i) ? "bg-indigo-600 text-white shadow-[0_6px_16px_rgba(11,92,255,0.35)]" : "text-slate-300/80 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon name={i.icon} size={17} />
                <span className="flex-1">{i.label}</span>
                {!!i.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${i.tone === "red" ? "bg-rose-500 text-white" : "bg-indigo-500 text-white"}`}>
                    {i.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Downloads the given rows as a CSV file (opens in Excel). Built in the browser, no server needed. */
export function ExportButton({ filename, rows, className, children }: { filename: string; rows: (string | number)[][]; className?: string; children: ReactNode }) {
  function download() {
    const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button type="button" onClick={download} className={className}>
      {children}
    </button>
  );
}

/**
 * Popup dialog shown over the page. It is opened by a link that adds ?view=<id> to the URL,
 * and closes (✕, click outside, Esc) by going to `closeHref`.
 */
export function Modal({ closeHref, title, subtitle, children, footer }: { closeHref: string; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.push(closeHref, { scroll: false });
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [closeHref, router]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <Link href={closeHref} scroll={false} aria-label="Close" className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
          </div>
          <Link href={closeHref} scroll={false} aria-label="Close" className="-mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icon name="X" size={18} />
          </Link>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-3">{footer}</div>}
      </div>
    </div>
  );
}
