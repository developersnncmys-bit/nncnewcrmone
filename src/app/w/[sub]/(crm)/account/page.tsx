import { ChangePasswordForm } from "@/components/AuthForms";
import { PageHeader } from "@/components/ui";
import { getWorkspaceAccess } from "@/lib/workspace";

export const metadata = { title: "My account" };

export default async function AccountPage({ params }: { params: Promise<{ sub: string }> }) {
  const { s } = await getWorkspaceAccess((await params).sub);
  return (
    <>
      <PageHeader title="My account" subtitle={`${s.name} · ${s.email}`} />
      <section className="card p-6">
        <h2 className="mb-4 font-semibold text-slate-900">Change password</h2>
        <ChangePasswordForm />
      </section>
    </>
  );
}
