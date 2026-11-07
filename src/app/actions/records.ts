"use server";
/* eslint-disable @typescript-eslint/no-unused-vars -- demo stubs keep the same inputs as the forms that call them */
// UI-only mode: record changes are not saved.
import { redirect } from "next/navigation";
import { wsBase } from "@/lib/workspace";

export async function saveRecord(sub: string, entityKey: string, _id: string | null, _fd: FormData) {
  redirect(`${wsBase(sub)}/m/${entityKey}?saved=1`);
}

export async function deleteRecord(_sub: string, _entityKey: string, _id: string, _fd: FormData) {}

export async function setRecordStatus(_sub: string, _entityKey: string, _id: string, _fd: FormData) {}
