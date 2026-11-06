// Core care logic, shared by the MCP server (Claude) and the web app (people).
import { query, one, Row } from "./db";
import { newId, nowIso, rand } from "./ids";
import {
  addDays,
  fmtDate,
  fmtStamp,
  fmtTime,
  isDate,
  isTime,
  localParts,
  normalizeTimes,
  relDay,
  safeTz,
} from "./time";

export type Item = Row;
export type Parent = Row;

const str = (v: unknown, max = 500): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

export function parentLabel(p: Parent): string {
  return p.relation ? `${p.relation} (${p.name})` : p.name;
}

// ---------- lookups ----------

export async function familyByMcpKey(key: string) {
  return one(`SELECT * FROM families WHERE mcp_key=$1`, [key]);
}
export async function familyByCalToken(token: string) {
  return one(`SELECT * FROM families WHERE cal_token=$1`, [token]);
}
export async function listParents(familyId: string) {
  return query(`SELECT * FROM parents WHERE family_id=$1 ORDER BY created_at`, [familyId]);
}
export async function getParent(familyId: string, parentId: string) {
  return one(`SELECT * FROM parents WHERE id=$1 AND family_id=$2`, [parentId, familyId]);
}
export async function getParentByHelperToken(token: string) {
  return one(`SELECT * FROM parents WHERE helper_token=$1`, [token]);
}
export async function getItems(parentId: string): Promise<Item[]> {
  const rows = await query(`SELECT * FROM items WHERE parent_id=$1 AND status <> 'deleted'`, [parentId]);
  return sortItems(rows);
}
export async function getItem(familyId: string, itemId: string) {
  return one(
    `SELECT i.*, p.family_id, p.timezone FROM items i JOIN parents p ON p.id=i.parent_id WHERE i.id=$1 AND p.family_id=$2`,
    [itemId, familyId]
  );
}

export function sortItems(rows: Item[]): Item[] {
  const key = (i: Item) =>
    [i.status === "active" ? "0" : "1", i.due_date || "9999", i.due_time || "99", (i.times || "99"), i.title].join("|");
  return [...rows].sort((a, b) => key(a).localeCompare(key(b)));
}

async function log(e: {
  familyId: string;
  parentId: string;
  itemId?: string | null;
  action: string;
  actor: string;
  note?: string | null;
  doseDate?: string | null;
  doseTime?: string | null;
  at?: string;
}) {
  await query(
    `INSERT INTO logs (id,family_id,parent_id,item_id,action,actor,note,dose_date,dose_time,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [newId("l"), e.familyId, e.parentId, e.itemId ?? null, e.action, e.actor, e.note ?? null, e.doseDate ?? null, e.doseTime ?? null, e.at ?? nowIso()]
  );
}

// ---------- parents ----------

const PARENT_FIELDS = ["name", "relation", "age", "city", "conditions", "helper_name", "helper_phone", "timezone", "notes"] as const;

export async function saveParent(familyId: string, input: Record<string, unknown>, actor: string) {
  const vals: Record<string, unknown> = {};
  for (const f of PARENT_FIELDS) {
    if (input[f] === undefined) continue;
    if (f === "age") {
      const n = parseInt(String(input[f]), 10);
      vals.age = Number.isFinite(n) && n > 0 && n < 130 ? n : null;
    } else if (f === "timezone") {
      vals.timezone = safeTz(str(input[f]));
    } else {
      vals[f] = str(input[f], f === "notes" || f === "conditions" ? 2000 : 200);
    }
  }

  const parentId = str(input.parent_id);
  if (parentId) {
    const existing = await getParent(familyId, parentId);
    if (!existing) throw new Error(`No parent with id ${parentId} in this family. Call list_parents to see valid ids.`);
    const keys = Object.keys(vals).filter((k) => !(k === "name" && !vals[k]));
    if (keys.length) {
      const sets = keys.map((k, i) => `${k}=$${i + 3}`).join(", ");
      await query(`UPDATE parents SET ${sets} WHERE id=$1 AND family_id=$2`, [parentId, familyId, ...keys.map((k) => vals[k])]);
      await log({ familyId, parentId, action: "updated", actor, note: `Updated profile: ${keys.join(", ")}` });
    }
    return (await getParent(familyId, parentId))!;
  }

  if (!vals.name) throw new Error("name is required to create a parent.");
  const id = newId("p");
  await query(
    `INSERT INTO parents (id,family_id,name,relation,age,city,conditions,helper_name,helper_phone,helper_token,timezone,notes,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      id,
      familyId,
      vals.name,
      vals.relation ?? null,
      vals.age ?? null,
      vals.city ?? null,
      vals.conditions ?? null,
      vals.helper_name ?? null,
      vals.helper_phone ?? null,
      rand(12),
      (vals.timezone as string) ?? "Asia/Kolkata",
      vals.notes ?? null,
      nowIso(),
    ]
  );
  await log({ familyId, parentId: id, action: "created", actor, note: `Created care board for ${vals.relation ? `${vals.relation} (${vals.name})` : vals.name}` });
  return (await getParent(familyId, id))!;
}

