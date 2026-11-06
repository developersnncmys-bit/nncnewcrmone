import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { Types } from "mongoose";
import { db } from "./db";
import { EmailLog } from "./models";
import { BRAND } from "./utils";

let transporter: Transporter | null = null;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

/**
 * Sends an email through SMTP. When SMTP is not configured (local dev) the mail
 * is only logged; either way it is stored in the EmailLog collection so the
 * super admin can see every reminder / invoice in /admin/emails.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  type?: string;
  workspace?: Types.ObjectId | string | null;
}) {
  await db();
  const t = getTransport();
  let status: "sent" | "logged" | "failed" = "logged";
  let error = "";
  if (t) {
    try {
      await t.sendMail({
        from: process.env.MAIL_FROM || `${BRAND} <no-reply@localhost>`,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      status = "sent";
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
      console.error("[email] failed", error);
    }
  } else {
    console.log(`[email:${opts.type ?? "general"}] to=${opts.to} subject="${opts.subject}" (SMTP not configured, logged only)`);
  }
  await EmailLog.create({
    to: opts.to,
    subject: opts.subject,
    type: opts.type ?? "general",
    workspace: opts.workspace ?? null,
    status,
    error,
  });
  return status;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function emailLayout(opts: {
  title: string;
  intro: string;
  rows?: [string, string][];
  cta?: { label: string; url: string };
  footer?: string;
}) {
  const rows = (opts.rows ?? [])
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#64748b;font-size:14px">${esc(k)}</td><td style="padding:6px 0;text-align:right;font-weight:600;font-size:14px;color:#0f172a">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
  <div style="background:#0b1a33;color:#fff;padding:18px 24px;font-size:18px;font-weight:bold">${esc(BRAND)}</div>
  <div style="padding:24px">
    <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px">${esc(opts.title)}</h2>
    <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.5">${esc(opts.intro)}</p>
    ${rows ? `<table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:8px 0 20px">${rows}</table>` : ""}
    ${opts.cta ? `<a href="${esc(opts.cta.url)}" style="display:inline-block;background:#0b5cff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;font-size:14px">${esc(opts.cta.label)}</a>` : ""}
    ${opts.footer ? `<p style="margin:20px 0 0;color:#64748b;font-size:13px">${esc(opts.footer)}</p>` : ""}
  </div>
</div></body></html>`;
}
