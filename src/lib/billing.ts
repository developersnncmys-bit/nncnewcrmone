import "server-only";
import type { Types } from "mongoose";
import { db } from "./db";
import { Counter, Lead, Payment, User, Workspace, type Cycle, type Tier } from "./models";
import { getPlan, priceFor } from "./plans";
import { PRODUCTS, type ProductKey } from "./products";
import { createOrder, razorpayEnabled } from "./razorpay";
import { emailLayout, sendEmail } from "./mail";
import { payLink } from "./paylink";
import { DAY, absWorkspaceUrl, addCycle, cycleEvery, cycleLabel, fmtDate, inr, tierLabel, withGst, workspaceHost } from "./utils";

export const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || 30);
export const GRACE_DAYS = Number(process.env.GRACE_DAYS || 7);
export const REMINDER_DAYS = (process.env.REMINDER_DAYS || "7,3,1")
  .split(",")
  .map((n) => Number(n.trim()))
  .filter((n) => n > 0)
  .sort((a, b) => b - a);

type Id = Types.ObjectId | string;

/** Creates a payment row + Razorpay order (or a mock order when Razorpay keys are not set). */
export async function createPayment(opts: {
  workspaceId: Id;
  userId: Id;
  product: string;
  tier: Tier;
  cycle: Cycle;
  kind: "new" | "renewal" | "change";
}) {
  await db();
  const plan = await getPlan(opts.product, opts.tier);
  if (!plan) throw new Error("Selected plan is not available");
  const amount = priceFor(plan, opts.cycle);
  if (!amount) throw new Error("This billing term is not available for the selected plan");
  const g = withGst(amount);
  const pay = await Payment.create({
    workspace: opts.workspaceId,
    user: opts.userId,
    product: opts.product,
    tier: opts.tier,
    cycle: opts.cycle,
    amount,
    gstRate: g.rate,
    gstAmount: g.gst,
    total: g.total,
    kind: opts.kind,
  });
  pay.orderId = razorpayEnabled()
    ? await createOrder(g.total, String(pay._id), { workspace: String(opts.workspaceId), kind: opts.kind })
    : `mock_${pay._id}`;
  await pay.save();
  return pay;
}

type WsLike = {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  product: string;
  status: string;
  currentPeriodStart?: Date | null;
  plan: { tier: string; cycle: string };
  scheduledChange?: { tier: string; cycle: string } | null;
};

/**
 * Returns the unpaid payment for the workspace's next renewal (or first payment),
 * creating it if needed. Used for the payment links in emails.
 */
export async function openPaymentFor(ws: WsLike) {
  await db();
  const r = await renewalPlanFor(ws);
  const neverPaid = ws.status === "pending" || ws.status === "trial" || !ws.currentPeriodStart;
  const existing = await Payment.findOne({ workspace: ws._id, status: "created", tier: r.tier, cycle: r.cycle })
    .sort({ createdAt: -1 })
    .lean();
  if (existing) return existing;
  // Older unpaid links for a different plan are cancelled so only one link is valid.
  await Payment.updateMany({ workspace: ws._id, status: "created" }, { $set: { status: "failed" } });
  const p = await createPayment({
    workspaceId: ws._id,
    userId: ws.owner,
    product: ws.product,
    tier: r.tier,
    cycle: r.cycle,
    kind: neverPaid ? "new" : "renewal",
  });
  return p.toObject();
}

/** Login page of a customer's CRM (their own domain). */
export const loginUrl = (sub: string) => absWorkspaceUrl(sub, "/login");

/** Email with login details (+ payment link when a payment is due). */
export async function sendAccessEmail(opts: {
  ws: { _id: Types.ObjectId; subdomain: string; companyName: string; product: string; status: string; trialEndsAt?: Date | null };
  to: string;
  name: string;
  password?: string;
  payment?: { _id: Types.ObjectId; tier: string; cycle: string; amount: number; total: number } | null;
}) {
  const p = PRODUCTS[opts.ws.product as ProductKey];
  const rows: [string, string][] = [
    ["Your CRM", workspaceHost(opts.ws.subdomain)],
    ["Login page", loginUrl(opts.ws.subdomain)],
    ["Login email", opts.to],
  ];
  if (opts.password) rows.push(["Password", opts.password]);
  if (opts.ws.status === "trial") rows.push(["Free trial until", fmtDate(opts.ws.trialEndsAt)]);
  if (opts.payment) {
    rows.push(["Plan", `${tierLabel(opts.payment.tier)} · ${cycleLabel(opts.payment.cycle)}`]);
    rows.push(["Amount (incl. GST)", inr(opts.payment.total || opts.payment.amount)]);
  }
  await sendEmail({
    to: opts.to,
    type: opts.password ? "welcome" : "payment_link",
    workspace: opts.ws._id,
    subject: opts.payment
      ? `${p.name} for ${opts.ws.companyName} – complete your payment`
      : `Your ${p.name} login details`,
    html: emailLayout({
      title: opts.payment ? "Your CRM is ready – complete the payment" : "Your CRM is ready",
      intro: `Hi ${opts.name}, your ${p.name} for ${opts.ws.companyName} has been set up.${opts.password ? " Please change your password after the first login." : ""}`,
      rows,
      cta: opts.payment
        ? { label: `Pay ${inr(opts.payment.total || opts.payment.amount)} securely`, url: payLink(String(opts.payment._id)) }
        : { label: "Log in to your CRM", url: loginUrl(opts.ws.subdomain) },
      footer: opts.payment ? `After payment, log in at ${loginUrl(opts.ws.subdomain)}` : undefined,
    }),
  });
}

