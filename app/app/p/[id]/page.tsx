import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Droplet,
  ExternalLink,
  HeartPulse,
  ListTodo,
  MapPin,
  MessageCircle,
  Pill,
  Scale,
  Smartphone,
  StickyNote,
  Stethoscope,
  Thermometer,
  TriangleAlert,
  User,
  UserPlus,
  Wind,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AutoRefresh from "@/components/AutoRefresh";
import CopyButton from "@/components/CopyButton";
import { AddItem, ApptList, DoseGroups, Feed, MedList, READING_CHIPS, TaskList } from "@/components/Care";
import { Avatar, Ring } from "@/components/ui";
import { requireFamily } from "@/lib/auth";
import { activity, doseView, getItems, getParent } from "@/lib/care";
import { baseUrlFrom } from "@/lib/ids";
import { fmtDate, fmtTime, relDay } from "@/lib/time";
import { familyAddUpdate, familySaveParent } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Board({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fam = await requireFamily();
  const p = await getParent(fam.id, id);
  if (!p) notFound();
  const base = baseUrlFrom(await headers());
  const items = await getItems(p.id);
  const dv = await doseView(p, items, 7);
  const today = dv.now.date;
  const feed = await activity({ parentId: p.id, limit: 25 });

  const meds = items.filter((i) => i.kind === "medicine");
  const appts = items.filter((i) => i.kind === "appointment");
  const tasks = items.filter((i) => i.kind === "task");
  const upcoming = appts.filter((a) => a.status === "active" && a.due_date >= today);
  const overdue = tasks.filter((t) => t.status === "active" && t.due_date && t.due_date < today);
  const next = upcoming[0];
  const givenToday = dv.today.filter((s) => s.state === "given").length;

  const helperUrl = `${base}/h/${p.helper_token}`;
  const helperFirst = p.helper_name ? p.helper_name.replace(/\s*\(.*\)/, "") : "";
  const waText = `Namaste${helperFirst ? ` ${helperFirst}` : ""}! This is ${p.relation || p.name}'s daily care checklist. Please tap "Given" after each medicine and send BP/sugar readings here: ${helperUrl}`;
  const waUrl = `https://wa.me/${(p.helper_phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`;
  const who = p.relation || p.name;

  return (
    <AppShell
      family={fam}
      active={`p:${p.id}`}
      crumb={
        <>
          <Link href="/app" style={{ color: "var(--muted)" }}>Home</Link> <ChevronRight size={15} /> <span style={{ color: "var(--ink)" }}>{who}</span>
        </>
      }
      actions={
        <>
          <a className="btn btn-sm btn-wa" href={waUrl} target="_blank" rel="noreferrer" title="Send helper link on WhatsApp">
            <MessageCircle /> <span className="hide-mobile">WhatsApp helper</span>
          </a>
          <a className="btn btn-sm icon-btn" href={`/h/${p.helper_token}`} target="_blank" title="Open helper view">
            <Smartphone />
          </a>
        </>
      }
    >
      <AutoRefresh seconds={8} />

      <div className="card profile">
        <Avatar name={who} seed={p.id} size="xl" />
        <div className="grow">
          <h1>{p.relation ? `${p.relation} · ${p.name}` : p.name}</h1>
          <div className="meta">
            {p.age && <span className="chip"><User /> {p.age} yrs</span>}
            {p.city && <span className="chip"><MapPin /> {p.city}</span>}
            {p.conditions && <span className="chip"><Stethoscope /> {p.conditions}</span>}
            {p.helper_name && <span className="chip"><Smartphone /> {p.helper_name}</span>}
          </div>
        </div>
        <div className="row hide-mobile" style={{ gap: 14 }}>
          <Ring pct={dv.stats.pct} size={76} stroke={8} />
          <div>
            <div className="bold">Doses this week</div>
            <div className="muted small">{dv.stats.given} of {dv.stats.expected} given · {dv.stats.skipped} skipped</div>
            <div className="faint tiny">Local time {fmtTime(dv.now.time)}, {fmtDate(today)}</div>
          </div>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginTop: 16 }}>
        <div className={`card kpi ${dv.today.length && givenToday === dv.today.length ? "ok" : "brand"}`}>
          <div className="k-ico"><Pill /></div>
          <div>
            <div className="k-label">Today</div>
            <div className="k-value">{givenToday}/{dv.today.length}</div>
            <div className="k-sub">doses given</div>
          </div>
        </div>
        <div className={`card kpi ${dv.stats.missed ? "danger" : "ok"}`}>
          <div className="k-ico"><Activity /></div>
          <div>
            <div className="k-label">Not marked</div>
            <div className="k-value">{dv.stats.missed}</div>
            <div className="k-sub">in the last 7 days</div>
          </div>
        </div>
        <div className="card kpi accent">
          <div className="k-ico"><CalendarDays /></div>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="k-label">Next visit</div>
            <div className="k-value truncate" style={{ fontSize: 17, marginTop: 4 }}>{next ? next.title : "None"}</div>
            <div className="k-sub">{next ? `${fmtDate(next.due_date)} · ${relDay(next.due_date, today)}` : "Nothing booked"}</div>
          </div>
        </div>
        <div className={`card kpi ${overdue.length ? "danger" : "ok"}`}>
          <div className="k-ico"><TriangleAlert /></div>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="k-label">Overdue</div>
            <div className="k-value">{overdue.length}</div>
            <div className="k-sub truncate">{overdue[0]?.title ?? "All on track"}</div>
          </div>
        </div>
      </div>

      <nav className="seg seg-sticky" style={{ marginTop: 12 }}>
        <a href="#today"><Pill /> Today</a>
        <a href="#meds"><Pill /> Medicines</a>
        <a href="#visits"><CalendarDays /> Visits</a>
        <a href="#tasks"><ListTodo /> Tasks</a>
        <a href="#update"><HeartPulse /> Readings</a>
        <a href="#activity"><Activity /> Activity</a>
      </nav>

      <div className="layout" style={{ marginTop: 16 }}>
        <div className="stack">
          <section id="today" className="card">
            <div className="card-h">
              <span className="ico"><Pill /></span>
              <h2>Today’s medicines</h2>
              <span className={`badge ${givenToday === dv.today.length && dv.today.length ? "ok" : "brand"}`}>{givenToday} of {dv.today.length} given</span>
            </div>
            <div className="card-b">
              <DoseGroups slots={dv.today} mode="family" parentId={p.id} />
            </div>
          </section>

          <section id="meds" className="card">
            <div className="card-h">
              <span className="ico"><Pill /></span>
              <h2>Medicines</h2>
              <span className="muted small">{meds.filter((m) => m.status === "active").length} active</span>
            </div>
            <div className="card-b">
              <MedList items={meds} />
            </div>
            <div className="card-f">
              <AddItem parentId={p.id} kind="medicine" label="Add medicine" />
            </div>
          </section>

          <section id="visits" className="card">
            <div className="card-h">
              <span className="ico accent"><CalendarDays /></span>
              <h2>Doctor visits</h2>
              <Link href="/app/calendar" className="linkbtn small">Calendar <ChevronRight /></Link>
            </div>
            <div className="card-b">
              <ApptList items={appts} today={today} />
            </div>
            <div className="card-f">
              <AddItem parentId={p.id} kind="appointment" label="Add visit" />
            </div>
          </section>

          <section id="tasks" className="card">
            <div className="card-h">
              <span className="ico ok"><ListTodo /></span>
              <h2>Tasks</h2>
              <span className="muted small">{tasks.filter((t) => t.status === "active").length} open</span>
            </div>
            <div className="card-b">
              <TaskList items={tasks} today={today} />
            </div>
            <div className="card-f">
              <AddItem parentId={p.id} kind="task" label="Add task" />
            </div>
          </section>
        </div>

        <aside className="stack">
          <section className="card">
            <div className="card-h">
              <span className="ico ok"><Smartphone /></span>
              <h3>Helper link</h3>
              <span className="badge">No login</span>
            </div>
            <div className="card-b stack-sm">
              <p className="muted small">{helperFirst || "The helper"} gets a simple checklist on their phone to tick medicines and send readings.</p>
              <div className="linkbox">
                <code>{helperUrl}</code>
                <CopyButton text={helperUrl} iconOnly />
              </div>
              <div className="row" style={{ gap: 8 }}>
                <a className="btn btn-sm btn-wa" href={waUrl} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
                <a className="btn btn-sm" href={`/h/${p.helper_token}`} target="_blank"><ExternalLink /> Open</a>
              </div>
            </div>
          </section>

          <section id="update" className="card">
            <div className="card-h">
              <span className="ico danger"><HeartPulse /></span>
              <h3>Add a reading or note</h3>
            </div>
            <form action={familyAddUpdate} className="card-b stack-sm">
              <input type="hidden" name="parent_id" value={p.id} />
              <div className="radio-chips">
                {READING_CHIPS.map(([k, label, icon], i) => (
                  <label key={k}>
                    <input type="radio" name="kind" value={k} defaultChecked={i === 0} />
                    <span>{icon} {label}</span>
                  </label>
                ))}
              </div>
              <input name="text" required placeholder="e.g. 130/84 · or ‘Spoke to Amma, sounds better’" />
              <button className="btn btn-primary btn-sm">Save</button>
            </form>
          </section>

          <section id="activity" className="card">
            <div className="card-h">
              <span className="ico"><Activity /></span>
              <h3>Activity</h3>
              <span className="badge ok">● Live</span>
            </div>
            <div className="card-b">
              <Feed logs={feed} tz={dv.tz} />
            </div>
          </section>

          <details className="add card">
            <summary className="card-h" style={{ borderBottom: 0 }}>
              <span className="ico"><UserPlus /></span>
              <h3>Edit profile</h3>
            </summary>
            <form action={familySaveParent} className="fields card-b" style={{ paddingTop: 0 }}>
              <input type="hidden" name="parent_id" value={p.id} />
              <div>
                <label>Name</label>
                <input name="name" defaultValue={p.name} required />
              </div>
              <div>
                <label>Called</label>
                <input name="relation" defaultValue={p.relation ?? ""} />
              </div>
              <div>
                <label>Age</label>
                <input name="age" type="number" defaultValue={p.age ?? ""} />
              </div>
              <div>
                <label>City</label>
                <input name="city" defaultValue={p.city ?? ""} />
              </div>
              <div>
                <label>Helper</label>
                <input name="helper_name" defaultValue={p.helper_name ?? ""} />
              </div>
              <div>
                <label>Helper WhatsApp</label>
                <input name="helper_phone" defaultValue={p.helper_phone ?? ""} />
              </div>
              <div className="full">
                <label>Conditions</label>
                <input name="conditions" defaultValue={p.conditions ?? ""} />
              </div>
              <div className="full">
                <label>Notes</label>
                <textarea name="notes" defaultValue={p.notes ?? ""} />
              </div>
              <div className="full">
                <button className="btn btn-primary btn-block">Save profile</button>
              </div>
            </form>
          </details>
        </aside>
      </div>
    </AppShell>
  );
}
