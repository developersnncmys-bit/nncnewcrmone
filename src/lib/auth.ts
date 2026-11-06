import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { signToken, verifyToken, type Session } from "./token";

export type { Session };
const COOKIE = "session";

export async function createSession(s: Session) {
  const token = await signToken(s);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 86400,
    // e.g. ".yourcrm.com" so the login works on every customer subdomain
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
}

export async function destroySession() {
  (await cookies()).set(COOKIE, "", { path: "/", maxAge: 0, domain: process.env.COOKIE_DOMAIN || undefined });
}

export async function getSession() {
  return verifyToken((await cookies()).get(COOKIE)?.value);
}

export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/");
  return s;
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  if (s.role !== "superadmin") notFound(); // customers never learn the admin area exists
  return s;
}