async function nextInvoiceNumber(now: Date) {
  const c = await Counter.findOneAndUpdate({ _id: "invoice" }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `INV-${ym}-${String(c!.seq).padStart(5, "0")}`;
}

/**
 * Marks a payment as paid (idempotent) and activates / extends the workspace
 * subscription. Called from checkout verification and from the Razorpay webhook.
 */
export async function markPaid(paymentId: Id, razorpayPaymentId: string) {
  await db();
  const pay = await Payment.findOneAndUpdate(
    { _id: paymentId, status: "created" },
    { $set: { status: "paid", paidAt: new Date(), razorpayPaymentId } },
    { new: true },
  );
  if (!pay) return Payment.findById(paymentId); // already processed

  const ws = await Workspace.findById(pay.workspace);
  if (!ws) return pay;
  const now = new Date();
  // Early renewal extends from the current end date, so the customer never loses days.
  const extending = pay.kind === "renewal" && ws.currentPeriodEnd && ws.currentPeriodEnd > now;
  const start = extending ? ws.currentPeriodEnd! : now;
  const end = addCycle(start, pay.cycle as Cycle);

  pay.periodStart = start;
  pay.periodEnd = end;
  pay.invoiceNumber = await nextInvoiceNumber(now);
  await pay.save();

  const wasNew = ws.status === "pending" || ws.status === "trial";
  ws.plan = { tier: pay.tier, cycle: pay.cycle, price: pay.amount };
  ws.status = "active";
  if (!extending) ws.currentPeriodStart = start;
  ws.currentPeriodEnd = end;
  ws.trialEndsAt = null;
  ws.graceEndsAt = null;
  ws.scheduledChange = null;
  ws.remindersSent = [];
  await ws.save();

  const owner = await User.findById(ws.owner).lean();
  if (owner) {
    await Lead.updateMany(
      { $or: [{ _id: ws.lead }, { email: owner.email, product: ws.product }].filter((q) => Object.values(q).every(Boolean)), status: { $ne: "converted" } },
      { $set: { status: "converted", workspace: ws._id, user: owner._id } },
    );
    const product = PRODUCTS[ws.product as ProductKey];
    await sendEmail({
      to: owner.email,
      type: "invoice",
      workspace: ws._id,
      subject: `Payment received – ${product.name} (${pay.invoiceNumber})`,
      html: emailLayout({
        title: wasNew ? `Your ${product.name} is live!` : "Payment received, thank you!",
        intro: `Hi ${owner.name}, we received your payment for ${ws.companyName}.`,
        rows: [
          ["Invoice", pay.invoiceNumber],
          ["Workspace", workspaceHost(ws.subdomain)],
          ["Plan", `${tierLabel(pay.tier)} · ${cycleLabel(pay.cycle)}`],
          ["Amount paid (incl. GST)", inr(pay.total || pay.amount)],
          ["Valid till", fmtDate(end)],
        ],
        cta: { label: "Log in to your CRM", url: loginUrl(ws.subdomain) },
        footer: `Your plan renews ${cycleEvery(pay.cycle)}. We will remind you before the renewal date.`,
      }),
    });
  }
  return pay;
}

/** Price + plan that will be charged at the next renewal (scheduled change wins). */
export async function renewalPlanFor(ws: { product: string; plan: { tier: string; cycle: string }; scheduledChange?: { tier: string; cycle: string } | null }) {
  const tier = (ws.scheduledChange?.tier || ws.plan.tier) as Tier;
  const cycle = (ws.scheduledChange?.cycle || ws.plan.cycle) as Cycle;
  const plan = await getPlan(ws.product, tier);
  return { tier, cycle, amount: plan ? priceFor(plan, cycle) : 0 };
}

/**
 * Daily subscription job:
 *  - sends renewal / trial-ending reminders (default 7, 3 and 1 day before)
 *  - moves expired paid plans to grace period and emails the customer
 *  - locks workspaces after the grace period / when a trial ends
 */
export async function runBillingJob(now = new Date()) {
  await db();
  const summary = { checked: 0, reminders: 0, movedToGrace: 0, locked: 0 };
  const list = await Workspace.find({ status: { $in: ["trial", "active", "grace"] } });

  for (const ws of list) {
    summary.checked++;
    const owner = await User.findById(ws.owner).lean();
    if (!owner) continue;
    const product = PRODUCTS[ws.product as ProductKey];
    // Payment link is created only when an email is actually sent.
    const link = async () => payLink(String((await openPaymentFor(ws))._id));
    const host = workspaceHost(ws.subdomain);
    const renewal = await renewalPlanFor(ws);
    const renewalRows: [string, string][] = [
      ["Workspace", host],
      ["Plan", `${tierLabel(renewal.tier)} · ${cycleLabel(renewal.cycle)}`],
      ["Amount", `${inr(renewal.amount)} + GST`],
    ];

    if (ws.status === "grace") {
      if (ws.graceEndsAt && now >= ws.graceEndsAt) {
        ws.status = "locked";
        await ws.save();
        summary.locked++;
        await sendEmail({
          to: owner.email,
          type: "locked",
          workspace: ws._id,
          subject: `${product.name} access paused – renew to continue`,
          html: emailLayout({
            title: "Your CRM access is paused",
            intro: `Hi ${owner.name}, the subscription for ${ws.companyName} was not renewed, so access is paused. Your data is safe — renew any time to continue.`,
            rows: renewalRows,
            cta: { label: "Pay now to renew", url: await link() },
          }),
        });
      }
      continue;
    }

    const end = ws.status === "trial" ? ws.trialEndsAt : ws.currentPeriodEnd;
    if (!end) continue;

    if (now >= end) {
      if (ws.status === "trial") {
        ws.status = "locked";
        summary.locked++;
        await sendEmail({
          to: owner.email,
          type: "trial_ended",
          workspace: ws._id,
          subject: `Your ${product.name} free trial has ended`,
          html: emailLayout({
            title: "Your free trial has ended",
            intro: `Hi ${owner.name}, your free trial for ${ws.companyName} has ended. Choose a quarterly, half-yearly or yearly plan to keep using your CRM. Your data is safe.`,
            rows: renewalRows,
            cta: { label: "Pay now to continue", url: await link() },
          }),
        });
      } else {
        ws.status = "grace";
        ws.graceEndsAt = new Date(end.getTime() + GRACE_DAYS * DAY);
        summary.movedToGrace++;
        await sendEmail({
          to: owner.email,
          type: "expired",
          workspace: ws._id,
          subject: `Your ${product.name} subscription has expired`,
          html: emailLayout({
            title: "Subscription expired",
            intro: `Hi ${owner.name}, your ${cycleLabel(ws.plan.cycle).toLowerCase()} plan for ${ws.companyName} expired on ${fmtDate(end)}. You can keep using the CRM until ${fmtDate(ws.graceEndsAt)} — please renew before that to avoid interruption.`,
            rows: renewalRows,
            cta: { label: "Pay now to renew", url: await link() },
          }),
        });
      }
      await ws.save();
      continue;
    }

    const left = Math.ceil((end.getTime() - now.getTime()) / DAY);
    const due = REMINDER_DAYS.filter((d) => left <= d);
    if (!due.length) continue;
    const day = end.toISOString().slice(0, 10);
    const smallest = Math.min(...due);
    if (ws.remindersSent.includes(`${ws.status}:${day}:${smallest}`)) continue;

    const isTrial = ws.status === "trial";
    await sendEmail({
      to: owner.email,
      type: `reminder_${smallest}d`,
      workspace: ws._id,
      subject: isTrial
        ? `Your ${product.name} free trial ends in ${left} day${left === 1 ? "" : "s"}`
        : `Your ${product.name} ${cycleLabel(ws.plan.cycle).toLowerCase()} plan renews in ${left} day${left === 1 ? "" : "s"}`,
      html: emailLayout({
        title: isTrial ? "Your free trial is ending soon" : "Subscription renewal reminder",
        intro: isTrial
          ? `Hi ${owner.name}, your free trial for ${ws.companyName} ends on ${fmtDate(end)}. Pick a quarterly, half-yearly or yearly plan to continue without interruption.`
          : `Hi ${owner.name}, your ${cycleLabel(ws.plan.cycle).toLowerCase()} subscription for ${ws.companyName} ends on ${fmtDate(end)}. Renew now to keep your CRM running.`,
        rows: [...renewalRows, ["Due date", fmtDate(end)]],
        cta: { label: `Pay ${inr(renewal.amount)} + GST`, url: await link() },
        footer: "To change the plan or billing term (quarterly / half-yearly / yearly), use the Billing page in your CRM or reply to this email.",
      }),
    });
    ws.remindersSent.push(...due.map((d) => `${ws.status}:${day}:${d}`));
    await ws.save();
    summary.reminders++;
  }
  return summary;
}
