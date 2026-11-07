import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteRecord, saveRecord, setRecordStatus } from "@/app/actions/records";
import { AutoSubmitSelect, ConfirmButton } from "@/components/client-bits";
import { Icon } from "@/components/Icon";
import { RecordForm } from "@/components/RecordForm";
import { Badge, Empty, Notice, PageHeader, valueTone } from "@/components/ui";
import { RECORDS, byNewest, matches } from "@/lib/demo-data";
import { getEntity, type Field, type ProductKey } from "@/lib/products";
import { fmtDate, inr } from "@/lib/utils";
import { getUsableWorkspace, wsBase } from "@/lib/workspace";

type SP = { q?: string; status?: string; view?: string; new?: string; edit?: string; saved?: string };

function Cell({ f, v, statusField }: { f: Field; v: unknown; statusField?: string }) {
  if (v == null || v === "") return <span className="text-slate-300">—</span>;
  if (f.type === "currency") return <>{inr(Number(v))}</>;
  if (f.type === "date") return <>{fmtDate(String(v))}</>;
  if (f.key === statusField) return <Badge tone={valueTone(String(v))}>{String(v)}</Badge>;
  return <>{String(v)}</>;
}

export default async function EntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ sub: string; entity: string }>;
  searchParams: Promise<SP>;
}) {
  const { sub, entity: entityKey } = await params;
  const sp = await searchParams;
  const { ws } = await getUsableWorkspace(sub);
  const entity = getEntity(ws.product as ProductKey, entityKey);
  if (!entity) notFound();
  const base = wsBase(sub);
  const href = `${base}/m/${entity.key}`;
  const statusF = entity.fields.find((f) => f.key === entity.statusField);
  const view = entity.board && sp.view === "board" ? "board" : "list";

  // ---- query ----
  const all = RECORDS.filter((r) => r.workspace === ws._id && r.entity === entity.key);
  const textFields = entity.fields.filter((f) => ["text", "email", "phone", "ref", "textarea", "select"].includes(f.type));
  const rows = byNewest(all)
    .filter((r) => matches(sp.q ?? "", ...textFields.map((f) => String(r.data[f.key] ?? ""))))
    .filter((r) => !(sp.status && statusF) || r.data[statusF.key] === sp.status);

  // ---- form (new / edit) ----
  const editing = sp.edit ? (all.find((r) => r._id === sp.edit) ?? null) : null;
  const showForm = !!sp.new || !!editing;
  const refOptions: Record<string, string[]> = {};
  if (showForm) {
    for (const f of entity.fields.filter((x) => x.type === "ref" && x.ref)) {
      const refEntity = getEntity(ws.product as ProductKey, f.ref!);
      if (!refEntity) continue;
      const refs = RECORDS.filter((r) => r.workspace === ws._id && r.entity === refEntity.key);
      refOptions[f.key] = [...new Set(refs.map((r) => String((r.data as Record<string, unknown>)[refEntity.titleField] ?? "")).filter(Boolean))];
    }
  }

  const listFields = entity.fields.filter((f) => f.list);
  const viewQs = (v: string) => `${href}?view=${v}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`;

  return (
    <>
      {sp.saved && <Notice tone="green">{entity.singular} saved.</Notice>}
      <PageHeader
        title={entity.label}
        subtitle={`${rows.length} record${rows.length === 1 ? "" : "s"}`}
        actions={
          <>
            {entity.board && (
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
                <Link href={viewQs("list")} className={`btn btn-sm ${view === "list" ? "bg-slate-100" : ""}`}>
                  <Icon name="List" size={14} /> List
                </Link>
                <Link href={viewQs("board")} className={`btn btn-sm ${view === "board" ? "bg-slate-100" : ""}`}>
                  <Icon name="Kanban" size={14} /> Board
                </Link>
              </div>
            )}
            <Link href={`${href}?new=1`} className="btn btn-primary">
              + Add {entity.singular}
            </Link>
          </>
        }
      />

      {showForm && (
        <RecordForm
          entity={entity}
          values={(editing?.data as Record<string, unknown>) ?? {}}
          refOptions={refOptions}
          action={saveRecord.bind(null, sub, entity.key, editing ? String(editing._id) : null)}
          cancelHref={href}
          isEdit={!!editing}
        />
      )}

      <form className="mb-4 flex flex-wrap gap-2">
        {view === "board" && <input type="hidden" name="view" value="board" />}
        <input name="q" defaultValue={sp.q} placeholder={`Search ${entity.label.toLowerCase()}…`} className="input max-w-xs" />
        {statusF && view === "list" && (
          <select name="status" defaultValue={sp.status ?? ""} className="input max-w-[200px]">
            <option value="">All {statusF.label.toLowerCase()}</option>
            {statusF.options?.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        )}
        <button className="btn btn-outline">Filter</button>
        {(sp.q || sp.status) && (
          <Link href={view === "board" ? viewQs("board").split("&")[0] : href} className="btn btn-ghost">
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 && !showForm ? (
        <Empty title={`No ${entity.label.toLowerCase()} yet`}>
          <Link href={`${href}?new=1`} className="btn btn-primary mt-3">
            Add your first {entity.singular.toLowerCase()}
          </Link>
        </Empty>
      ) : view === "board" && statusF ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statusF.options!.map((col) => {
            const items = rows.filter((r) => (r.data as Record<string, unknown>)[statusF.key] === col);
            return (
              <div key={col} className="w-72 shrink-0 rounded-xl bg-slate-100 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <Badge tone={valueTone(col)}>{col}</Badge>
                  <span className="text-xs text-slate-500">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((r) => {
                    const d = r.data as Record<string, unknown>;
                    const extra = listFields.filter((f) => f.key !== entity.titleField && f.key !== statusF.key).slice(0, 3);
                    return (
                      <div key={String(r._id)} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                        <Link href={`${href}?view=board&edit=${r._id}`} className="text-sm font-medium text-slate-900 hover:text-indigo-600">
                          {String(d[entity.titleField] ?? "") || "(untitled)"}
                        </Link>
                        <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                          {extra.map((f) =>
                            d[f.key] != null && d[f.key] !== "" ? (
                              <div key={f.key}>
                                {f.label}: <Cell f={f} v={d[f.key]} />
                              </div>
                            ) : null,
                          )}
                        </div>
                        <form action={setRecordStatus.bind(null, sub, entity.key, String(r._id))}>
                          <AutoSubmitSelect name="status" value={col} options={statusF.options!} />
                        </form>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {listFields.map((f) => (
                  <th key={f.key} className="th">
                    {f.label}
                  </th>
                ))}
                <th className="th">Created</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = r.data as Record<string, unknown>;
                return (
                  <tr key={String(r._id)} className="hover:bg-slate-50">
                    {listFields.map((f) => (
                      <td key={f.key} className="td">
                        {f.key === entity.titleField ? (
                          <Link href={`${href}?edit=${r._id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                            <Cell f={f} v={d[f.key]} statusField={entity.statusField} />
                          </Link>
                        ) : (
                          <Cell f={f} v={d[f.key]} statusField={entity.statusField} />
                        )}
                      </td>
                    ))}
                    <td className="td text-slate-500">{fmtDate(r.createdAt)}</td>
                    <td className="td text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`${href}?edit=${r._id}`} className="btn btn-outline btn-sm">
                          Edit
                        </Link>
                        <form action={deleteRecord.bind(null, sub, entity.key, String(r._id))}>
                          <ConfirmButton message={`Delete this ${entity.singular.toLowerCase()}?`} className="btn btn-sm text-rose-600 hover:bg-rose-50">
                            Delete
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
