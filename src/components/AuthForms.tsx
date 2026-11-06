"use client";
import { useActionState } from "react";
import { adminLoginAction, changePasswordAction, type FormState } from "@/app/actions/auth";

type Action = (s: FormState, fd: FormData) => Promise<FormState>;

function LoginFields({ action, next, label }: { action: Action; next?: string; label: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {next !== undefined && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" required className="input" autoFocus />
      </div>
      <div>
        <label className="label">Password</label>
        <input name="password" type="password" required className="input" />
      </div>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <button disabled={pending} className="btn btn-primary w-full">
        {pending ? "Signing in…" : label}
      </button>
    </form>
  );
}

/** Login form of one customer CRM. `action` is workspaceLoginAction bound to the subdomain. */
export function WorkspaceLoginForm({ action, next }: { action: Action; next?: string }) {
  return <LoginFields action={action} next={next ?? ""} label="Log in" />;
}

export function AdminLoginForm() {
  return <LoginFields action={adminLoginAction} label="Sign in" />;
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, undefined);
  return (
    <form action={action} className="max-w-sm space-y-4">
      <div>
        <label className="label">Current password</label>
        <input name="current" type="password" required className="input" />
      </div>
      <div>
        <label className="label">New password</label>
        <input name="password" type="password" required minLength={6} className="input" />
      </div>
      <div>
        <label className="label">Confirm new password</label>
        <input name="confirm" type="password" required minLength={6} className="input" />
      </div>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">{state.message}</p>}
      <button disabled={pending} className="btn btn-primary">
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