// ---------- care plan ----------

type PlanInput = {
  medicines?: Record<string, unknown>[];
  appointments?: Record<string, unknown>[];
  tasks?: Record<string, unknown>[];
  source_note?: unknown;
};

export async function addCarePlan(familyId: string, parentId: string, plan: PlanInput, actor: string) {
  const parent = await getParent(familyId, parentId);
  if (!parent) throw new Error(`No parent with id ${parentId}. Call list_parents or save_parent first.`);
  const tz = safeTz(parent.timezone);
  const today = localParts(tz).date;
  const now = nowIso();
  const warnings: string[] = [];
  const added: { medicines: Item[]; appointments: Item[]; tasks: Item[] } = { medicines: [], appointments: [], tasks: [] };
  const source = str(plan.source_note, 300);

  const insert = async (kind: string, f: Record<string, unknown>) => {
    const id = newId(kind === "medicine" ? "m" : kind === "appointment" ? "a" : "t");
    await query(
      `INSERT INTO items (id,parent_id,kind,title,dose,times,instructions,purpose,start_date,end_date,due_date,due_time,doctor,place,assignee,status,source,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'active',$16,$17,$17)`,
      [
        id,
        parentId,
        kind,
        f.title,
        f.dose ?? null,
        f.times ?? null,
        f.instructions ?? null,
        f.purpose ?? null,
        f.start_date ?? null,
        f.end_date ?? null,
        f.due_date ?? null,
        f.due_time ?? null,
        f.doctor ?? null,
        f.place ?? null,
        f.assignee ?? null,
        source ? `${actor}: ${source}` : actor,
        now,
      ]
    );
    return (await one(`SELECT * FROM items WHERE id=$1`, [id]))!;
  };

  for (const m of (plan.medicines ?? []).slice(0, 40)) {
    const title = str(m.name ?? m.title, 120);
    if (!title) {
      warnings.push("Skipped a medicine with no name.");
      continue;
    }
    const { times, unclear } = normalizeTimes(m.times ?? m.frequency);
    if (unclear.length) warnings.push(`${title}: could not read time(s) "${unclear.join(", ")}" - please confirm.`);
    if (!times.length) warnings.push(`${title}: no fixed times, saved as "as needed" (no daily reminders).`);
    const start = isDate(m.start_date) ? (m.start_date as string) : today;
    let end: string | null = isDate(m.end_date) ? (m.end_date as string) : null;
    const dur = parseInt(String(m.duration_days ?? ""), 10);
    if (!end && Number.isFinite(dur) && dur > 0) end = addDays(start, dur - 1);
    added.medicines.push(
      await insert("medicine", {
        title,
        dose: str(m.dose, 120),
        times: times.join(","),
        instructions: str(m.instructions, 300),
        purpose: str(m.purpose, 120),
        start_date: start,
        end_date: end,
        assignee: str(m.assignee, 80),
      })
    );
  }

  for (const a of (plan.appointments ?? []).slice(0, 30)) {
    const title = str(a.title, 160);
    if (!title) {
      warnings.push("Skipped an appointment with no title.");
      continue;
    }
    if (!isDate(a.date)) {
      warnings.push(`${title}: no valid date (YYYY-MM-DD), saved as a task to book it instead.`);
      added.tasks.push(
        await insert("task", {
          title: `Book: ${title}`,
          instructions: [str(a.doctor), str(a.place), str(a.prep ?? a.instructions)].filter(Boolean).join(" · ") || null,
          assignee: str(a.assignee, 80),
        })
      );
      continue;
    }
    const time = isTime(a.time) ? (a.time as string) : normalizeTimes(a.time).times[0] ?? null;
    added.appointments.push(
      await insert("appointment", {
        title,
        due_date: a.date,
        due_time: time,
        doctor: str(a.doctor, 120),
        place: str(a.place, 200),
        instructions: str(a.prep ?? a.instructions, 400),
        assignee: str(a.assignee, 80),
      })
    );
  }

  for (const t of (plan.tasks ?? []).slice(0, 40)) {
    const title = str(t.title, 160);
    if (!title) continue;
    added.tasks.push(
      await insert("task", {
        title,
        due_date: isDate(t.due_date) ? t.due_date : null,
        instructions: str(t.notes ?? t.instructions, 400),
        assignee: str(t.assignee, 80),
      })
    );
  }

  const parts = [
    added.medicines.length && `${added.medicines.length} medicine${added.medicines.length > 1 ? "s" : ""}`,
    added.appointments.length && `${added.appointments.length} appointment${added.appointments.length > 1 ? "s" : ""}`,
    added.tasks.length && `${added.tasks.length} task${added.tasks.length > 1 ? "s" : ""}`,
  ].filter(Boolean);
  if (parts.length) {
    await log({ familyId, parentId, action: "created", actor, note: `Added ${parts.join(", ")}${source ? ` from ${source}` : ""}` });
  }
  return { parent, added, warnings };
}

