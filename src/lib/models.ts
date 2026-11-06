import { Schema, model, models, type Model, type Types } from "mongoose";
import { PRODUCT_KEYS } from "./products";

const ObjectId = Schema.Types.ObjectId;
export const TIERS = ["starter", "growth", "enterprise"] as const;
export const CYCLES = ["quarterly", "halfyearly", "yearly"] as const;
export type Tier = (typeof TIERS)[number];
export type Cycle = (typeof CYCLES)[number];
export type WorkspaceStatus = "pending" | "trial" | "active" | "grace" | "locked" | "cancelled";

type Id = Types.ObjectId;
interface Timestamps { createdAt: Date; updatedAt: Date }
export interface UserT extends Timestamps { name: string; email: string; phone: string; passwordHash: string; role: "superadmin" | "customer" }
export interface LeadT extends Timestamps {
  name: string; email: string; phone: string; company: string; product: string; message: string; source: string; landingPage: string;
  status: "new" | "contacted" | "signed_up" | "converted" | "lost"; notes: string; user?: Id | null; workspace?: Id | null;
}
export interface WorkspaceT extends Timestamps {
  owner: Id; members: { user: Id; role: "admin" | "member" }[]; product: string; subdomain: string; customDomain: string;
  companyName: string; plan: { tier: Tier; cycle: Cycle; price: number }; scheduledChange: { tier: Tier; cycle: Cycle } | null;
  status: WorkspaceStatus; trialEndsAt: Date | null; currentPeriodStart: Date | null; currentPeriodEnd: Date | null;
  graceEndsAt: Date | null; remindersSent: string[]; lead: Id | null;
  contact: { name: string; email: string; phone: string };
  billing: { gstin: string; address: string; state: string };
  notes: string;
}
export interface PaymentT extends Timestamps {
  workspace: Id; user: Id; product: string; tier: Tier; cycle: Cycle; amount: number; currency: string;
  gstRate: number; gstAmount: number; total: number;
  kind: "new" | "renewal" | "change"; status: "created" | "paid" | "failed"; orderId: string; razorpayPaymentId: string;
  invoiceNumber: string; periodStart: Date | null; periodEnd: Date | null; paidAt: Date | null;
}
export interface RecordT extends Timestamps { workspace: Id; entity: string; data: Record<string, unknown>; createdBy?: Id }
export interface EmailLogT extends Timestamps { to: string; subject: string; type: string; workspace: Id | null; status: "sent" | "logged" | "failed"; error: string }

/* ---------------- Users (super admin + customers + team members) ---------------- */
const userSchema = new Schema<UserT>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["superadmin", "customer"], default: "customer" },
  },
  { timestamps: true },
);

/* ---------------- Platform leads (people interested in buying a CRM) ---------------- */
const leadSchema = new Schema<LeadT>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", lowercase: true, trim: true, index: true },
    phone: { type: String, default: "" },
    company: { type: String, default: "" },
    product: { type: String, enum: [...PRODUCT_KEYS, ""], default: "" }, // "" = not decided yet
    landingPage: { type: String, default: "" },
    message: { type: String, default: "" },
    source: { type: String, default: "website" },
    status: {
      type: String,
      enum: ["new", "contacted", "signed_up", "converted", "lost"],
      default: "new",
    },
    notes: { type: String, default: "" },
    user: { type: ObjectId, ref: "User" },
    workspace: { type: ObjectId, ref: "Workspace" },
  },
  { timestamps: true },
);

/* ---------------- Workspace = one customer's CRM on one domain (tenant + subscription) ---------------- */
const memberSchema = new Schema(
  { user: { type: ObjectId, ref: "User", required: true }, role: { type: String, enum: ["admin", "member"], default: "member" } },
  { _id: false },
);
const planChoiceSchema = new Schema(
  { tier: { type: String, enum: TIERS, required: true }, cycle: { type: String, enum: CYCLES, required: true } },
  { _id: false },
);
const workspaceSchema = new Schema<WorkspaceT>(
  {
    owner: { type: ObjectId, ref: "User", required: true, index: true },
    members: { type: [memberSchema], default: [] },
    product: { type: String, enum: PRODUCT_KEYS, required: true },
    subdomain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    customDomain: { type: String, default: "" },
    companyName: { type: String, required: true, trim: true },
    plan: {
      tier: { type: String, enum: TIERS, required: true },
      cycle: { type: String, enum: CYCLES, required: true },
      price: { type: Number, default: 0 },
    },
    scheduledChange: { type: planChoiceSchema, default: null },
    status: {
      type: String,
      enum: ["pending", "trial", "active", "grace", "locked", "cancelled"],
      default: "pending",
      index: true,
    },
    trialEndsAt: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    graceEndsAt: { type: Date, default: null },
    remindersSent: { type: [String], default: [] },
    lead: { type: ObjectId, ref: "Lead", default: null },
    contact: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    // Customer's GST details, printed on invoices
    billing: {
      gstin: { type: String, default: "" },
      address: { type: String, default: "" },
      state: { type: String, default: "" },
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

/* ---------------- Payments / invoices ---------------- */
const paymentSchema = new Schema<PaymentT>(
  {
    workspace: { type: ObjectId, ref: "Workspace", required: true, index: true },
    user: { type: ObjectId, ref: "User", required: true },
    product: { type: String, enum: PRODUCT_KEYS, required: true },
    tier: { type: String, enum: TIERS, required: true },
    cycle: { type: String, enum: CYCLES, required: true },
    amount: { type: Number, required: true }, // plan price before GST
    gstRate: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 }, // amount charged (incl. GST)
    currency: { type: String, default: "INR" },
    kind: { type: String, enum: ["new", "renewal", "change"], required: true },
    status: { type: String, enum: ["created", "paid", "failed"], default: "created", index: true },
    orderId: { type: String, default: "", index: true },
    razorpayPaymentId: { type: String, default: "" },
    invoiceNumber: { type: String, default: "" },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/* ---------------- CRM data inside a workspace (all modules, config driven) ---------------- */
const recordSchema = new Schema<RecordT>(
  {
    workspace: { type: ObjectId, ref: "Workspace", required: true },
    entity: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: ObjectId, ref: "User" },
  },
  { timestamps: true, minimize: false },
);
recordSchema.index({ workspace: 1, entity: 1, createdAt: -1 });

/* ---------------- Email log (every reminder / invoice / welcome mail) ---------------- */
const emailLogSchema = new Schema<EmailLogT>(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    type: { type: String, default: "general" },
    workspace: { type: ObjectId, ref: "Workspace", default: null },
    status: { type: String, enum: ["sent", "logged", "failed"], default: "logged" },
    error: { type: String, default: "" },
  },
  { timestamps: true },
);

const counterSchema = new Schema<{ _id: string; seq: number }>({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } });

export const User = (models.User as Model<UserT>) ?? model<UserT>("User", userSchema);
export const Lead = (models.Lead as Model<LeadT>) ?? model<LeadT>("Lead", leadSchema);
export const Workspace = (models.Workspace as Model<WorkspaceT>) ?? model<WorkspaceT>("Workspace", workspaceSchema);
export const Payment = (models.Payment as Model<PaymentT>) ?? model<PaymentT>("Payment", paymentSchema);
export const CrmRecord = (models.Record as Model<RecordT>) ?? model<RecordT>("Record", recordSchema);
export const EmailLog = (models.EmailLog as Model<EmailLogT>) ?? model<EmailLogT>("EmailLog", emailLogSchema);
export const Counter =
  (models.Counter as Model<{ _id: string; seq: number }>) ?? model<{ _id: string; seq: number }>("Counter", counterSchema);
