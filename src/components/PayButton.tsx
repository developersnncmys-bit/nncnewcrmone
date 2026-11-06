"use client";
import { useState } from "react";
import { verifyPaymentAction } from "@/app/actions/checkout";

type RzpResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RzpInstance = { open: () => void; on: (e: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RzpInstance;
  }
}

function loadScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay. Check your internet connection."));
    document.body.appendChild(s);
  });
}

export function PayButton(props: {
  paymentId: string;
  token: string;
  orderId: string;
  amount: number;
  keyId: string;
  mock: boolean;
  brand: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finish(orderId: string, razorpayPaymentId: string, signature: string) {
    const res = await verifyPaymentAction({ paymentId: props.paymentId, token: props.token, orderId, razorpayPaymentId, signature });
    if (res.ok) window.location.href = res.redirect;
    else {
      setError(res.error);
      setBusy(false);
    }
  }

  async function pay() {
    setError("");
    setBusy(true);
    try {
      if (props.mock) {
        await finish(props.orderId, `mock_pay_${Date.now()}`, "");
        return;
      }
      await loadScript();
      const rzp = new window.Razorpay!({
        key: props.keyId,
        amount: Math.round(props.amount * 100),
        currency: "INR",
        name: props.brand,
        description: props.description,
        order_id: props.orderId,
        prefill: props.prefill,
        theme: { color: "#4f46e5" },
        handler: (r: RzpResponse) => finish(r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature),
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", (r) => {
        setError(r.error?.description || "Payment failed. Please try again.");
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button onClick={pay} disabled={busy} className="btn btn-primary w-full py-3 text-base">
        {busy ? "Processing…" : props.label}
      </button>
      {props.mock && (
        <p className="text-center text-xs text-amber-700">
          Test mode: Razorpay keys are not set, so this button simulates a successful payment.
        </p>
      )}
      {error && <p className="text-center text-sm text-rose-600">{error}</p>}
    </div>
  );
}
