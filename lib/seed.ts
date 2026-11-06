// Demo family so reviewers can log in and see a lived-in board. All people and places are fictional.
import { createHash, scryptSync } from "crypto";
import { addDays, localParts, zonedToUtc } from "./time";

export const DEMO = {
  email: "demo@nearby.care",
  password: "nearby-demo",
  mcpKey: "demo-menon-k7m2q",
  calToken: "demo-menon-cal",
  helperToken: "demo-amma",
};

type Q = (text: string, params?: unknown[]) => Promise<Record<string, any>[]>;

export async function seedDemo(q: Q) {
  const exists = await q(`SELECT id FROM families WHERE email=$1`, [DEMO.email]);
  if (exists.length) return;
  await resetDemo(q);
}

export async function resetDemo(q: Q) {
  const old = await q(`SELECT id FROM families WHERE email=$1`, [DEMO.email]);
  for (const f of old) {
    await q(`DELETE FROM items WHERE parent_id IN (SELECT id FROM parents WHERE family_id=$1)`, [f.id]);
    await q(`DELETE FROM logs WHERE family_id=$1`, [f.id]);
    await q(`DELETE FROM parents WHERE family_id=$1`, [f.id]);
    await q(`DELETE FROM families WHERE id=$1`, [f.id]);
  }

  const tz = "Asia/Kolkata";
  const today = localParts(tz).date;
  const nowTime = localParts(tz).time;
  const at = (d: string, t: string, plusMin = 0) => new Date(zonedToUtc(d, t, tz).getTime() + plusMin * 60000).toISOString();
  const salt = createHash("sha256").update("demo-salt").digest("hex").slice(0, 32);
  const fam = "f_demo01";
  await q(`INSERT INTO families (id,name,email,password_hash,mcp_key,cal_token,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
    fam,
    "Menon family",
    DEMO.email,
    `${salt}:${scryptSync(DEMO.password, salt, 32).toString("hex")}`,
    DEMO.mcpKey,
    DEMO.calToken,
    at(addDays(today, -10), "09:00"),
  ]);

  const pid = "p_amma01";
  const start = addDays(today, -7);
  await q(
    `INSERT INTO parents (id,family_id,name,relation,age,city,conditions,helper_name,helper_phone,helper_token,timezone,notes,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      pid,
      fam,
      "Lakshmi Menon",
      "Amma",
      68,
      "Thrissur, Kerala",
      "Type 2 diabetes, high blood pressure",
      "Sindhu (home nurse)",
      "",
      DEMO.helperToken,
      tz,
      "Prefers Malayalam. Arjun (Bengaluru) and Divya (Dubai) share care.",
      at(start, "09:00"),
    ]
  );

  const created = at(start, "07:00");
  const items: [string, string, Record<string, string | null>][] = [
    ["m_metfo1", "medicine", { title: "Metformin", dose: "500 mg · 1 tablet", times: "08:00,20:00", instructions: "After food", purpose: "Diabetes", start_date: start }],
    ["m_amlod1", "medicine", { title: "Amlodipine", dose: "5 mg · 1 tablet", times: "08:00", instructions: "After breakfast", purpose: "Blood pressure", start_date: start }],
    ["m_atorv1", "medicine", { title: "Atorvastatin", dose: "10 mg · 1 tablet", times: "21:00", instructions: "At night", purpose: "Cholesterol", start_date: start }],
    ["a_diab01", "appointment", { title: "Diabetes review", due_date: addDays(today, 9), due_time: "10:30", doctor: "Dr. Meera Varghese", place: "Sahya Heart & Diabetes Centre, Thrissur", instructions: "Bring sugar diary and HbA1c report", assignee: "Arjun" }],
    ["a_eye001", "appointment", { title: "Diabetic eye screening", due_date: addDays(today, 20), due_time: "09:00", doctor: null, place: "Thrissur Eye Clinic", instructions: "Do not drive back - pupils dilated", assignee: "Sindhu (home nurse)" }],
    ["t_hba1c1", "task", { title: "HbA1c + lipid profile blood test (fasting)", due_date: addDays(today, 4), instructions: "Lab opens 7 AM, no food after 10 PM the night before", assignee: "Sindhu (home nurse)" }],
    ["t_refil1", "task", { title: "Refill Metformin (about 10 days left)", due_date: addDays(today, 2), instructions: null, assignee: "Arjun" }],
    ["t_insur1", "task", { title: "Renew Amma's health insurance policy", due_date: addDays(today, -2), instructions: "Policy papers in the steel almirah, top shelf", assignee: "Divya" }],
  ];
  for (const [id, kind, f] of items) {
    await q(
      `INSERT INTO items (id,parent_id,kind,title,dose,times,instructions,purpose,start_date,end_date,due_date,due_time,doctor,place,assignee,status,source,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,$10,$11,$12,$13,$14,'active','Claude: discharge summary',$15,$15)`,
      [id, pid, kind, f.title, f.dose ?? null, f.times ?? null, f.instructions ?? null, f.purpose ?? null, f.start_date ?? null, f.due_date ?? null, f.due_time ?? null, f.doctor ?? null, f.place ?? null, f.assignee ?? null, created]
    );
  }

  let n = 0;
  const log = async (action: string, actor: string, createdAt: string, extra: { item?: string; note?: string; d?: string; t?: string } = {}) => {
    n++;
    await q(
      `INSERT INTO logs (id,family_id,parent_id,item_id,action,actor,note,dose_date,dose_time,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [`l_demo${String(n).padStart(3, "0")}`, fam, pid, extra.item ?? null, action, actor, extra.note ?? null, extra.d ?? null, extra.t ?? null, createdAt]
    );
  };

  await log("created", "Claude", created, { note: "Added 3 medicines, 2 appointments, 3 tasks from discharge summary, Sahya Heart & Diabetes Centre" });

  // Dose history: mostly given by Sindhu, a few gaps so the story is realistic.
  const doses: [string, string][] = [
    ["m_metfo1", "08:00"],
    ["m_amlod1", "08:00"],
    ["m_metfo1", "20:00"],
    ["m_atorv1", "21:00"],
  ];
  for (let back = 6; back >= 0; back--) {
    const d = addDays(today, -back);
    for (const [item, t] of doses) {
      if (back === 0 && t > nowTime) continue;
      if (back === 0 && t >= "20:00") continue;
      const key = `${back}-${item}-${t}`;
      if (key === "3-m_atorv1-21:00" || key === "1-m_metfo1-20:00") continue; // not marked
      if (key === "2-m_metfo1-08:00") {
        await log("skipped", "Sindhu (home nurse)", at(d, t, 25), { item, d, t });
        continue;
      }
      await log("given", "Sindhu (home nurse)", at(d, t, 8 + ((back * 7) % 20)), { item, d, t });
    }
  }

  await log("note", "Sindhu (home nurse)", at(addDays(today, -2), "08:40"), { note: "Skipped morning Metformin - Amma was fasting for the temple. Gave it with lunch." });
  await log("reading", "Sindhu (home nurse)", at(addDays(today, -2), "07:10"), { note: "Blood sugar: 162 mg/dL fasting" });
  await log("reading", "Sindhu (home nurse)", at(addDays(today, -1), "19:40"), { note: "Blood pressure: 138/86" });
  await log("note", "Sindhu (home nurse)", at(addDays(today, -1), "19:45"), { note: "Amma complained of mild knee pain, walked only 10 minutes today." });
  await log("updated", "Arjun", at(addDays(today, -1), "21:15"), { item: "a_diab01", note: "Changed time" });
  if (nowTime > "08:30") {
    await log("reading", "Sindhu (home nurse)", at(today, "07:05"), { note: "Blood sugar: 148 mg/dL fasting" });
  }
}