const ITEM_FIELDS: Record<string, string> = {
  title: "title",
  name: "title",
  dose: "dose",
  instructions: "instructions",
  notes: "instructions",
  prep: "instructions",
  purpose: "purpose",
  doctor: "doctor",
  place: "place",
  assignee: "assignee",
  start_date: "start_date",
  end_date: "end_date",
  date: "due_date",
  due_date: "due_date",
  time: "due_time",
};

export async function updateItem(familyId: string, itemId: string, patch: Record<string, unknown>, actor: string) {
  const item = await getItem(familyId, itemId);
  if (!item) throw new Error(`No item with id ${itemId} in this family. Call get_status to see item ids.`);
  const sets: Record<string, unknown> = {};
  const changed: string[] = [];

  for (const [k, col] of Object.entries(ITEM_FIELDS)) {
    if (patch[k] === undefined) continue;
    let v: unknown = str(patch[k], 400);
    if ((col === "due_date" || col === "start_date" || col === "end_date") && v !== null && !isDate(v)) {
      throw new Error(`${k} must be YYYY-MM-DD.`);
    }
    if (col === "due_time" && v !== null) {
      v = isTime(v) ? v : normalizeTimes(v).times[0];
      if (!v) throw new Error("time must be HH:MM (24h).");
    }
    if (col === "title" && !v) continue;
    if ((item[col] ?? null) === v) continue;
    sets[col] = v;
    changed.push(col === "due_date" ? "date" : col === "due_time" ? "time" : col === "instructions" ? "notes" : col);
  }
  if (patch.times !== undefined || patch.frequency !== undefined) {
    const { times, unclear } = normalizeTimes(patch.times ?? patch.frequency);
    if (unclear.length && !times.length) throw new Error(`Could not read times: ${unclear.join(", ")}`);
    if (times.join(",") !== (item.times ?? "")) {
      sets.times = times.join(",");
      changed.push("times");
    }
  }
  let action = "updated";
  if (patch.status !== undefined) {
    const s = String(patch.status);
    if (!["active", "done", "stopped", "deleted"].includes(s)) throw new Error("status must be active, done, stopped or deleted.");
    if (s !== item.status) {
      sets.status = s;
      action = s === "active" ? "reopened" : s;
    }
  }
  const keys = Object.keys(sets);
  if (!keys.length) return item;
  sets.updated_at = nowIso();
  const allKeys = Object.keys(sets);
  await query(`UPDATE items SET ${allKeys.map((k, i) => `${k}=$${i + 2}`).join(", ")} WHERE id=$1`, [itemId, ...allKeys.map((k) => sets[k])]);
  const note = action === "updated" ? `Changed ${[...new Set(changed)].join(", ")}` : null;
  await log({ familyId, parentId: item.parent_id, itemId, action, actor, note });
  return (await one(`SELECT * FROM items WHERE id=$1`, [itemId]))!;
}

