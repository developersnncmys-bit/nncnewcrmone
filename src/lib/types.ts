// Shared data shapes for the UI (dummy data only, no database).

export const TIERS = ["starter", "growth", "enterprise"] as const;
export const CYCLES = ["quarterly", "halfyearly", "yearly"] as const;
export type Tier = (typeof TIERS)[number];
export type Cycle = (typeof CYCLES)[number];
export type WorkspaceStatus = "pending" | "trial" | "active" | "grace" | "locked" | "cancelled";

export type Session = { uid: string; role: "superadmin" | "customer"; name: string; email: string };

export interface UserT {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: "superadmin" | "customer";
  createdAt: Date;
}

export interface LeadT {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  product: string;
  message: string;
  source: string;
  landingPage: string;
  status: "new" | "contacted" | "signed_up" | "converted" | "lost";
  notes: string;
  workspace: string | null;
  createdAt: Date;
}

export interface WorkspaceT {
  _id: string;
  owner: string;
  members: { user: string; role: "admin" | "member" }[];
  product: string;
  subdomain: string;
  customDomain: string;
  companyName: string;
  plan: { tier: Tier; cycle: Cycle; price: number };
  scheduledChange: { tier: Tier; cycle: Cycle } | null;
  status: WorkspaceStatus;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  graceEndsAt: Date | null;
  contact: { name: string; email: string; phone: string };
  billing: { gstin: string; address: string; state: string };
  notes: string;
  createdAt: Date;
}

export interface PaymentT {
  _id: string;
  workspace: string;
  user: string;
  product: string;
  tier: Tier;
  cycle: Cycle;
  amount: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  kind: "new" | "renewal" | "change";
  status: "created" | "paid" | "failed";
  razorpayPaymentId: string;
  invoiceNumber: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface RecordT {
  _id: string;
  workspace: string;
  entity: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

export interface EmailLogT {
  _id: string;
  to: string;
  subject: string;
  type: string;
  workspace: string | null;
  status: "sent" | "logged" | "failed";
  error: string;
  createdAt: Date;
}
