import {
  Check,
  Clock,
  MapPin,
  Moon,
  Pencil,
  Pill,
  Plus,
  RotateCcw,
  Sparkles,
  Stethoscope,
  Sun,
  Sunrise,
  Trash2,
  Undo2,
  User,
  StickyNote,
  HeartPulse,
  Droplet,
  Thermometer,
  Wind,
  Scale,
} from "lucide-react";
import { describeLog, type Item, type Slot } from "@/lib/care";
import type { Row } from "@/lib/db";
import { fmtDate, fmtStamp, fmtTime, relDay } from "@/lib/time";
import { familyAddItem, familyLogDose, familyUpdateItem, helperLogDose, helperSetStatus } from "@/app/actions";
import { Avatar } from "./ui";

export const READING_CHIPS: [string, string, React.ReactNode][] = [
  ["note", "Note", <StickyNote key="n" />],
  ["bp", "BP", <HeartPulse key="b" />],
  ["sugar", "Sugar", <Droplet key="s" />],
  ["temp", "Temp", <Thermometer key="t" />],
  ["spo2", "SpO2", <Wind key="o" />],
  ["weight", "Weight", <Scale key="w" />],
];

export function timesLabel(times?: string | null) {
  return times ? times.split(",").map(fmtTime).join(" · ") : "As needed";
}

function daypart(t: string) {
  const h = Number(t.slice(0, 2));
  if (h < 12) return { key: "m", label: "Morning", icon: <Sunrise /> };
  if (h < 17) return { key: "a", label: "Afternoon", icon: <Sun /> };
  return { key: "n", label: "Evening & night", icon: <Moon /> };
}

const STATE_TEXT: Record<Slot["state"], string> = {
  given: "Given",
  skipped: "Skipped",
  missed: "Not marked",
  due: "Due now",
  upcoming: "Upcoming",
};