// ---------- doses ----------

export type Slot = { item: Item; date: string; time: string; state: "given" | "skipped" | "missed" | "due" | "upcoming"; log?: Row };

function slotsFor(items: Item[], tz: string, from: string, to: string) {
  const out: { item: Item; date: string; time: string }[] = [];
  for (const it of items) {
    if (it.kind !== "medicine" || it.status !== "active" || !it.times) continue;
    const created = localParts(tz, new Date(it.created_at));
    const firstSlot = it.start_date && it.start_date < created.date ? `${it.start_date} 00:00` : `${created.date} ${created.time}`;
    let d = it.start_date && it.start_date > from ? it.start_date : from;
    const last = it.end_date && it.end_date < to ? it.end_date : to;
    for (; d <= last; d = addDays(d, 1)) {
      for (const t of String(it.times).split(",")) {
        if (`${d} ${t}` < firstSlot) continue;
        out.push({ item: it, date: d, time: t });
      }
    }
  }
  return out.sort((a, b) => `${a.date} ${a.time} ${a.item.title}`.localeCompare(`${b.date} ${b.time} ${b.item.title}`));
}

async function doseLogMap(parentId: string, from: string) {
  const rows = await query(
    `SELECT * FROM logs WHERE parent_id=$1 AND action IN ('given','skipped') AND dose_date >= $2 ORDER BY created_at`,
    [parentId, from]
  );
  const map = new Map<string, Row>();
  for (const r of rows) map.set(`${r.item_id}|${r.dose_date}|${r.dose_time}`, r);
  return map;
}

