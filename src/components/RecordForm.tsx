import Link from "next/link";
import type { Entity } from "@/lib/products";

export function RecordForm({
  entity,
  values,
  refOptions,
  action,
  cancelHref,
  isEdit,
}: {
  entity: Entity;
  values: Record<string, unknown>;
  refOptions: Record<string, string[]>;
  action: (fd: FormData) => Promise<void>;
  cancelHref: string;
  isEdit: boolean;
}) {
  return (
    <form action={action} className="card mb-6 p-5">
      <h2 className="mb-4 font-semibold text-slate-900">{isEdit ? `Edit ${entity.singular}` : `New ${entity.singular}`}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entity.fields.map((f) => {
          const v = values[f.key] == null ? "" : String(values[f.key]);
          const label = (
            <label className="label" htmlFor={`f-${f.key}`}>
              {f.label}
              {f.required && " *"}
            </label>
          );
          if (f.type === "textarea")
            return (
              <div key={f.key} className="sm:col-span-2 lg:col-span-3">
                {label}
                <textarea id={`f-${f.key}`} name={f.key} defaultValue={v} rows={3} className="input" required={f.required} />
              </div>
            );
          if (f.type === "select")
            return (
              <div key={f.key}>
                {label}
                <select id={`f-${f.key}`} name={f.key} defaultValue={v || (f.key === entity.statusField ? f.options?.[0] : "")} className="input" required={f.required}>
                  {f.key !== entity.statusField && <option value="">—</option>}
                  {f.options?.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            );
          if (f.type === "ref")
            return (
              <div key={f.key}>
                {label}
                <input id={`f-${f.key}`} name={f.key} defaultValue={v} list={`dl-${f.key}`} className="input" required={f.required} autoComplete="off" />
                <datalist id={`dl-${f.key}`}>
                  {(refOptions[f.key] ?? []).map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </div>
            );
          const type =
            f.type === "currency" || f.type === "number" ? "number" : f.type === "phone" ? "tel" : f.type === "text" ? "text" : f.type;
          return (
            <div key={f.key}>
              {label}
              <input
                id={`f-${f.key}`}
                name={f.key}
                type={type}
                step={f.type === "currency" ? "0.01" : undefined}
                defaultValue={v}
                className="input"
                required={f.required}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex gap-2">
        <button className="btn btn-primary">{isEdit ? "Save changes" : `Add ${entity.singular}`}</button>
        <Link href={cancelHref} className="btn btn-outline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
