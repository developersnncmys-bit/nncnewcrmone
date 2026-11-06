import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Badge, Notice, PageHeader, valueTone } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { CrmRecord } from "@/lib/models";
import { PRODUCTS, type ProductKey } from "@/lib/products";
import { fmtDate } from "@/lib/utils";
import { getUsableWorkspace, wsBase } from "@/lib/workspace";

export default async function WorkspaceHome({
  params,
  searchParams,
}: {
  params: Promise<{ sub: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { sub } = await params;
  const { paid } = await searchParams;
  const s = await requireUser();
  const { ws } = await getUsableWorkspace(sub, s);
  const base = await wsBase(sub);
  const p = PRODUCTS[ws.product as ProductKey];

  const counts = await CrmRecord.aggregate<{ _id: string; n: number }>([
    { $match: { workspace: ws._id } },
    { $group: { _id: "$entity", n: { $sum: 1 } } },
  ]);
  const countOf = (k: string) => counts.find((c) => c._id === k)?.n ?? 0;

  const boards = await Promise.all(
    p.entities
      .filter((e) => e.board && e.statusField)
      .map(async (e) => {
        const rows = await CrmRecord.aggregate<{ _id: string; n: number }>([
          { $match: { workspace: ws._id, entity: e.key } },
          { $group: { _id: `$data.${e.statusField}`, n: { $sum: 1 } } },
        ]);
        const opts = e.fields.find((f) => f.key === e.statusField)?.options ?? [];
        return { e, stats: opts.map((o) => ({ label: o, n: rows.find((r) => r._id === o)?.n ?? 0 })) };
      }),
  );

  const main = p.entities[0];
  const recent = await CrmRecord.find({ workspace: ws._id, entity: main.key }).sort({ createdAt: -1 }).limit(6).lean();

  return (
    <>
      {paid && <Notice tone="green">Payment successful! Your subscription is active. An invoice has been emailed to you.</Notice>}
      <PageHeader title="Dashboard" subtitle={`${p.name} for ${ws.companyName}`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {p.entities.map((e) => (
          <Link key={e.key} href={`${base}/m/${e.key}`} className="card flex items-center gap-4 p-4 hover:shadow-md">
            <span className={`grid h-11 w-11 place-items-center rounded-lg ${p.theme.soft}`}>
              <Icon name={e.icon} size={20} />
            </span>
            <div>
              <div className="text-2xl font-semibold text-slate-900">{countOf(e.key)}</div>
              <div className="text-sm text-slate-500">{e.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {boards.map(({ e, stats }) => (
          <div key={e.key} className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">{e.label} by {e.statusField}</h2>
              <Link href={`${base}/m/${e.key}?view=board`} className="text-sm text-indigo-600">
                Open board
              </Link>
            </div>
            <div className="space-y-2">
              {stats.map((st) => {
                const max = Math.max(1, ...stats.map((x) => x.n));
                return (
                  <div key={st.label} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 truncate text-slate-600">{st.label}</span>
                    <div className="h-2 flex-1 rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${p.theme.solid}`} style={{ width: `${(st.n / max) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right font-medium text-slate-800">{st.n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent {main.label.toLowerCase()}</h2>
            <Link href={`${base}/m/${main.key}?new=1`} className="btn btn-primary btn-sm">
              + Add
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing yet. Add your first {main.singular.toLowerCase()}.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((r) => {
                const d = r.data as Record<string, string>;
                const st = main.statusField ? d[main.statusField] : "";
                return (
                  <li key={String(r._id)} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`${base}/m/${main.key}?edit=${r._id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                      {d[main.titleField] || "(untitled)"}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      {st && <Badge tone={valueTone(st)}>{st}</Badge>}
                      {fmtDate(r.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
