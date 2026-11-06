// Live iCalendar feed: siblings subscribe once in Google/Apple/Outlook calendar and every appointment
// or dated task (from Claude, the helper or the family) shows up on their phone.
import { familyByCalToken } from "@/lib/care";
import { query } from "@/lib/db";
import { baseUrlFrom } from "@/lib/ids";
import { addDays, safeTz, zonedToUtc } from "@/lib/time";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const fold = (line: string) => {
  const out: string[] = [];
  let s = line;
  while (s.length > 74) {
    out.push(s.slice(0, 74));
    s = " " + s.slice(74);
  }
  out.push(s);
  return out.join("\r\n");
};

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const fam = await familyByCalToken(token.replace(/\.ics$/, ""));
  if (!fam) return new Response("Not found", { status: 404 });
  const base = baseUrlFrom(req.headers);
  const rows = await query(
    `SELECT i.*, p.name AS parent_name, p.relation, p.timezone FROM items i JOIN parents p ON p.id=i.parent_id
      WHERE p.family_id=$1 AND i.status='active' AND i.kind IN ('appointment','task') AND i.due_date IS NOT NULL`,
    [fam.id]
  );
  const now = stamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nearby//Care calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`${fam.name} · Nearby`)}`,
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];
  for (const r of rows) {
    const who = r.relation || r.parent_name;
    const summary = `${who}: ${r.kind === "task" ? "☐ " : ""}${r.title}`;
    const desc = [
      r.doctor && `Doctor: ${r.doctor}`,
      r.instructions && `Notes: ${r.instructions}`,
      r.assignee && `${r.kind === "appointment" ? "Going" : "Handling"}: ${r.assignee}`,
      `Care board: ${base}/app/p/${r.parent_id}`,
    ]
      .filter(Boolean)
      .join("\n");
    lines.push("BEGIN:VEVENT", `UID:${r.id}@nearby`, `DTSTAMP:${now}`, `LAST-MODIFIED:${stamp(new Date(r.updated_at))}`);
    if (r.due_time) {
      const start = zonedToUtc(r.due_date, r.due_time, safeTz(r.timezone));
      lines.push(`DTSTART:${stamp(start)}`, `DTEND:${stamp(new Date(start.getTime() + 60 * 60000))}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${r.due_date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${addDays(r.due_date, 1).replace(/-/g, "")}`);
    }
    lines.push(fold(`SUMMARY:${esc(summary)}`), fold(`DESCRIPTION:${esc(desc)}`));
    if (r.place) lines.push(fold(`LOCATION:${esc(r.place)}`));
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", fold(`DESCRIPTION:${esc(summary)}`), "TRIGGER:-P1D", "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="nearby.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