function minutesOf(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function doseView(parent: Parent, items: Item[], days = 7) {
  const tz = safeTz(parent.timezone);
  const now = localParts(tz);
  const from = addDays(now.date, -(days - 1));
  const logs = await doseLogMap(parent.id, from);
  const slots: Slot[] = slotsFor(items, tz, from, now.date).map((s) => {
    const l = logs.get(`${s.item.id}|${s.date}|${s.time}`);
    let state: Slot["state"];
    if (l) state = l.action;
    else if (s.date < now.date) state = "missed";
    else {
      const diff = minutesOf(now.time) - minutesOf(s.time);
      state = diff > 90 ? "missed" : diff >= -30 ? "due" : "upcoming";
    }
    return { ...s, state, log: l };
  });
  const counted = slots.filter((s) => s.state !== "upcoming" && s.state !== "due");
  const given = counted.filter((s) => s.state === "given").length;
  const skipped = counted.filter((s) => s.state === "skipped").length;
  const missed = counted.filter((s) => s.state === "missed");
  return {
    tz,
    now,
    today: slots.filter((s) => s.date === now.date),
    stats: {
      expected: counted.length,
      given,
      skipped,
      missed: missed.length,
      pct: counted.length ? Math.round((given / counted.length) * 100) : null,
    },
    missed,
    skippedSlots: counted.filter((s) => s.state === "skipped"),
  };
}

export async function logDose(parent: Parent, itemId: string, date: string, time: string, action: "given" | "skipped" | "undo", actor: string) {
  const item = await one(`SELECT * FROM items WHERE id=$1 AND parent_id=$2 AND kind='medicine'`, [itemId, parent.id]);
  if (!item || !isDate(date) || !isTime(time)) throw new Error("Invalid dose");
  await query(`DELETE FROM logs WHERE item_id=$1 AND dose_date=$2 AND dose_time=$3 AND action IN ('given','skipped')`, [itemId, date, time]);
  if (action !== "undo") {
    await log({ familyId: parent.family_id, parentId: parent.id, itemId, action, actor, doseDate: date, doseTime: time });
  }
}

export const READING_KINDS: Record<string, string> = {
  note: "Note",
  bp: "Blood pressure",
  sugar: "Blood sugar",
  temp: "Temperature",
  spo2: "Oxygen (SpO2)",
  weight: "Weight",
};

export async function addUpdate(parent: Parent, kind: string, text: string, actor: string) {
  const t = str(text, 600);
  if (!t) return;
  const isReading = kind !== "note" && READING_KINDS[kind];
  await log({
    familyId: parent.family_id,
    parentId: parent.id,
    action: isReading ? "reading" : "note",
    actor,
    note: isReading ? `${READING_KINDS[kind]}: ${t}` : t,
  });
}

export async function activity(opts: { parentId?: string; familyId?: string; limit?: number; since?: string }) {
  const where = opts.parentId ? `l.parent_id=$1` : `l.family_id=$1`;
  const params: unknown[] = [opts.parentId ?? opts.familyId];
  let extra = "";
  if (opts.since) {
    params.push(opts.since);
    extra = ` AND l.created_at >= $2`;
  }
  return query(
    `SELECT l.*, i.title AS item_title, i.dose AS item_dose, p.name AS parent_name, p.relation AS parent_relation, p.timezone
       FROM logs l LEFT JOIN items i ON i.id=l.item_id JOIN parents p ON p.id=l.parent_id
      WHERE ${where}${extra} ORDER BY l.created_at DESC LIMIT ${Math.min(opts.limit ?? 30, 200)}`,
    params
  );
}

export function describeLog(l: Row): string {
  const what = l.item_title ? `${l.item_title}${l.item_dose ? ` ${l.item_dose}` : ""}` : "";
  switch (l.action) {
    case "given":
      return `Marked ${what} (${fmtTime(l.dose_time)}, ${fmtDate(l.dose_date, { weekday: false })}) as given`;
    case "skipped":
      return `Marked ${what} (${fmtTime(l.dose_time)}, ${fmtDate(l.dose_date, { weekday: false })}) as skipped`;
    case "done":
      return `Completed: ${what}`;
    case "stopped":
      return `Stopped: ${what}`;
    case "deleted":
      return `Removed: ${what}`;
    case "reopened":
      return `Reopened: ${what}`;
    case "updated":
      return what ? `Edited ${what}${l.note ? ` - ${l.note.toLowerCase()}` : ""}` : l.note || "Updated";
    case "created":
      return l.note || `Added ${what}`;
    default:
      return l.note || l.action;
  }
}

// ---------- status report for Claude ----------

export async function statusReport(familyId: string, base: string, parentId?: string, days = 7) {
  const parents = parentId ? [await getParent(familyId, parentId)].filter(Boolean) : await listParents(familyId);
  if (!parents.length) {
    return { text: parentId ? `No parent with id ${parentId}.` : "No parents yet. Use save_parent to create one.", data: [] as unknown[] };
  }
  const blocks: string[] = [];
  const data: unknown[] = [];
  for (const p of parents as Parent[]) {
    const items = await getItems(p.id);
    const dv = await doseView(p, items, days);
    const today = dv.now.date;
    const sinceIso = new Date(Date.now() - days * 86400000).toISOString();
    const feed = await activity({ parentId: p.id, limit: 40, since: sinceIso });
    const meds = items.filter((i) => i.kind === "medicine" && i.status === "active");
    const appts = items.filter((i) => i.kind === "appointment" && i.status === "active");
    const tasks = items.filter((i) => i.kind === "task" && i.status === "active");
    const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < today);
    const pastAppts = appts.filter((a) => a.due_date < today);
    const upcoming = appts.filter((a) => a.due_date >= today);
    const notes = feed.filter((l) => l.action === "note" || l.action === "reading");
    const people = feed.filter((l) => l.actor !== "Claude" && ["given", "skipped", "done", "updated"].includes(l.action));

    const L: string[] = [];
    L.push(`## ${parentLabel(p)}${p.age ? `, ${p.age}` : ""}${p.city ? ` - ${p.city}` : ""}  [parent_id: ${p.id}]`);
    L.push(`Local time: ${fmtDate(today)} ${fmtTime(dv.now.time)} (${dv.tz})${p.conditions ? ` · Conditions: ${p.conditions}` : ""}${p.helper_name ? ` · Helper: ${p.helper_name}` : ""}`);
    if (dv.stats.expected) {
      L.push(
        `Medicines, last ${days} days: ${dv.stats.given} of ${dv.stats.expected} doses marked given (${dv.stats.pct}%), ${dv.stats.skipped} skipped, ${dv.stats.missed} not marked.`
      );
    } else {
      L.push(`Medicines: no doses were due in the last ${days} days.`);
    }
    if (dv.missed.length) {
      L.push(`Not marked: ` + dv.missed.slice(-8).map((s) => `${s.item.title} ${fmtTime(s.time)} ${fmtDate(s.date, { weekday: false })}`).join("; "));
    }
    if (dv.skippedSlots.length) {
      L.push(`Skipped: ` + dv.skippedSlots.slice(-5).map((s) => `${s.item.title} ${fmtTime(s.time)} ${fmtDate(s.date, { weekday: false })} (by ${s.log?.actor})`).join("; "));
    }
    if (dv.today.length) {
      L.push(
        `Today: ` +
          dv.today
            .map((s) => `${fmtTime(s.time)} ${s.item.title} - ${s.state === "given" ? `given (${s.log?.actor})` : s.state === "skipped" ? `skipped (${s.log?.actor})` : s.state}`)
            .join("; ")
      );
    }
    L.push(
      upcoming.length
        ? `Upcoming appointments: ` +
            upcoming
              .slice(0, 5)
              .map((a) => `${a.title} - ${fmtDate(a.due_date)}${a.due_time ? ` ${fmtTime(a.due_time)}` : ""} (${relDay(a.due_date, today)})${a.place ? ` at ${a.place}` : ""}${a.doctor ? `, ${a.doctor}` : ""}${a.assignee ? ` · going: ${a.assignee}` : ""}`)
              .join("; ")
        : `Upcoming appointments: none.`
    );
    if (pastAppts.length) L.push(`Past appointments not marked done: ` + pastAppts.map((a) => `${a.title} (${fmtDate(a.due_date)}) [${a.id}]`).join("; "));
    if (overdueTasks.length) L.push(`OVERDUE tasks: ` + overdueTasks.map((t) => `${t.title} - was due ${fmtDate(t.due_date)}${t.assignee ? ` (${t.assignee})` : ""} [${t.id}]`).join("; "));
    const openNotOverdue = tasks.filter((t) => !overdueTasks.includes(t));
    if (openNotOverdue.length) L.push(`Open tasks: ` + openNotOverdue.map((t) => `${t.title}${t.due_date ? ` - due ${fmtDate(t.due_date)}` : ""}${t.assignee ? ` (${t.assignee})` : ""}`).join("; "));
    if (notes.length) L.push(`Notes & readings from home: ` + notes.slice(0, 10).map((n) => `"${n.note}" - ${n.actor}, ${fmtStamp(n.created_at, dv.tz)}`).join("; "));
    if (people.length) L.push(`Recent activity by people: ` + people.slice(0, 8).map((l) => `${l.actor}: ${describeLog(l)}`).join("; "));
    L.push(`Active plan (ids for update_item):`);
    for (const m of meds) L.push(`- [${m.id}] medicine: ${m.title}${m.dose ? ` ${m.dose}` : ""} at ${m.times ? m.times.split(",").map(fmtTime).join(", ") : "as needed"}${m.instructions ? ` · ${m.instructions}` : ""}${m.end_date ? ` · until ${fmtDate(m.end_date)}` : ""}`);
    for (const a of appts) L.push(`- [${a.id}] appointment: ${a.title} ${a.due_date}${a.due_time ? ` ${a.due_time}` : ""}`);
    for (const t of tasks) L.push(`- [${t.id}] task: ${t.title}${t.due_date ? ` due ${t.due_date}` : ""}`);
    L.push(`Care board: ${base}/app/p/${p.id} · Helper link: ${base}/h/${p.helper_token}`);
    blocks.push(L.join("\n"));
    data.push({
      parent_id: p.id,
      name: p.name,
      relation: p.relation,
      doses: dv.stats,
      upcoming_appointments: upcoming.length,
      overdue_tasks: overdueTasks.length,
      board_url: `${base}/app/p/${p.id}`,
      helper_url: `${base}/h/${p.helper_token}`,
    });
  }
  return {
    text:
      blocks.join("\n\n") +
      `\n\nNote: "not marked" means nobody tapped Given/Skipped on the helper link - it may have been given but not recorded.`,
    data,
  };
}
