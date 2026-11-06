import Link from "next/link";
import { headers } from "next/headers";
import { CalendarDays, CalendarPlus, Clock, ListTodo, MapPin, Stethoscope, User } from "lucide-react";
import AppShell from "@/components/AppShell";
import CopyButton from "@/components/CopyButton";
import { Avatar } from "@/components/ui";
import { requireFamily } from "@/lib/auth";
import { query, type Row } from "@/lib/db";
import { baseUrlFrom } from "@/lib/ids";
import { addDays, fmtDate, fmtTime, localParts, relDay } from "@/lib/time";

export const dynamic = "force-dynamic";

function Event({ r }: { r: Row }) {
  return (
    <Link href={`/app/p/${r.pid}#${r.kind === "task" ? "tasks" : "visits"}`} className={`event ${r.kind}`} style={{ color: "inherit" }}>
      <span className="e-bar" />
      <div className="e-time">{r.due_time ? fmtTime(r.due_time) : r.kind === "task" ? "To do" : "All day"}</div>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="bold truncate">{r.title}</div>
        <div className="muted small" style={{ display: "flex", gap: "4px 10px", flexWrap: "wrap" }}>
          {r.kind === "task" ? (
            <span className="row" style={{ gap: 4 }}><ListTodo size={13} /> Task</span>
          ) : (
            <span className="row" style={{ gap: 4 }}><Stethoscope size={13} /> Visit</span>
          )}
          {r.place && <span className="row" style={{ gap: 4 }}><MapPin size={13} /> {r.place}</span>}
          {r.assignee && <span className="row" style={{ gap: 4 }}><User size={13} /> {r.assignee}</span>}
        </div>
      </div>
      <Avatar name={r.relation || r.parent_name} seed={r.pid} size="sm" />
    </Link>
  );
}

export default async function CalendarPage() {
  const fam = await requireFamily();
  const base = baseUrlFrom(await headers());
  const today = localParts("Asia/Kolkata").date;
  const rows = await query(
    `SELECT i.*, p.name AS parent_name, p.relation, p.id AS pid FROM items i JOIN parents p ON p.id=i.parent_id
      WHERE p.family_id=$1 AND i.status='active' AND i.kind IN ('appointment','task') AND i.due_date IS NOT NULL
      ORDER BY i.due_date, i.due_time NULLS FIRST`,
    [fam.id]
  );
  const overdue = rows.filter((r) => r.due_date < today);
  const days = new Map<string, Row[]>();
  for (const r of rows.filter((r) => r.due_date >= today && r.due_date <= addDays(today, 90))) {
    if (!days.has(r.due_date)) days.set(r.due_date, []);
    days.get(r.due_date)!.push(r);
  }
  const calUrl = `${base}/api/cal/${fam.cal_token}`;
  const webcal = calUrl.replace(/^https?:/, "webcal:");
  const dayTitle = (d: string) => {
    const rel = relDay(d, today);
    return rel === "today" ? ["Today", fmtDate(d)] : rel === "tomorrow" ? ["Tomorrow", fmtDate(d)] : [fmtDate(d), rel];
  };

  return (
    <AppShell family={fam} active="calendar" title="Calendar">
      <div className="page-head">
        <div className="grow">
          <h1>Calendar</h1>
          <p className="sub">Every visit and deadline for the family, in one place.</p>
        </div>
      </div>
      <div className="layout">
        <div>
          {overdue.length > 0 && (
            <div className="day-group">
              <div className="day-h">
                <span className="d1" style={{ color: "var(--danger)" }}>Overdue</span>
                <span className="d2">{overdue.length} item{overdue.length > 1 ? "s" : ""}</span>
              </div>
              {overdue.map((r) => <Event key={r.id} r={r} />)}
            </div>
          )}
          {[...days.entries()].map(([d, list]) => (
            <div key={d} className="day-group">
              <div className="day-h">
                <span className="d1">{dayTitle(d)[0]}</span>
                <span className="d2">{dayTitle(d)[1]}</span>
              </div>
              {list.map((r) => <Event key={r.id} r={r} />)}
            </div>
          ))}
          {!rows.length && (
            <div className="card card-pad empty">
              <div className="e-ico"><CalendarDays /></div>
              Nothing scheduled yet. Claude adds follow-ups from discharge summaries automatically.
            </div>
          )}
        </div>
        <aside className="stack">
          <div className="card">
            <div className="card-h">
              <span className="ico accent"><CalendarPlus /></span>
              <h3>Put this on every phone</h3>
            </div>
            <div className="card-b stack-sm">
              <p className="muted small">Each sibling subscribes once. Anything Claude, the helper or the family adds shows up in their own calendar, with a reminder the day before.</p>
              <div className="linkbox">
                <code>{calUrl}</code>
                <CopyButton text={calUrl} iconOnly />
              </div>
              <div className="row" style={{ gap: 8 }}>
                <a className="btn btn-sm btn-primary" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer">
                  <CalendarPlus /> Google Calendar
                </a>
                <a className="btn btn-sm" href={webcal}>Apple / Outlook</a>
              </div>
            </div>
          </div>
          <div className="card card-pad row nowrap" style={{ gap: 8 }}>
            <Clock size={16} className="faint" />
            <span className="muted small">Times are in each parent’s local time (IST by default).</span>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
