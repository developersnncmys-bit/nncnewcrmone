// On a normal Node server (VPS / PM2) this schedules the subscription job
// (renewal reminders, expiry → grace, grace → locked) automatically.
// Set BILLING_JOB_INTERVAL_MINUTES=0 to disable (e.g. on serverless, call /api/cron/billing instead).
import { runBillingJob } from "./lib/billing";

// On Vercel (serverless) there is no long-running server: the job runs from Vercel Cron instead (vercel.json).
const minutes = process.env.VERCEL ? 0 : Number(process.env.BILLING_JOB_INTERVAL_MINUTES ?? 60);

async function run() {
  try {
    const r = await runBillingJob();
    if (r.reminders || r.movedToGrace || r.locked) console.log("[billing-job]", r);
  } catch (e) {
    console.error("[billing-job] failed:", e instanceof Error ? e.message : e);
  }
}

if (minutes > 0) {
  setTimeout(run, 15_000);
  setInterval(run, minutes * 60_000);
}
