import "server-only";
import crypto from "crypto";
import Razorpay from "razorpay";

export const razorpayEnabled = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

let client: Razorpay | null = null;
function rzp() {
  client ??= new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
  return client;
}

/** Creates a Razorpay order. amount is in rupees. */
export async function createOrder(amountInr: number, receipt: string, notes: Record<string, string>) {
  const order = await rzp().orders.create({
    amount: Math.round(amountInr * 100),
    currency: "INR",
    receipt: receipt.slice(0, 40),
    notes,
  });
  return order.id;
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqual(expected, signature || "");
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature || "");
}
