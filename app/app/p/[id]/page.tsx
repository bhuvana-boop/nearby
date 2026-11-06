import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import CopyButton from "@/components/CopyButton";
import AutoRefresh from "@/components/AutoRefresh";
import { AddItem, DoseList, Feed, ItemList } from "@/components/Care";
import { requireFamily } from "@/lib/auth";
import { activity, doseView, getItems, getParent, parentLabel, READING_KINDS } from "@/lib/care";
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
  const activeAppts = appts.filter((a) => a.status === "active" && a.due_date >= today);
  const overdue = tasks.filter((t) => t.status === "active" && t.due_date && t.due_date < today);
  const next = activeAppts[0];

  const helperUrl = `${base}/h/${p.helper_token}`;
  const waText = `Namaste${p.helper_name ? ` ${p.helper_name.replace(/\s*\(.*\)/, "")}` : ""}! This is ${parentLabel(p)}'s daily care checklist. Please tap "Given" after each medicine and add any BP/sugar readings here: ${helperUrl}`;
  const waPhone = (p.helper_phone || "").replace(/\D/g, "");
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`;

  return (
    <>
      <Nav family={fam} active="app" />
      <AutoRefresh seconds={8} />
      <main className="container mt" style={{ paddingBottom: 40 }}>
        <Link href="/app" className="small">← All parents</Link>
        <div className="row between" style={{ marginTop: 10, alignItems: "flex-end" }}>
          <div>
            <h1>
              {p.relation ? `${p.relation} · ` : ""}
              {p.name}
            </h1>
            <p className="muted" style={{ marginTop: 6 }}>
              {[p.age && `${p.age} yrs`, p.city, p.conditions].filter(Boolean).join(" · ")}
              {p.helper_name && ` · Helper: ${p.helper_name}`}
            </p>
          </div>
          <span className="faint small">Local time {fmtTime(dv.now.time)}, {fmtDate(today)}</span>
        </div>

        <div className="grid grid-4 mt">
          <div className={`card stat ${dv.stats.pct === null ? "" : dv.stats.pct >= 90 ? "good" : dv.stats.pct >= 75 ? "warn" : "bad"}`}>
            <div className="label">Doses, last 7 days</div>
            <div className="value">{dv.stats.pct === null ? "-" : `${dv.stats.pct}%`}</div>
            <div className="sub">{dv.stats.given}/{dv.stats.expected} given · {dv.stats.skipped} skipped</div>
          </div>
          <div className={`card stat ${dv.stats.missed ? "bad" : "good"}`}>
            <div className="label">Not marked</div>
            <div className="value">{dv.stats.missed}</div>
            <div className="sub">doses nobody ticked</div>
          </div>
          <div className="card stat">
            <div className="label">Next visit</div>
            <div className="value" style={{ fontSize: 18, marginTop: 8 }}>{next ? next.title : "None booked"}</div>
            <div className="sub">{next ? `${fmtDate(next.due_date)} · ${relDay(next.due_date, today)}` : "Ask Claude to add one"}</div>
          </div>
          <div className={`card stat ${overdue.length ? "bad" : "good"}`}>
            <div className="label">Overdue tasks</div>
            <div className="value">{overdue.length}</div>
            <div className="sub">{overdue[0]?.title ?? "All on track"}</div>
          </div>
        </div>

        <div className="board mt">
          <div className="stack">
            <section className="card">
              <div className="section-head">
                <h2>Today’s medicines</h2>
                <span className="faint tiny">helper ticks these on their phone · updates live</span>
              </div>
              <DoseList slots={dv.today} parentId={p.id} />
            </section>

            <section className="card">
              <div className="section-head">
                <h2>Medicines</h2>
                <span className="muted small">{meds.filter((m) => m.status === "active").length} active</span>
              </div>
              <ItemList items={meds} today={today} kind="medicine" />
              <AddItem parentId={p.id} kind="medicine" label="Add medicine" />
            </section>

            <section className="card">
              <div className="section-head">
                <h2>Appointments</h2>
                <span className="muted small">in the family calendar</span>
              </div>
              <ItemList items={appts} today={today} kind="appointment" />
              <AddItem parentId={p.id} kind="appointment" label="Add appointment" />
            </section>

            <section className="card">
              <div className="section-head">
                <h2>Tasks</h2>
                <span className="muted small">{tasks.filter((t) => t.status === "active").length} open</span>
              </div>
              <ItemList items={tasks} today={today} kind="task" />
              <AddItem parentId={p.id} kind="task" label="Add task" />
            </section>
          </div>

          <aside className="stack">
            <section className="card">
              <span className="eyebrow">Helper link · no login</span>
              <h3 style={{ marginTop: 6 }}>For {p.helper_name || "whoever is with them"}</h3>
              <p className="muted small" style={{ marginTop: 6 }}>A simple checklist on their phone: tick medicines, mark tasks done, send BP and sugar readings.</p>
              <div className="codebox" style={{ marginTop: 10 }}>
                <code>{helperUrl}</code>
                <CopyButton text={helperUrl} />
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <a className="btn btn-sm btn-primary" href={waUrl} target="_blank" rel="noreferrer">Send on WhatsApp</a>
                <a className="btn btn-sm" href={`/h/${p.helper_token}`} target="_blank">Open helper view</a>
              </div>
            </section>

            <section className="card">
              <h3>Add a note or reading</h3>
              <form action={familyAddUpdate} className="stack-sm" style={{ marginTop: 10 }}>
                <input type="hidden" name="parent_id" value={p.id} />
                <select name="kind" defaultValue="note">
                  {Object.entries(READING_KINDS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <input name="text" required placeholder="e.g. Spoke to Amma, she sounds better" />
                <button className="btn btn-sm">Save</button>
              </form>
            </section>

            <section className="card">
              <div className="section-head">
                <h3>Activity</h3>
                <span className="faint tiny">Claude · helper · family</span>
              </div>
              <Feed logs={feed} helperName={p.helper_name} tz={dv.tz} />
            </section>

            <details className="edit card">
              <summary>Edit profile</summary>
              <form action={familySaveParent} className="fields">
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
                  <button className="btn btn-primary btn-sm">Save profile</button>
                </div>
              </form>
            </details>
          </aside>
        </div>
      </main>
    </>
  );
}
