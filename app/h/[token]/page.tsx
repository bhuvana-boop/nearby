import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, HeartPulse, ListTodo, MapPin, Pill, Send, StickyNote, TriangleAlert } from "lucide-react";
import AutoRefresh from "@/components/AutoRefresh";
import { DoseGroups, READING_CHIPS, TaskList } from "@/components/Care";
import { Avatar, BrandMark, Ring } from "@/components/ui";
import { activity, doseView, getItems, getParentByHelperToken, parentLabel } from "@/lib/care";
import { one } from "@/lib/db";
import { addDays, fmtDate, fmtStamp, fmtTime, relDay } from "@/lib/time";
import { helperAddUpdate } from "@/app/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Today’s care", robots: { index: false } };

export default async function Helper({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string>> }) {
  const { token } = await params;
  const sp = await searchParams;
  const p = await getParentByHelperToken(token);
  if (!p) notFound();
  const fam = await one(`SELECT name FROM families WHERE id=$1`, [p.family_id]);
  const items = await getItems(p.id);
  const dv = await doseView(p, items, 2);
  const today = dv.now.date;
  const yesterdayMissed = dv.missed.filter((s) => s.date < today);
  const appts = items.filter((i) => i.kind === "appointment" && i.status === "active" && i.due_date >= today && i.due_date <= addDays(today, 30));
  const tasks = items.filter((i) => i.kind === "task" && (i.status === "active" || i.status === "done")).filter((t) => t.status === "active" || t.updated_at > new Date(Date.now() - 2 * 86400000).toISOString());
  const notes = (await activity({ parentId: p.id, limit: 20 })).filter((l) => l.action === "note" || l.action === "reading").slice(0, 3);
  const who = p.relation || p.name;
  const helperFirst = p.helper_name ? p.helper_name.replace(/\s*\(.*\)/, "") : "";
  const total = dv.today.length;
  const given = dv.today.filter((s) => s.state === "given" || s.state === "skipped").length;
  const nextDue = dv.today.find((s) => s.state === "due" || s.state === "upcoming" || s.state === "missed");

  return (
    <div className="helper-wrap">
      <AutoRefresh seconds={15} />
      <div className="helper">
        <header className="helper-hero">
          <div className="row between" style={{ position: "relative", zIndex: 1 }}>
            <span className="brand" style={{ fontSize: 16, color: "#fff" }}>
              <BrandMark size={26} /> Nearby
            </span>
            <span style={{ color: "#a9c7cb", fontSize: 13, fontWeight: 600 }}>{fmtDate(today)} · {fmtTime(dv.now.time)}</span>
          </div>
          <div className="row nowrap" style={{ marginTop: 22, gap: 14, position: "relative", zIndex: 1 }}>
            <Avatar name={who} seed={p.id} size="lg" />
            <div>
              <h1>{who}’s day</h1>
              <p className="sub">{helperFirst ? `Hi ${helperFirst} 👋 ` : ""}Tap Given after each medicine.</p>
            </div>
          </div>
        </header>

        <div className="helper-body stack">
          <div className="card progress-card">
            <Ring pct={total ? Math.round((given / total) * 100) : null} size={64} stroke={7} label={`${given}/${total}`} tone={given === total ? "ok" : ""} />
            <div className="grow">
              <div className="bold" style={{ fontSize: 17 }}>{total === 0 ? "No medicines today" : given === total ? "All done for today 🎉" : `${total - given} medicine${total - given > 1 ? "s" : ""} left today`}</div>
              <div className="muted small">
                {nextDue ? (
                  <>
                    Next: <strong>{nextDue.item.title}</strong> at {fmtTime(nextDue.time)}
                  </>
                ) : (
                  `${fam?.name ?? "The family"} can see every tick instantly.`
                )}
              </div>
            </div>
          </div>

          <section className="card">
            <div className="card-h">
              <span className="ico"><Pill /></span>
              <h2>Medicines</h2>
            </div>
            <div className="card-b">
              <DoseGroups slots={dv.today} mode="helper" token={token} />
            </div>
          </section>

          {yesterdayMissed.length > 0 && (
            <section className="card">
              <div className="card-h">
                <span className="ico danger"><TriangleAlert /></span>
                <h3>Yesterday · not marked</h3>
              </div>
              <div className="card-b">
                <p className="muted small" style={{ marginBottom: 10 }}>If these were given, please tick them.</p>
                <DoseGroups slots={yesterdayMissed} mode="helper" token={token} showDate />
              </div>
            </section>
          )}

          <section className="card">
            <div className="card-h">
              <span className="ico danger"><HeartPulse /></span>
              <h2>Send an update</h2>
            </div>
            <form action={helperAddUpdate} className="card-b stack-sm">
              {sp.sent && <div className="notice"><Send /> Sent. The family can see it now.</div>}
              <input type="hidden" name="token" value={token} />
              <div className="radio-chips">
                {READING_CHIPS.map(([k, label, icon]) => (
                  <label key={k}>
                    <input type="radio" name="kind" value={k} defaultChecked={k === "bp"} />
                    <span>{icon} {label}</span>
                  </label>
                ))}
              </div>
              <input name="text" required placeholder="e.g. 130/84 · or ‘Ate well, slept early’" />
              <button className="btn btn-accent btn-lg btn-block"><Send /> Send to family</button>
              {notes.length > 0 && (
                <ul className="rows" style={{ marginTop: 8 }}>
                  {notes.map((n) => (
                    <li key={n.id} className="small">
                      <div className="row nowrap" style={{ gap: 8, alignItems: "flex-start" }}>
                        <StickyNote size={15} className="faint" style={{ marginTop: 2 }} />
                        <div>
                          {n.note}
                          <div className="faint tiny">{n.actor} · {fmtStamp(n.created_at, dv.tz)}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </form>
          </section>

          {tasks.length > 0 && (
            <section className="card">
              <div className="card-h">
                <span className="ico ok"><ListTodo /></span>
                <h2>To do</h2>
              </div>
              <div className="card-b">
                <TaskList items={tasks} today={today} token={token} />
              </div>
            </section>
          )}

          <section className="card">
            <div className="card-h">
              <span className="ico accent"><CalendarDays /></span>
              <h2>Coming up</h2>
            </div>
            <div className="card-b">
              {appts.length ? (
                <ul className="rows">
                  {appts.map((a) => (
                    <li key={a.id}>
                      <div className="item">
                        <div className="date-tile">
                          <div className="m">{new Date(a.due_date + "T00:00:00Z").toLocaleString("en", { month: "short", timeZone: "UTC" })}</div>
                          <div className="d">{Number(a.due_date.slice(8))}</div>
                          <div className="w">{fmtDate(a.due_date).split(",")[0]}</div>
                        </div>
                        <div className="grow">
                          <div className="i-title">{a.title}</div>
                          <div className="i-meta">
                            <span><Clock /> {a.due_time ? fmtTime(a.due_time) : "Time TBD"} · {relDay(a.due_date, today)}</span>
                            {a.place && <span><MapPin /> {a.place}</span>}
                          </div>
                          {a.instructions && <div className="i-meta"><span><StickyNote /> {a.instructions}</span></div>}
                          {a.assignee && <div className="i-meta">Going with: {a.assignee}</div>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">No visits in the next 30 days.</p>
              )}
            </div>
          </section>

          <p className="faint tiny" style={{ textAlign: "center", paddingTop: 8 }}>
            Shared with you by {fam?.name ?? "the family"} for {parentLabel(p)} · Nearby
          </p>
        </div>
      </div>
    </div>
  );
}
