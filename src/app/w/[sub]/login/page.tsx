import { notFound } from "next/navigation";
import { workspaceLoginAction } from "@/app/actions/auth";
import { WorkspaceLoginForm } from "@/components/AuthForms";
import { Icon } from "@/components/Icon";
import { wsBySub } from "@/lib/demo-data";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { BRAND, workspaceHost } from "@/lib/utils";

export const metadata = { title: "Log in", robots: { index: false } };

/** Login page on each customer's own domain, e.g. abctravels.nnccrm.com/login */
export default async function WorkspaceLogin({
  params,
  searchParams,
}: {
  params: Promise<{ sub: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { sub } = await params;
  const { next } = await searchParams;
  const ws = wsBySub(sub);
  if (!ws) notFound();
  const p = PRODUCTS[ws.product as ProductKey];

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className={`mx-auto grid h-12 w-12 place-items-center rounded-xl text-white ${p.theme.solid}`}>
            <Icon name={p.icon} size={24} />
          </span>
          <div className="mt-3 text-lg font-semibold text-slate-900">{ws.companyName}</div>
          <div className="text-sm text-slate-500">
            {p.name} · {workspaceHost(ws.subdomain)}
          </div>
        </div>
        <div className="card p-6">
          <WorkspaceLoginForm action={workspaceLoginAction.bind(null, sub)} next={next} />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Powered by {BRAND}</p>
      </div>
    </main>
  );
}