/** Today's doses grouped Morning / Afternoon / Night. mode=helper renders big phone buttons. */
export function DoseGroups({ slots, mode, parentId, token, showDate }: { slots: Slot[]; mode: "family" | "helper"; parentId?: string; token?: string; showDate?: boolean }) {
  if (!slots.length) {
    return (
      <div className="empty">
        <div className="e-ico"><Pill /></div>
        No medicines scheduled.
      </div>
    );
  }
  const groups: { key: string; label: string; icon: React.ReactNode; slots: Slot[] }[] = [];
  for (const s of slots) {
    const d = daypart(s.time);
    let g = groups.find((x) => x.key === (showDate ? `${s.date}` : d.key));
    if (!g) {
      g = showDate ? { key: s.date, label: fmtDate(s.date), icon: <Clock />, slots: [] } : { ...d, slots: [] };
      groups.push(g);
    }
    g.slots.push(s);
  }
  const action = mode === "helper" ? helperLogDose : familyLogDose;
  const Hidden = ({ s }: { s: Slot }) => (
    <>
      {mode === "helper" ? <input type="hidden" name="token" value={token} /> : <input type="hidden" name="parent_id" value={parentId} />}
      <input type="hidden" name="item_id" value={s.item.id} />
      <input type="hidden" name="date" value={s.date} />
      <input type="hidden" name="time" value={s.time} />
    </>
  );
  return (
    <div>
      {groups.map((g) => (
        <div key={g.key} className="daypart">
          <div className="daypart-h">
            {g.icon} {g.label}
          </div>
          {g.slots.map((s) => {
            const marked = s.state === "given" || s.state === "skipped";
            return (
              <div key={`${s.item.id}${s.date}${s.time}`} className={`dose ${s.state}`}>
                <div className="pill-ico">{s.state === "given" ? <Check /> : s.state === "skipped" ? <Undo2 /> : <Pill />}</div>
                <div className="grow">
                  <div className="d-name">
                    {s.item.title} <span className="muted" style={{ fontWeight: 500 }}>{s.item.dose}</span>
                  </div>
                  <div className="d-meta">
                    <span className="num bold">{fmtTime(s.time)}</span> · {marked ? `${STATE_TEXT[s.state]} by ${s.log?.actor}` : s.state === "upcoming" ? s.item.instructions || "Upcoming" : STATE_TEXT[s.state]}
                    {s.state !== "upcoming" && !marked && s.item.instructions ? ` · ${s.item.instructions}` : ""}
                  </div>
                </div>
                {marked ? (
                  <form action={action}>
                    <Hidden s={s} />
                    <button className="linkbtn small" name="action" value="undo">
                      <RotateCcw /> Undo
                    </button>
                  </form>
                ) : mode === "helper" ? (
                  <div className="dose-actions">
                    <form action={action}>
                      <Hidden s={s} />
                      <button className="btn btn-primary" name="action" value="given">
                        <Check /> Given
                      </button>
                    </form>
                    <form action={action}>
                      <Hidden s={s} />
                      <button className="btn" name="action" value="skipped">Skip</button>
                    </form>
                  </div>
                ) : (
                  <form action={action} className="dose-actions">
                    <Hidden s={s} />
                    <button className="btn btn-sm" name="action" value="given">
                      <Check /> Given
                    </button>
                    <button className="btn btn-sm btn-ghost hide-mobile" name="action" value="skipped">Skip</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function SourceBadge({ source }: { source?: string | null }) {
  if (!source) return null;
  return source.startsWith("Claude") ? (
    <span className="badge accent" title={source}>
      <Sparkles /> Claude
    </span>
  ) : (
    <span className="badge brand" title={source}>Family</span>
  );
}

function EditPanel({ it }: { it: Item }) {
  return (
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
              <label>Times · 08:00, 20:00 or 1-0-1</label>
              <input name="times" defaultValue={it.times ? it.times.split(",").join(", ") : ""} />
            </div>
            <div>
              <label>Last day</label>
              <input type="date" name="end_date" defaultValue={it.end_date ?? ""} />
            </div>
            <div>
              <label>For</label>
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
            <label>Who’s handling it</label>
            <input name="assignee" defaultValue={it.assignee ?? ""} />
          </div>
        )}
        <div className="full">
          <label>{it.kind === "appointment" ? "Preparation / notes" : "Instructions / notes"}</label>
          <input name="instructions" defaultValue={it.instructions ?? ""} />
        </div>
        <div className="full row between">
          <button className="btn btn-primary btn-sm">
            <Check /> Save changes
          </button>
        </div>
      </form>
      <form action={familyUpdateItem} className="row" style={{ marginTop: 10, gap: 6 }}>
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
        <button className="btn btn-sm btn-ghost btn-danger" name="status" value="deleted">
          <Trash2 /> Delete
        </button>
      </form>
    </div>
  );
}

export function MedList({ items }: { items: Item[] }) {
  if (!items.length) return <EmptyHint icon={<Pill />} text="No medicines yet. Send Claude a prescription photo." />;
  return (
    <ul className="rows">
      {items.map((it) => (
          <li key={it.id}>
            <details className="edit">
              <summary>
                <div className={`item ${it.status !== "active" ? "inactive" : ""}`}>
                  <div className="med-ico"><Pill /></div>
                  <div className="grow">
                    <div className="row" style={{ gap: 8 }}>
                      <span className="i-title">{it.title}</span>
                      {it.dose && <span className="muted small">{it.dose}</span>}
                    </div>
                    <div className="i-chips">
                      {it.times ? (
                        it.times.split(",").map((t: string) => (
                          <span key={t} className="chip">
                            <Clock /> {fmtTime(t)}
                          </span>
                        ))
                      ) : (
                        <span className="chip">As needed</span>
                      )}
                      {it.instructions && <span className="chip">{it.instructions}</span>}
                      {it.purpose && <span className="chip">for {it.purpose.toLowerCase()}</span>}
                      {it.end_date && <span className="chip">until {fmtDate(it.end_date, { weekday: false })}</span>}
                    </div>
                  </div>
                  <div className="row nowrap" style={{ gap: 6 }}>
                    {it.status !== "active" ? <span className="badge">{it.status}</span> : <SourceBadge source={it.source} />}
                    <span className="btn btn-ghost btn-sm icon-btn" title="Edit"><Pencil /></span>
                  </div>
                </div>
              </summary>
              <EditPanel it={it} />
            </details>
          </li>
        ))}
    </ul>
  );
}

export function ApptList({ items, today }: { items: Item[]; today: string }) {
  if (!items.length) return <EmptyHint icon={<Stethoscope />} text="No visits booked. Claude adds follow-ups from discharge summaries." />;
  return (
    <ul className="rows">
      {items.map((it) => {
        const [, m, d] = (it.due_date || "").split("-");
        const month = it.due_date ? new Date(Date.UTC(2000, Number(m) - 1, 1)).toLocaleString("en", { month: "short", timeZone: "UTC" }) : "";
        const wk = it.due_date ? fmtDate(it.due_date).split(",")[0] : "";
        const past = it.status === "active" && it.due_date < today;
        return (
          <li key={it.id}>
            <details className="edit">
              <summary>
                <div className={`item ${it.status !== "active" ? "inactive" : ""}`}>
                  <div className={`date-tile ${past ? "past" : ""}`}>
                    <div className="m">{month}</div>
                    <div className="d">{Number(d)}</div>
                    <div className="w">{wk}</div>
                  </div>
                  <div className="grow">
                    <div className="i-title">{it.title}</div>
                    <div className="i-meta">
                      <span>
                        <Clock /> {it.due_time ? fmtTime(it.due_time) : "Time not set"} · {relDay(it.due_date, today)}
                      </span>
                      {it.place && (
                        <span>
                          <MapPin /> {it.place}
                        </span>
                      )}
                      {it.doctor && (
                        <span>
                          <Stethoscope /> {it.doctor}
                        </span>
                      )}
                      {it.assignee && (
                        <span>
                          <User /> {it.assignee}
                        </span>
                      )}
                    </div>
                    {it.instructions && (
                      <div className="i-meta">
                        <span>
                          <StickyNote /> {it.instructions}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="row nowrap" style={{ gap: 6 }}>
                    {past && <span className="badge danger">Past</span>}
                    {it.status !== "active" ? <span className="badge">{it.status}</span> : <span className="hide-mobile"><SourceBadge source={it.source} /></span>}
                    <span className="btn btn-ghost btn-sm icon-btn" title="Edit"><Pencil /></span>
                  </div>
                </div>
              </summary>
              <EditPanel it={it} />
            </details>
          </li>
        );
      })}
    </ul>
  );
}

export function TaskList({ items, today, token }: { items: Item[]; today: string; token?: string }) {
  if (!items.length) return <EmptyHint icon={<Check />} text="Nothing to do. Nice." />;
  return (
    <ul className="rows">
      {items.map((it) => {
        const done = it.status === "done";
        const overdue = it.status === "active" && it.due_date && it.due_date < today;
        const toggle = (
          <form action={token ? helperSetStatus : familyUpdateItem}>
            {token && <input type="hidden" name="token" value={token} />}
            <input type="hidden" name="item_id" value={it.id} />
            <input type="hidden" name="status" value={done ? "active" : "done"} />
            <button className={`check ${token ? "check-lg" : ""} ${done ? "on" : ""}`} title={done ? "Mark not done" : "Mark done"}>
              <Check />
            </button>
          </form>
        );
        const body = (
          <div className="grow">
            <div className="i-title" style={done ? { textDecoration: "line-through", color: "var(--faint)" } : undefined}>{it.title}</div>
            <div className="i-meta">
              <span>
                <Clock /> {it.due_date ? `${fmtDate(it.due_date)} · ${relDay(it.due_date, today)}` : "No deadline"}
              </span>
              {it.assignee && (
                <span>
                  <User /> {it.assignee}
                </span>
              )}
            </div>
            {it.instructions && (
              <div className="i-meta">
                <span>
                  <StickyNote /> {it.instructions}
                </span>
              </div>
            )}
          </div>
        );
        return (
          <li key={it.id}>
            {token ? (
              <div className="item">
                {toggle}
                {body}
                {overdue && <span className="badge danger">Overdue</span>}
              </div>
            ) : (
              <div className="item">
                {toggle}
                <details className="edit grow">
                  <summary>
                    <div className="item">
                      {body}
                      <div className="row nowrap" style={{ gap: 6 }}>
                        {overdue && <span className="badge danger">Overdue</span>}
                        {it.status === "active" && <span className="hide-mobile"><SourceBadge source={it.source} /></span>}
                        <span className="btn btn-ghost btn-sm icon-btn" title="Edit"><Pencil /></span>
                      </div>
                    </div>
                  </summary>
                  <EditPanel it={it} />
                </details>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function EmptyHint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="empty">
      <div className="e-ico">{icon}</div>
      <div className="small">{text}</div>
    </div>
  );
}

export function AddItem({ parentId, kind, label }: { parentId: string; kind: "medicine" | "appointment" | "task"; label: string }) {
  return (
    <details className="add">
      <summary className="btn btn-sm">
        <Plus /> {label}
      </summary>
      <div className="panel">
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
            <>
              <div>
                <label>Who’s handling it</label>
                <input name="assignee" />
              </div>
              <div className="full">
                <label>Notes</label>
                <input name="instructions" />
              </div>
            </>
          )}
          <div className="full">
            <button className="btn btn-primary btn-sm">
              <Plus /> Add
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}

export function Feed({ logs, showParent, tz }: { logs: Row[]; showParent?: boolean; tz: string }) {
  if (!logs.length) return <EmptyHint icon={<Clock />} text="No activity yet." />;
  return (
    <ul className="feed">
      {logs.map((l) => {
        const isNote = l.action === "note" || l.action === "reading";
        return (
          <li key={l.id}>
            <Avatar name={l.actor} seed={l.actor} size="sm" />
            <div className="grow">
              <div className="f-who">
                {l.actor}
                {showParent && <span className="faint" style={{ fontWeight: 500 }}> · {l.parent_relation || l.parent_name}</span>}
              </div>
              {isNote ? <div className={`f-note ${l.action === "reading" ? "reading" : ""}`}>{l.note}</div> : <div className="f-what">{describeLog(l)}</div>}
              <div className="f-when">{fmtStamp(l.created_at, l.timezone || tz)}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
