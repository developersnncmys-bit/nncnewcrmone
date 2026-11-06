import { NextResponse } from "next/server";
import { markPaid } from "@/lib/billing";
import { db } from "@/lib/db";
import { Payment } from "@/lib/models";
import { verifyWebhookSignature } from "@/lib/razorpay";

/**
 * Razorpay webhook (Dashboard → Settings → Webhooks):
 *   URL:    https://yourcrm.com/api/payments/webhook
 *   Events: payment.captured, order.paid
 * Makes sure subscriptions activate even if the customer closes the browser
 * right after paying.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") || "")) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string } }; order?: { entity?: { id: string } } };
  };
  if (event.event === "payment.captured" || event.event === "order.paid") {
    const orderId = event.payload?.payment?.entity?.order_id || event.payload?.order?.entity?.id;
    const paymentId = event.payload?.payment?.entity?.id || "";
    if (orderId) {
      await db();
      const pay = await Payment.findOne({ orderId }).lean();
      if (pay) await markPaid(pay._id, paymentId);
    }
  }
  return NextResponse.json({ ok: true });
}
