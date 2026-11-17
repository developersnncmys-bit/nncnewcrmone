"use client";
import { useActionState, useId, useState, type InputHTMLAttributes } from "react";
import { adminLoginAction, changePasswordAction, type FormState } from "@/app/actions/auth";
import { Icon } from "./Icon";

type Action = (s: FormState, fd: FormData) => Promise<FormState>;

/**
 * Password field with a show / hide (eye) button and a Caps Lock warning.
 * Use it anywhere instead of <input type="password">.
 */
export function PasswordInput({ label, hint, className = "", withIcon = false, ...props }: { label: string; hint?: string; withIcon?: boolean } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const checkCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false);

  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        {withIcon && <Icon name="Lock" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />}
        <input
          id={id}
          type={show ? "text" : "password"}
          className={`input pr-11 ${withIcon ? "pl-9" : ""}`}
          onKeyDown={checkCaps}
          onKeyUp={checkCaps}
          onBlur={() => setCaps(false)}
          spellCheck={false}
          autoCapitalize="none"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          aria-controls={id}
          title={show ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-1.5 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
        >
          <Icon name={show ? "EyeOff" : "Eye"} size={17} />
        </button>
      </div>
      {caps ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-600">
          <Icon name="AlertCircle" size={13} /> Caps Lock is on
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
      <Icon name="AlertCircle" size={16} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

function LoginFields({ action, next, label }: { action: Action; next?: string; label: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined);
  const emailId = useId();
  return (
    <form action={formAction} className="space-y-4">
      {next !== undefined && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor={emailId} className="label">
          Email
        </label>
        <div className="relative">
          <Icon name="Mail" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input id={emailId} name="email" type="email" required autoComplete="username" placeholder="you@company.com" className="input pl-9" autoFocus />
        </div>
      </div>
      <PasswordInput label="Password" name="password" required autoComplete="current-password" placeholder="Enter your password" withIcon />
      {state?.error && <FormError>{state.error}</FormError>}
      <button disabled={pending} className="btn btn-primary w-full disabled:cursor-wait disabled:opacity-80">
        {pending ? (
          <>
            <Icon name="Loader2" size={16} className="animate-spin" /> Signing in…
          </>
        ) : (
          label
        )}
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
      <PasswordInput label="Current password" name="current" required autoComplete="current-password" />
      <PasswordInput label="New password" name="password" required minLength={6} autoComplete="new-password" hint="At least 6 characters." />
      <PasswordInput label="Confirm new password" name="confirm" required minLength={6} autoComplete="new-password" />
      {state?.error && <FormError>{state.error}</FormError>}
      {state?.ok && <p className="text-sm text-emerald-600">{state.message}</p>}
      <button disabled={pending} className="btn btn-primary">
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
