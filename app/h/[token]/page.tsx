import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AutoRefresh from "@/components/AutoRefresh";
import { activity, doseView, getItems, getParentByHelperToken, parentLabel, READING_KINDS } from "@/lib/care";
import { one } from "@/lib/db";
import { addDays, fmtDate, fmtStamp, fmtTime, relDay } from "@/lib/time";
import { helperAddUpdate, helperLogDose, helperSetStatus } from "@/app/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Today's care checklist · Nearby", robots: { index: false } };

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
  const tasks = items.filter((i) => i.kind === "task" && i.status === "active");
  const recentDone = items.filter((i) => i.kind === "task" && i.status === "done").slice(0, 3);
  const notes = (await activity({ parentId: p.id, limit: 20 })).filter((l) => l.action === "note" || l.action === "reading").slice(0, 4);
  const who = p.relation || p.name;
  const helperFirst = p.helper_name ? p.helper_name.replace(/\s*\(.*\)/, "") : "";
  const pending = dv.today.filter((s) => s.state !== "given" && s.state !== "skipped").length;

  const DoseRow = ({ s }: { s: (typeof dv.today)[number] }) => (
    <div className={`dose ${s.state}`}>
      <div className="time">{fmtTime(s.time)}</div>
      <div className="grow">
        <div className="item-title">
          {s.item.title} <span className="muted" style={{ fontWeight: 400 }}>{s.item.dose}</span>
        </div>
        {s.item.instructions && <div className="item-meta">{s.item.instructions}</div>}
        {s.date !== today && <div className="item-meta">{fmtDate(s.date)}</div>}
      </div>
      {s.state === "given" || s.state === "skipped" ? (
        <form action={helperLogDose} className="row" style={{ gap: 12, width: "100%", paddingLeft: 2 }}>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="item_id" value={s.item.id} />
          <input type="hidden" name="date" value={s.date} />
          <input type="hidden" name="time" value={s.time} />
          <span className={s.state === "given" ? "tick" : "muted"}>{s.state === "given" ? "✓ Given" : "Skipped"}</span>
          <button className="linkbtn small" name="action" value="undo">Undo</button>
        </form>
      ) : (
        <div className="actions">
          <form action={helperLogDose}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="item_id" value={s.item.id} />
            <input type="hidden" name="date" value={s.date} />
            <input type="hidden" name="time" value={s.time} />
            <button className="btn btn-primary" name="action" value="given">✓ Given</button>
          </form>
          <form action={helperLogDose} style={{ flex: "0 0 34%" }}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="item_id" value={s.item.id} />
            <input type="hidden" name="date" value={s.date} />
            <input type="hidden" name="time" value={s.time} />
            <button className="btn" name="action" value="skipped">Skip</button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <main className="helper">
      <AutoRefresh seconds={15} />
      <div className="row between">
        <span className="logo" style={{ fontSize: 17 }}>
          <span className="logo-mark" style={{ width: 24, height: 24, fontSize: 13 }}>◐</span> Nearby
        </span>
        <span className="faint small">{fmtDate(today)} · {fmtTime(dv.now.time)}</span>
      </div>

      <h1 style={{ marginTop: 18 }}>{who}’s care today</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        {helperFirst ? `Hi ${helperFirst}! ` : ""}Tap <strong>Given</strong> after each medicine. {fam?.name ?? "The family"} can see it instantly.
      </p>

      <section className="card mt">
        <div className="section-head">
          <h2>Medicines</h2>
          <span className={`badge ${pending ? "warn" : "ok"}`}>{pending ? `${pending} left` : "All done"}</span>
        </div>
        {dv.today.length ? dv.today.map((s) => <DoseRow key={`${s.item.id}${s.time}`} s={s} />) : <p className="muted">No medicines today.</p>}
      </section>

      {yesterdayMissed.length > 0 && (
        <section className="card mt">
          <h3>Yesterday – not marked</h3>
          <p className="muted small" style={{ marginTop: 4 }}>If these were given, please tick them.</p>
          <div style={{ marginTop: 10 }}>
            {yesterdayMissed.map((s) => (
              <DoseRow key={`${s.item.id}${s.date}${s.time}`} s={s} />
            ))}
          </div>
        </section>
      )}

      <section className="card mt">
        <h2>Send an update to the family</h2>
        {sp.sent && <div className="notice" style={{ marginTop: 10 }}>Sent ✓ The family can see it now.</div>}
        <form action={helperAddUpdate} className="stack-sm" style={{ marginTop: 12 }}>
          <input type="hidden" name="token" value={token} />
          <select name="kind" defaultValue="bp">
            {Object.entries(READING_KINDS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input name="text" required placeholder="e.g. 130/84, or 'Ate well, slept early'" />
          <button className="btn btn-accent btn-lg" style={{ width: "100%" }}>Send</button>
        </form>
        {notes.length > 0 && (
          <ul className="list" style={{ marginTop: 14 }}>
            {notes.map((n) => (
              <li key={n.id} className="small">
                {n.note}
                <div className="faint tiny">{n.actor} · {fmtStamp(n.created_at, dv.tz)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {tasks.length > 0 && (
        <section className="card mt">
          <h2>To do</h2>
          <ul className="list" style={{ marginTop: 8 }}>
            {tasks.map((t) => (
              <li key={t.id}>
                <div className="row between" style={{ alignItems: "flex-start" }}>
                  <div className="grow">
                    <div className="item-title">{t.title}</div>
                    <div className="item-meta">
                      {t.due_date ? `Due ${fmtDate(t.due_date)} (${relDay(t.due_date, today)})` : "No deadline"}
                      {t.assignee && ` · ${t.assignee}`}
                    </div>
                    {t.instructions && <div className="item-meta">📝 {t.instructions}</div>}
                  </div>
                  <form action={helperSetStatus}>
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="item_id" value={t.id} />
                    <input type="hidden" name="status" value="done" />
                    <button className="btn">Done</button>
                  </form>
                </div>
              </li>
            ))}
            {recentDone.map((t) => (
              <li key={t.id} className="done">
                <div className="row between">
                  <div className="item-title">{t.title}</div>
                  <form action={helperSetStatus}>
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="item_id" value={t.id} />
                    <input type="hidden" name="status" value="active" />
                    <button className="linkbtn small">Undo</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card mt">
        <h2>Coming up</h2>
        {appts.length ? (
          <ul className="list" style={{ marginTop: 8 }}>
            {appts.map((a) => (
              <li key={a.id}>
                <div className="item-title">{a.title}</div>
                <div className="item-meta">
                  {fmtDate(a.due_date)}
                  {a.due_time && `, ${fmtTime(a.due_time)}`} · {relDay(a.due_date, today)}
                </div>
                {(a.place || a.doctor) && <div className="item-meta">{[a.place, a.doctor].filter(Boolean).join(" · ")}</div>}
                {a.instructions && <div className="item-meta">📝 {a.instructions}</div>}
                {a.assignee && <div className="item-meta">Going with: {a.assignee}</div>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>No appointments in the next 30 days.</p>
        )}
      </section>

      <p className="faint tiny" style={{ marginTop: 24, textAlign: "center" }}>
        Shared with you by {fam?.name ?? "the family"} for {parentLabel(p)} · Nearby
      </p>
    </main>
  );
}
