import { changeAdminPassword, updateAdminProfile } from "@/app/actions/admin";
import { ResultForm, SubmitButton } from "@/components/admin-ui";
import { Badge, Panel } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { requireAdmin } from "@/lib/auth";
import { GRACE_DAYS, REMINDER_DAYS } from "@/lib/billing";
import { PLANS } from "@/lib/plans";
import { APP_URL, CYCLE_LIST, GST_RATE, ROOT_DOMAIN, USE_SUBDOMAINS, WEBSITE_URL, inr } from "@/lib/utils";

export const metadata = { title: "Settings" };

function Status({ ok, good, bad }: { ok: boolean; good: string; bad: string }) {
  return <Badge tone={ok ? "green" : "amber"}>{ok ? `✓ ${good}` : `! ${bad}`}</Badge>;
}

export default async function SettingsPage() {
  const s = await requireAdmin();
  const rows: [string, React.ReactNode, string][] = [
    ["Razorpay payments", <Status key="r" ok={false} good="Live keys connected" bad="Demo mode – payments are simulated" />, "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET"],
    ["Razorpay webhook", <Status key="w" ok={false} good="Configured" bad="Not configured" />, "RAZORPAY_WEBHOOK_SECRET"],
    ["Email sending (SMTP)", <Status key="m" ok={false} good="Sending" bad="Demo mode – emails are not sent" />, "SMTP_HOST, SMTP_USER, SMTP_PASS"],
    ["New-lead alerts to", s.email, "ADMIN_EMAIL"],
    ["Customer domains", USE_SUBDOMAINS ? `*.${ROOT_DOMAIN}` : `${APP_URL}/w/<name> (local mode)`, "ROOT_DOMAIN"],
    ["Website", WEBSITE_URL, "NEXT_PUBLIC_WEBSITE_URL"],
    ["Invoice company details", "GSTIN 29AAKCN0000A1Z9", "COMPANY_ADDRESS, COMPANY_GSTIN"],
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Your admin account, payment and email connections, plans and renewal rules.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="My profile">
          <ResultForm action={updateAdminProfile} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input name="name" defaultValue={s.name} className="input" required />
            </div>
            <div>
              <label className="label">Login email</label>
              <input name="email" type="email" defaultValue={s.email} className="input" required />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton>Save profile</SubmitButton>
            </div>
          </ResultForm>
        </Panel>

        <Panel title="Change password">
          <ResultForm action={changeAdminPassword} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Current password</label>
              <input name="current" type="password" required className="input" />
            </div>
            <div>
              <label className="label">New password (min 8)</label>
              <input name="password" type="password" minLength={8} required className="input" />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input name="confirm" type="password" minLength={8} required className="input" />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton>Change password</SubmitButton>
            </div>
          </ResultForm>
        </Panel>

        <Panel title="Connections" className="xl:col-span-2">
          <div className="-m-5 overflow-x-auto">
            <table className="w-full">
              <tbody>
                {rows.map(([k, v, env]) => (
                  <tr key={k}>
                    <td className="td font-semibold text-navy">{k}</td>
                    <td className="td">{v}</td>
                    <td className="td font-mono text-xs text-slate-400">{env}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-8 flex items-start gap-2 text-xs text-slate-500">
            <Icon name="ShieldCheck" size={14} className="mt-0.5 shrink-0" />
            UI-only demo: connections are shown for layout only. Nothing is connected.
          </p>
        </Panel>

        <Panel title="Plans and prices (before GST)">
          <div className="-m-5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Plan</th>
                  <th className="th">Users</th>
                  {CYCLE_LIST.map((c) => (
                    <th key={c.key} className="th text-right">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLANS.map((p) => (
                  <tr key={p.tier}>
                    <td className="td font-semibold text-navy">{p.name}</td>
                    <td className="td">{p.maxUsers}</td>
                    {CYCLE_LIST.map((c) => (
                      <td key={c.key} className="td text-right tabular-nums">
                        {inr(p.prices[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-8 text-xs text-slate-500">Same as nncdigital.co.in/pricing. GST {GST_RATE}% is added at checkout.</p>
        </Panel>

        <Panel title="Renewal rules">
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <Icon name="Bell" size={16} className="mt-0.5 shrink-0 text-indigo-600" /> Reminder emails with a payment link {REMINDER_DAYS.join(", ")} days before the plan ends.
            </li>
            <li className="flex gap-3">
              <Icon name="Clock" size={16} className="mt-0.5 shrink-0 text-amber-600" /> After the end date the CRM stays usable for a {GRACE_DAYS}-day grace period.
            </li>
            <li className="flex gap-3">
              <Icon name="Lock" size={16} className="mt-0.5 shrink-0 text-rose-600" /> Then it is locked (data is kept) until the customer pays.
            </li>
            <li className="flex gap-3">
              <Icon name="Check" size={16} className="mt-0.5 shrink-0 text-emerald-600" /> Early renewal adds the new period after the current end date.
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
