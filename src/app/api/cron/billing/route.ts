import { NextResponse } from "next/server";
import { runBillingJob } from "@/lib/billing";

/**
 * Runs renewal reminders / expiry / locking.
 * Call daily from any scheduler:  GET /api/cron/billing  with header
 *   Authorization: Bearer <CRON_SECRET>
 * (The app also runs this job automatically every hour while the server is up — see instrumentation.ts.)
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runBillingJob());
}
