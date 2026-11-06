import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
const env = Object.fromEntries(readFileSync(".env.vercel", "utf8").split(/\r?\n/).filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
const sql = neon(env.DATABASE_URL);
const extra = await sql.query(`SELECT id, name FROM parents WHERE family_id='f_demo01' AND id <> 'p_amma01'`);
console.log("removing", extra);
for (const p of extra) {
  await sql.query(`DELETE FROM items WHERE parent_id=$1`, [p.id]);
  await sql.query(`DELETE FROM logs WHERE parent_id=$1`, [p.id]);
  await sql.query(`DELETE FROM parents WHERE id=$1`, [p.id]);
}
console.log(await sql.query(`SELECT (SELECT count(*) FROM parents) parents, (SELECT count(*) FROM items) items, (SELECT count(*) FROM logs) logs, (SELECT count(*) FROM families) families`));
