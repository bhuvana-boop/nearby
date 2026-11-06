import { describeLog, type Item, type Slot } from "@/lib/care";
import type { Row } from "@/lib/db";
import { fmtDate, fmtStamp, fmtTime, relDay } from "@/lib/time";
import { familyAddItem, familyLogDose, familyUpdateItem } from "@/app/actions";

export function timesLabel(times?: string | null) {
  return times ? times.split(",").map(fmtTime).join(" · ") : "As needed";
}

export function DoseList({ slots, parentId, empty }: { slots: Slot[]; parentId: string; empty?: string }) {
  if (!slots.length) return <p className="muted small">{empty ?? "No medicines scheduled today."}</p>;
  return (
    <div>
      {slots.map((s) => (
        <div key={`${s.item.id}${s.time}`} className={`dose ${s.state}`}>
          <div className="time">{fmtTime(s.time)}</div>
          <div className="grow">
            <div className="item-title">
              {s.item.title} <span className="muted" style={{ fontWeight: 400 }}>{s.item.dose}</span>
            </div>
            <div className="item-meta">
              {s.state === "given" && <>✓ Given · {s.log?.actor}</>}
              {s.state === "skipped" && <>Skipped · {s.log?.actor}</>}
              {s.state === "missed" && <>Not marked yet</>}
              {s.state === "due" && <>Due now</>}
              {s.state === "upcoming" && <>{s.item.instructions || "Upcoming"}</>}
            </div>
          </div>
          <form action={familyLogDose} className="row" style={{ gap: 6 }}>
            <input type="hidden" name="parent_id" value={parentId} />
            <input type="hidden" name="item_id" value={s.item.id} />
            <input type="hidden" name="date" value={s.date} />
            <input type="hidden" name="time" value={s.time} />
            {s.state === "given" || s.state === "skipped" ? (
              <button className="btn btn-sm btn-ghost" name="action" value="undo">Undo</button>
            ) : (
              <>
                <button className="btn btn-sm" name="action" value="given">Given</button>
                <button className="btn btn-sm btn-ghost" name="action" value="skipped">Skip</button>
              </>
            )}
          </form>
        </div>
      ))}
    </div>
  );
}

function SourceBadge({ source }: { source?: string | null }) {
  if (!source) return null;
  const isClaude = source.startsWith("Claude");
  return <span className={`badge ${isClaude ? "accent" : "brand"}`} title={source}>{isClaude ? "via Claude" : "added by family"}</span>;
}

function StatusControls({ it }: { it: Item }) {
  return (
    <form action={familyUpdateItem} className="row" style={{ gap: 6, marginTop: 10 }}>
      <input type="hidden" name="item_id" value={it.id} />
      {it.kind === "medicine" ? (
        <button className="btn btn-sm" name="status" value={it.status === "stopped" ? "active" : "stopped"}>
          {it.status === "stopped" ? "Restart medicine" : "Stop medicine"}
        </button>
      ) : (
        <button className="btn btn-sm" name="status" value={it.status === "done" ? "active" : "done"}>
          {it.status === "done" ? "Reopen" : "Mark done"}
        </button>
      )}
      <button className="btn btn-sm btn-ghost btn-danger" name="status" value="deleted">Delete</button>
    </form>
  );
}

function EditForm({ it }: { it: Item }) {
  return (
    <details className="edit" style={{ marginTop: 6 }}>
      <summary>Edit</summary>
      <div className="panel">
        <form action={familyUpdateItem} className="fields">
          <input type="hidden" name="item_id" value={it.id} />
          <div className={it.kind === "task" ? "full" : ""}>
            <label>{it.kind === "medicine" ? "Medicine" : "Title"}</label>
            <input name="title" defaultValue={it.title} required />
          </div>
          {it.kind === "medicine" && (
            <>
              <div>
                <label>Dose</label>
                <input name="dose" defaultValue={it.dose ?? ""} />
              </div>
              <div>
                <label>Times (e.g. 08:00, 20:00 or 1-0-1)</label>
                <input name="times" defaultValue={it.times ? it.times.split(",").join(", ") : ""} />
              </div>
              <div>
                <label>Last day (optional)</label>
                <input type="date" name="end_date" defaultValue={it.end_date ?? ""} />
              </div>
              <div>
                <label>Purpose</label>
                <input name="purpose" defaultValue={it.purpose ?? ""} />
              </div>
            </>
          )}
          {it.kind === "appointment" && (
            <>
              <div>
                <label>Date</label>
                <input type="date" name="date" defaultValue={it.due_date ?? ""} required />
              </div>
              <div>
                <label>Time</label>
                <input type="time" name="time" defaultValue={it.due_time ?? ""} />
              </div>
              <div>
                <label>Doctor</label>
                <input name="doctor" defaultValue={it.doctor ?? ""} />
              </div>
              <div className="full">
                <label>Place</label>
                <input name="place" defaultValue={it.place ?? ""} />
              </div>
            </>
          )}
          {it.kind === "task" && (
            <div>
              <label>Due date</label>
              <input type="date" name="date" defaultValue={it.due_date ?? ""} />
            </div>
          )}
          {it.kind !== "medicine" && (
            <div>
              <label>Who is handling it</label>
              <input name="assignee" defaultValue={it.assignee ?? ""} />
            </div>
          )}
          <div className="full">
            <label>{it.kind === "appointment" ? "Preparation / notes" : "Instructions / notes"}</label>
            <input name="instructions" defaultValue={it.instructions ?? ""} />
          </div>
          <div className="full row">
            <button className="btn btn-primary btn-sm">Save changes</button>
          </div>
        </form>
        <StatusControls it={it} />
      </div>
    </details>
  );
}

