"use server";
/* eslint-disable @typescript-eslint/no-unused-vars -- demo stubs keep the same inputs as the forms that call them */
// UI-only mode: team changes are not saved.
import type { FormState } from "./auth";

export async function addMember(_sub: string, _: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim();
  if (!name || !String(fd.get("email") ?? "").trim()) return { error: "Name and email are required." };
  return { ok: true, message: `${name} was added to the team. (Demo – nothing is saved.)` };
}

export async function removeMember(_sub: string, _userId: string, _fd: FormData) {}
