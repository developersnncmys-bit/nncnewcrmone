// UI-only mode: there are no real logins. The admin panel always shows the demo admin.
import { ADMIN_SESSION } from "./demo-data";
import type { Session } from "./types";

export type { Session };

export async function getSession(): Promise<Session | null> {
  return ADMIN_SESSION;
}

export async function requireAdmin(): Promise<Session> {
  return ADMIN_SESSION;
}
