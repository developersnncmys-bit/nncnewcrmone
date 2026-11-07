"use client";
import { useState } from "react";
import { verifyPaymentAction } from "@/app/actions/checkout";

/** Demo pay button: simulates a successful payment and opens the customer's CRM. */
export function PayButton(props: { paymentId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setError("");
    setBusy(true);
    const res = await verifyPaymentAction({ paymentId: props.paymentId });
    if (res.ok) window.location.href = res.redirect;
    else {
      setError(res.error);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button onClick={pay} disabled={busy} className="btn btn-primary w-full py-3 text-base">
        {busy ? "Processing…" : props.label}
      </button>
      <p className="text-center text-xs text-amber-700">Demo mode: this button simulates a successful payment.</p>
      {error && <p className="text-center text-sm text-rose-600">{error}</p>}
    </div>
  );
}
