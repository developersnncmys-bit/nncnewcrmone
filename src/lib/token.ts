// Edge-safe JWT helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export type Session = { uid: string; role: "superadmin" | "customer"; name: string; email: string };

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET environment variable is required in production");
  return new TextEncoder().encode(s || "dev-only-secret-change-me");
};

export async function signToken(s: Session) {
  return new SignJWT(s).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
}

export async function verifyToken(token?: string | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { uid: String(payload.uid), role: payload.role as Session["role"], name: String(payload.name), email: String(payload.email) };
  } catch {
    return null;
  }
}
