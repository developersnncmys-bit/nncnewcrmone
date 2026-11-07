import { NewCustomerForm } from "@/components/admin-ui";
import { PageHeader } from "@/components/ui";
import { LEADS } from "@/lib/demo-data";
import { PLANS } from "@/lib/plans";
import { productList } from "@/lib/products";
import { ROOT_DOMAIN } from "@/lib/utils";

export const metadata = { title: "New customer" };

export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const { lead: leadId } = await searchParams;
  const lead = LEADS.find((l) => l._id === leadId) ?? null;

  return (
    <>
      <PageHeader
        title="New customer"
        subtitle={
          lead
            ? `Creating a CRM for lead “${lead.name}”. Fill the domain and plan, then send the payment link.`
            : "Create a customer's CRM: domain, plan and billing term. The customer gets a login and a payment link."
        }
      />
      <NewCustomerForm
        products={productList().map((p) => ({ key: p.key, name: p.name }))}
        plans={PLANS.map((p) => ({ tier: p.tier, name: p.name, maxUsers: p.maxUsers, prices: p.prices }))}
        rootDomain={ROOT_DOMAIN}
        defaults={{
          leadId: lead ? String(lead._id) : undefined,
          companyName: lead?.company || "",
          contactName: lead?.name || "",
          email: lead?.email || "",
          phone: lead?.phone || "",
          product: lead?.product || "",
        }}
      />
    </>
  );
}
