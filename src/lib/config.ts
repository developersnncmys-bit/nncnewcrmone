import "server-only";

/** Settings the app cannot run without. Shown (names only, never values) on the admin login page. */
const REQUIRED = [
  ["MONGODB_URI", "MongoDB Atlas connection string"],
  ["AUTH_SECRET", "long random text used to sign logins"],
  ["SUPERADMIN_EMAIL", "owner login email"],
  ["SUPERADMIN_PASSWORD", "owner login password"],
] as const;

export function missingEnv() {
  return REQUIRED.filter(([k]) => !process.env[k]).map(([k, why]) => ({ key: k, why }));
}

/** Turns low-level errors into a message the owner can act on. */
export function explainError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/MONGODB_URI is not set/.test(msg)) return "MONGODB_URI is not set in Vercel → Settings → Environment Variables.";
  if (/AUTH_SECRET/.test(msg)) return "AUTH_SECRET is not set in Vercel → Settings → Environment Variables.";
  if (/authentication failed|bad auth/i.test(msg)) return "MongoDB rejected the username/password in MONGODB_URI.";
  if (/ENOTFOUND|querySrv|Invalid scheme|URI/i.test(msg)) return "MONGODB_URI looks wrong. Copy the mongodb+srv://… link again from MongoDB Atlas.";
  if (/Server selection timed out|timed out|ECONNREFUSED|whitelist|IP/i.test(msg))
    return "Cannot reach MongoDB. In MongoDB Atlas → Network Access, allow 0.0.0.0/0 (Vercel has no fixed IP).";
  return `Server error: ${msg.slice(0, 200)}`;
}
