"use server";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CrmRecord } from "@/lib/models";
import { getEntity, type ProductKey } from "@/lib/products";
import { getUsableWorkspace, wsBase } from "@/lib/workspace";

async function load(sub: string, entityKey: string) {
  const s = await requireUser();
  const { ws } = await getUsableWorkspace(sub, s);
  const entity = getEntity(ws.product as ProductKey, entityKey);
  if (!entity) notFound();
  return { s, ws, entity };
}

export async function saveRecord(sub: string, entityKey: string, id: string | null, fd: FormData) {
  const { s, ws, entity } = await load(sub, entityKey);
  const data: Record<string, unknown> = {};
  for (const f of entity.fields) {
    const raw = String(fd.get(f.key) ?? "").trim();
    if (f.required && !raw) throw new Error(`${f.label} is required`);
    if (f.type === "number" || f.type === "currency") data[f.key] = raw === "" ? null : Number(raw);
    else if (f.type === "select" && raw && f.options && !f.options.includes(raw)) data[f.key] = "";
    else data[f.key] = raw;
  }
  // Payroll: auto-calculate net pay when left empty.
  if (entity.key === "payroll" && data.netPay == null) {
    data.netPay = Number(data.basic || 0) + Number(data.allowances || 0) - Number(data.deductions || 0);
  }
  // Leave: auto-calculate days when left empty.
  if (entity.key === "leaves" && data.days == null && data.fromDate && data.toDate) {
    const d = Math.round((new Date(String(data.toDate)).getTime() - new Date(String(data.fromDate)).getTime()) / 86_400_000) + 1;
    data.days = d > 0 ? d : null;
  }

  if (id) await CrmRecord.updateOne({ _id: id, workspace: ws._id, entity: entity.key }, { $set: { data } });
  else await CrmRecord.create({ workspace: ws._id, entity: entity.key, data, createdBy: s.uid });

  revalidatePath(`/w/${sub}`, "layout");
  redirect(`${await wsBase(sub)}/m/${entity.key}?saved=1`);
}

export async function deleteRecord(sub: string, entityKey: string, id: string) {
  const { ws, entity } = await load(sub, entityKey);
  await CrmRecord.deleteOne({ _id: id, workspace: ws._id, entity: entity.key });
  revalidatePath(`/w/${sub}`, "layout");
}

export async function setRecordStatus(sub: string, entityKey: string, id: string, fd: FormData) {
  const { ws, entity } = await load(sub, entityKey);
  const field = entity.fields.find((f) => f.key === entity.statusField);
  const value = String(fd.get("status") ?? "");
  if (!field || !field.options?.includes(value)) return;
  await CrmRecord.updateOne({ _id: id, workspace: ws._id, entity: entity.key }, { $set: { [`data.${field.key}`]: value } });
  revalidatePath(`/w/${sub}`, "layout");
}
