import { NextResponse } from "next/server";
import { createLead } from "@/lib/leads";

/**
 * Lead intake for the marketing website (nncdigital.co.in).
 *
 *   POST /api/leads   (JSON or form data)
 *   { name, email, phone, company, product?: "travel"|"sales"|"hrms", message?, source?, landingPage? }
 *
 * Field names used by the website's TrialModal (requirements, service, site …) are accepted too.
 * Allowed browser origins: LEAD_ALLOWED_ORIGINS (comma separated).
 */
const allowed = () =>
  (process.env.LEAD_ALLOWED_ORIGINS || "https://nncdigital.co.in,https://www.nncdigital.co.in,http://localhost:3000,http://localhost:3001")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    Vary: "Origin",
  };
  if (origin && (allowed().includes(origin) || allowed().includes("*"))) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

export async function POST(req: Request) {
  const headers = cors(req);
  const origin = req.headers.get("origin");
  if (origin && !headers["Access-Control-Allow-Origin"]) {
    return NextResponse.json({ error: "origin not allowed" }, { status: 403, headers });
  }

  let body: Record<string, unknown> = {};
  try {
    const type = req.headers.get("content-type") || "";
    body = type.includes("application/json") ? await req.json() : Object.fromEntries((await req.formData()).entries());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400, headers });
  }
  const v = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");

  if (v("website") || v("_honey")) return NextResponse.json({ ok: true }, { headers }); // bot honeypot
  const name = v("name") || v("Name");
  const email = v("email") || v("Email");
  const phone = v("phone") || v("Phone");
  if (!name || (!email && !phone)) {
    return NextResponse.json({ error: "name and email or phone are required" }, { status: 400, headers });
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400, headers });
  }

  const lead = await createLead({
    name: name.slice(0, 120),
    email: email.slice(0, 200),
    phone: phone.slice(0, 40),
    company: (v("company") || v("Company")).slice(0, 200),
    product: v("product") || v("service"),
    message: (v("message") || v("requirements")).slice(0, 2000),
    source: v("source") || v("site") || "website",
    landingPage: v("landingPage").slice(0, 300),
  });
  return NextResponse.json({ ok: true, id: String(lead._id) }, { status: 201, headers });
}
