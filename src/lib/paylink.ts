import "server-only";
import crypto from "crypto";
import { APP_URL } from "./utils";

// Payment links work without logging in: /pay/<paymentId>?t=<token>.
// The token is an HMAC of the payment id, so links cannot be guessed or altered.
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET environment variable is required in production");
  return s || "dev-only-secret-change-me";
};

export const payToken = (paymentId: string) =>
  crypto.createHmac("sha256", secret()).update(`pay:${paymentId}`).digest("hex").slice(0, 32);

export function checkPayToken(paymentId: string, token?: string | null) {
  if (!token) return false;
  const a = Buffer.from(payToken(paymentId));
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const payLink = (paymentId: string) => `${APP_URL}/pay/${paymentId}?t=${payToken(paymentId)}`;