export function ItemList({ items, today, kind }: { items: Item[]; today: string; kind: string }) {
  if (!items.length) return <p className="muted small">Nothing here yet. Ask Claude, or add one below.</p>;
  return (
    <ul className="list">
      {items.map((it) => {
        const inactive = it.status !== "active";
        const overdue = !inactive && it.due_date && it.due_date < today;
        return (
          <li key={it.id} className={inactive ? "done" : ""}>
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div className="grow">
                <div className="item-title">
                  {it.title} {kind === "medicine" && it.dose && <span className="muted" style={{ fontWeight: 400 }}>{it.dose}</span>}
                </div>
                <div className="item-meta">
                  {kind === "medicine" && (
                    <>
                      {timesLabel(it.times)}
                      {it.instructions && ` · ${it.instructions}`}
                      {it.purpose && ` · for ${it.purpose.toLowerCase()}`}
                      {it.end_date && ` · until ${fmtDate(it.end_date)}`}
                    </>
                  )}
                  {kind === "appointment" && (
                    <>
                      {fmtDate(it.due_date)}
                      {it.due_time && `, ${fmtTime(it.due_time)}`} ({relDay(it.due_date, today)})
                      {it.place && ` · ${it.place}`}
                      {it.doctor && ` · ${it.doctor}`}
                    </>
                  )}
                  {kind === "task" && (it.due_date ? `Due ${fmtDate(it.due_date)} (${relDay(it.due_date, today)})` : "No deadline")}
                  {kind !== "medicine" && it.assignee && ` · ${it.assignee}`}
                </div>
                {kind !== "medicine" && it.instructions && <div className="item-meta">📝 {it.instructions}</div>}
              </div>
              <div className="row" style={{ gap: 6 }}>
                {inactive && <span className="badge">{it.status}</span>}
                {overdue && <span className="badge bad">overdue</span>}
                {!inactive && <SourceBadge source={it.source} />}
              </div>
            </div>
            <EditForm it={it} />
          </li>
        );
      })}
    </ul>
  );
}

export function AddItem({ parentId, kind, label }: { parentId: string; kind: string; label: string }) {
  return (
    <details className="add edit" style={{ marginTop: 12 }}>
      <summary className="btn btn-sm">+ {label}</summary>
      <div className="panel" style={{ marginTop: 10 }}>
        <form action={familyAddItem} className="fields">
          <input type="hidden" name="parent_id" value={parentId} />
          <input type="hidden" name="kind" value={kind} />
          <div className={kind === "task" ? "full" : ""}>
            <label>{kind === "medicine" ? "Medicine" : "Title"}</label>
            <input name="title" required placeholder={kind === "medicine" ? "e.g. Metformin" : kind === "appointment" ? "e.g. Cardiology review" : "e.g. Buy glucometer strips"} />
          </div>
          {kind === "medicine" && (
            <>
              <div>
                <label>Dose</label>
                <input name="dose" placeholder="500 mg · 1 tablet" />
              </div>
              <div>
                <label>Times</label>
                <input name="times" placeholder="08:00, 20:00 or 1-0-1" />
              </div>
              <div>
                <label>Days (blank = ongoing)</label>
                <input name="duration_days" type="number" min={1} />
              </div>
              <div className="full">
                <label>Instructions</label>
                <input name="instructions" placeholder="After food" />
              </div>
            </>
          )}
          {kind === "appointment" && (
            <>
              <div>
                <label>Date</label>
                <input type="date" name="date" required />
              </div>
              <div>
                <label>Time</label>
                <input type="time" name="time" />
              </div>
              <div>
                <label>Doctor</label>
                <input name="doctor" />
              </div>
              <div className="full">
                <label>Place</label>
                <input name="place" />
              </div>
            </>
          )}
          {kind === "task" && (
            <div>
              <label>Due date</label>
              <input type="date" name="date" />
            </div>
          )}
          {kind !== "medicine" && (
            <div>
              <label>Who is handling it</label>
              <input name="assignee" />
            </div>
          )}
          {kind !== "medicine" && (
            <div className="full">
              <label>Notes</label>
              <input name="instructions" />
            </div>
          )}
          <div className="full">
            <button className="btn btn-primary btn-sm">Add</button>
          </div>
        </form>
      </div>
    </details>
  );
}

function initials(actor: string) {
  if (actor === "Claude") return "C";
  return actor
    .replace(/\(.*\)/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function Feed({ logs, helperName, showParent, tz }: { logs: Row[]; helperName?: string | null; showParent?: boolean; tz: string }) {
  if (!logs.length) return <p className="muted small">No activity yet.</p>;
  return (
    <ul className="feed">
      {logs.map((l) => {
        const kind = l.actor === "Claude" ? "claude" : l.actor === helperName || /helper|nurse/i.test(l.actor) ? "helper" : "family";
        const isNote = l.action === "note" || l.action === "reading";
        return (
          <li key={l.id}>
            <span className={`avatar ${kind}`}>{initials(l.actor)}</span>
            <div className="grow">
              <div>
                <strong>{l.actor}</strong>{" "}
                {isNote ? (
                  <span className={l.action === "reading" ? "badge warn" : "badge"}>{l.action === "reading" ? "reading" : "note"}</span>
                ) : null}{" "}
                {showParent && <span className="faint">· {l.parent_relation || l.parent_name}</span>}
              </div>
              <div className={isNote ? "" : "muted"}>{isNote ? l.note : describeLog(l)}</div>
              <div className="faint tiny">{fmtStamp(l.created_at, l.timezone || tz)}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
