import "server-only";
import { db } from "./db";
import { emailLayout, sendEmail } from "./mail";
import { Lead } from "./models";
import { PRODUCTS, isProductKey, type ProductKey } from "./products";
import { APP_URL, WEBSITE_URL } from "./utils";

/** Works out which CRM a lead wants from free text like "Travel CRM", "HR / payroll". */
export function guessProduct(...texts: (string | undefined)[]): ProductKey | "" {
  const t = texts.filter(Boolean).join(" ").toLowerCase();
  if (isProductKey(t.trim())) return t.trim() as ProductKey;
  if (/travel|tour|holiday|itinerar/.test(t)) return "travel";
  if (/\bhr\b|hrms|payroll|attendance|employee|leave/.test(t)) return "hrms";
  if (/sales|lead|pipeline|deal/.test(t)) return "sales";
  return "";
}

export type LeadInput = {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  product?: string;
  message?: string;
  source?: string;
  landingPage?: string;
};

/** Saves a lead coming from the website and sends the welcome + admin alert emails. */
export async function createLead(input: LeadInput) {
  await db();
  const email = (input.email || "").trim().toLowerCase();
  const product = isProductKey(input.product) ? input.product : guessProduct(input.product, input.message, input.landingPage);
  const lead = await Lead.create({
    name: input.name.trim(),
    email,
    phone: (input.phone || "").trim(),
    company: (input.company || "").trim(),
    product,
    message: (input.message || "").trim(),
    source: input.source || "website",
    landingPage: input.landingPage || "",
  });
  const pName = product ? PRODUCTS[product].name : "NNC CRM";

  if (email) {
    await sendEmail({
      to: email,
      type: "lead_welcome",
      subject: `Thanks for your interest in ${pName}`,
      html: emailLayout({
        title: "We received your enquiry",
        intro: `Hi ${lead.name}, thank you for contacting us about ${pName}. Our team will call you shortly to understand your needs and set up your CRM with your own domain.`,
        cta: { label: "Visit our website", url: WEBSITE_URL },
        footer: "You can reply to this email if you have any questions.",
      }),
    });
  }
  if (process.env.ADMIN_EMAIL) {
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      type: "lead_admin",
      subject: `New lead${product ? ` for ${pName}` : ""}: ${lead.name}`,
      html: emailLayout({
        title: "New lead received",
        intro: `A new enquiry came from ${input.source || "the website"}.`,
        rows: [
          ["Name", lead.name],
          ["Email", email || "—"],
          ["Phone", lead.phone || "—"],
          ["Company", lead.company || "—"],
          ["Product", product ? pName : "Not chosen"],
          ["Message", lead.message || "—"],
        ],
        cta: { label: "View leads", url: `${APP_URL}/admin/leads?id=${lead._id}` },
      }),
    });
  }
  return lead;
}
