"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentFamily, endSession, hashPassword, requireFamily, startSession, verifyPassword } from "@/lib/auth";
import { addCarePlan, addUpdate, getParent, getParentByHelperToken, logDose, saveParent, updateItem } from "@/lib/care";
import { one, query } from "@/lib/db";
import { newId, nowIso, rand } from "@/lib/ids";
import { DEMO, resetDemo } from "@/lib/seed";

const s = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const opt = (fd: FormData, k: string) => (fd.has(k) ? s(fd, k) : undefined);

function back(path: string) {
  revalidatePath("/", "layout");
  redirect(path);
}

// ---------- auth ----------

export async function login(fd: FormData) {
  const email = s(fd, "email").toLowerCase();
  const fam = await one(`SELECT * FROM families WHERE email=$1`, [email]);
  if (!fam || !verifyPassword(s(fd, "password"), fam.password_hash)) redirect("/login?error=1");
  await startSession(fam.id);
  redirect("/app");
}

export async function signup(fd: FormData) {
  const name = s(fd, "name");
  const email = s(fd, "email").toLowerCase();
  const pw = s(fd, "password");
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || pw.length < 6) redirect("/signup?error=invalid");
  if (await one(`SELECT id FROM families WHERE email=$1`, [email])) redirect("/signup?error=exists");
  const id = newId("f");
  await query(`INSERT INTO families (id,name,email,password_hash,mcp_key,cal_token,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
    id,
    name.slice(0, 80),
    email,
    hashPassword(pw),
    rand(22),
    rand(18),
    nowIso(),
  ]);
  await startSession(id);
  redirect("/app?welcome=1");
}

export async function logout() {
  await endSession();
  redirect("/");
}

export async function resetDemoAction() {
  const fam = await currentFamily();
  if (!fam || fam.email !== DEMO.email) redirect("/app");
  await resetDemo(query);
  back("/app?reset=1");
}

// ---------- family actions ----------

export async function familySaveParent(fd: FormData) {
  const fam = await requireFamily();
  const fields: Record<string, unknown> = {};
  for (const k of ["parent_id", "name", "relation", "age", "city", "conditions", "helper_name", "helper_phone", "notes"]) {
    const v = opt(fd, k);
    if (v !== undefined) fields[k] = v;
  }
  if (!fields.parent_id) delete fields.parent_id;
  const p = await saveParent(fam.id, fields, fam.name);
  back(`/app/p/${p.id}`);
}

export async function familyAddItem(fd: FormData) {
  const fam = await requireFamily();
  const parentId = s(fd, "parent_id");
  const kind = s(fd, "kind");
  const plan: Record<string, Record<string, unknown>[]> = {};
  if (kind === "medicine") {
    plan.medicines = [
      { name: s(fd, "title"), dose: s(fd, "dose"), times: s(fd, "times"), instructions: s(fd, "instructions"), purpose: s(fd, "purpose"), duration_days: s(fd, "duration_days") || undefined },
    ];
  } else if (kind === "appointment") {
    plan.appointments = [
      { title: s(fd, "title"), date: s(fd, "date"), time: s(fd, "time"), doctor: s(fd, "doctor"), place: s(fd, "place"), prep: s(fd, "instructions"), assignee: s(fd, "assignee") },
    ];
  } else {
    plan.tasks = [{ title: s(fd, "title"), due_date: s(fd, "date") || undefined, assignee: s(fd, "assignee"), notes: s(fd, "instructions") }];
  }
  await addCarePlan(fam.id, parentId, plan, fam.name);
  back(`/app/p/${parentId}`);
}

export async function familyUpdateItem(fd: FormData) {
  const fam = await requireFamily();
  const patch: Record<string, unknown> = {};
  for (const k of ["title", "dose", "times", "instructions", "purpose", "end_date", "date", "time", "doctor", "place", "assignee", "status"]) {
    const v = opt(fd, k);
    if (v !== undefined) patch[k] = v;
  }
  if (patch.status === "") delete patch.status;
  const it = await updateItem(fam.id, s(fd, "item_id"), patch, fam.name);
  back(`/app/p/${it.parent_id}`);
}

export async function familyLogDose(fd: FormData) {
  const fam = await requireFamily();
  const p = await getParent(fam.id, s(fd, "parent_id"));
  if (!p) redirect("/app");
  await logDose(p, s(fd, "item_id"), s(fd, "date"), s(fd, "time"), s(fd, "action") as "given" | "skipped" | "undo", fam.name);
  back(`/app/p/${p.id}`);
}

export async function familyAddUpdate(fd: FormData) {
  const fam = await requireFamily();
  const p = await getParent(fam.id, s(fd, "parent_id"));
  if (!p) redirect("/app");
  await addUpdate(p, s(fd, "kind") || "note", s(fd, "text"), fam.name);
  back(`/app/p/${p.id}`);
}

// ---------- helper actions (no login: the secret link is the key) ----------

async function helperParent(fd: FormData) {
  const p = await getParentByHelperToken(s(fd, "token"));
  if (!p) redirect("/");
  return p;
}

export async function helperLogDose(fd: FormData) {
  const p = await helperParent(fd);
  await logDose(p, s(fd, "item_id"), s(fd, "date"), s(fd, "time"), s(fd, "action") as "given" | "skipped" | "undo", p.helper_name || "Helper");
  back(`/h/${p.helper_token}`);
}

export async function helperSetStatus(fd: FormData) {
  const p = await helperParent(fd);
  const item = await one(`SELECT id FROM items WHERE id=$1 AND parent_id=$2`, [s(fd, "item_id"), p.id]);
  if (item) await updateItem(p.family_id, item.id, { status: s(fd, "status") === "active" ? "active" : "done" }, p.helper_name || "Helper");
  back(`/h/${p.helper_token}`);
}

export async function helperAddUpdate(fd: FormData) {
  const p = await helperParent(fd);
  await addUpdate(p, s(fd, "kind") || "note", s(fd, "text"), p.helper_name || "Helper");
  back(`/h/${p.helper_token}?sent=1`);
}
