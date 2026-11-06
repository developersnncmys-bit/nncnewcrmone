import { NextResponse } from "next/server";
import { explainError, missingEnv } from "@/lib/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Setup check: GET /api/health → which settings are missing and whether MongoDB is reachable (no secrets shown). */
export async function GET() {
  const missing = missingEnv().map((m) => m.key);
  let database = "ok";
  try {
    const conn = await db();
    await conn.connection.db?.admin().ping();
  } catch (e) {
    database = explainError(e);
  }
  const ok = missing.length === 0 && database === "ok";
  return NextResponse.json({ ok, missingSettings: missing, database }, { status: ok ? 200 : 503 });
}
