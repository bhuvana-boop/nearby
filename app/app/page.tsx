import Link from "next/link";
import { headers } from "next/headers";
import Nav from "@/components/Nav";
import CopyButton from "@/components/CopyButton";
import AutoRefresh from "@/components/AutoRefresh";
import { Feed } from "@/components/Care";
import { requireFamily } from "@/lib/auth";
import { activity, doseView, getItems, listParents, parentLabel } from "@/lib/care";
import { baseUrlFrom } from "@/lib/ids";
import { DEMO } from "@/lib/seed";
import { fmtDate, fmtTime, relDay } from "@/lib/time";
import { familySaveParent, resetDemoAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const fam = await requireFamily();
  const base = baseUrlFrom(await headers());
  const parents = await listParents(fam.id);
  const cards = await Promise.all(
    parents.map(async (p) => {
      const items = await getItems(p.id);
      const dv = await doseView(p, items, 7);
      const today = dv.now.date;
      const next = items.find((i) => i.kind === "appointment" && i.status === "active" && i.due_date >= today);
      const overdue = items.filter((i) => i.kind === "task" && i.status === "active" && i.due_date && i.due_date < today).length;
      const dueToday = dv.today.filter((s) => s.state === "missed" || s.state === "due").length;
      return { p, dv, next, overdue, dueToday, today };
    })
  );
  const feed = await activity({ familyId: fam.id, limit: 12 });
  const mcpUrl = `${base}/api/mcp/${fam.mcp_key}`;
  const calUrl = `${base}/api/cal/${fam.cal_token}`;
  const webcal = calUrl.replace(/^https?:/, "webcal:");
  const isDemo = fam.email === DEMO.email;

  return (
    <>
      <Nav family={fam} active="app" />
      <AutoRefresh seconds={10} />
      <main className="container mt" style={{ paddingBottom: 40 }}>
        {sp.welcome && (
          <div className="notice" style={{ marginBottom: 20 }}>
            <strong>Welcome to Nearby.</strong> Connect your Claude below, then send it a photo of a prescription or discharge summary and say “set up a care board for Amma”.
          </div>
        )}
        {sp.reset && <div className="notice" style={{ marginBottom: 20 }}>Demo data reset.</div>}
        {isDemo && (
          <div className="card card-tight row between" style={{ marginBottom: 20, background: "var(--accent-soft)", borderColor: "transparent" }}>
            <div className="small">
              <strong>You’re in the demo family.</strong> Edit anything, or connect Claude with the link on the right and ask it to add a parent.
            </div>
            <form action={resetDemoAction}>
              <button className="btn btn-sm">Reset demo data</button>
            </form>
          </div>
        )}

        <div className="board">
          <div className="stack">
            <div className="section-head">
              <h1>{fam.name}</h1>
              <span className="muted small">{parents.length} {parents.length === 1 ? "parent" : "parents"}</span>
            </div>

            {cards.map(({ p, dv, next, overdue, dueToday, today }) => (
              <Link key={p.id} href={`/app/p/${p.id}`} className="card" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
                <div className="row between">
                  <div>
                    <h2>{parentLabel(p)}</h2>
                    <div className="muted small" style={{ marginTop: 4 }}>
                      {[p.age && `${p.age} yrs`, p.city, p.conditions].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className="btn btn-sm">Open board →</span>
                </div>
                <div className="grid grid-3" style={{ marginTop: 16 }}>
                  <div className={`stat card-tight ${dv.stats.pct === null ? "" : dv.stats.pct >= 90 ? "good" : dv.stats.pct >= 75 ? "warn" : "bad"}`} style={{ padding: 0 }}>
                    <div className="label">Doses this week</div>
                    <div className="value">{dv.stats.pct === null ? "-" : `${dv.stats.pct}%`}</div>
                    <div className="sub">{dv.stats.given} of {dv.stats.expected} marked given</div>
                  </div>
                  <div className={`stat card-tight ${overdue ? "bad" : ""}`} style={{ padding: 0 }}>
                    <div className="label">Needs attention</div>
                    <div className="value">{overdue + dueToday}</div>
                    <div className="sub">
                      {overdue} overdue task{overdue === 1 ? "" : "s"} · {dueToday} dose{dueToday === 1 ? "" : "s"} unmarked today
                    </div>
                  </div>
                  <div className="stat card-tight" style={{ padding: 0 }}>
                    <div className="label">Next visit</div>
                    <div className="value" style={{ fontSize: 18, marginTop: 8 }}>{next ? next.title : "None booked"}</div>
                    <div className="sub">{next ? `${fmtDate(next.due_date)}${next.due_time ? `, ${fmtTime(next.due_time)}` : ""} · ${relDay(next.due_date, today)}` : ""}</div>
                  </div>
                </div>
              </Link>
            ))}

            {!parents.length && (
              <div className="card">
                <h2>No parents yet</h2>
                <p className="muted" style={{ marginTop: 8 }}>
                  The fastest way: connect Claude (right), then send it a prescription photo and say “Set up a care board for my mother, Lakshmi, 68, in Thrissur.” Or add one by hand below.
                </p>
              </div>
            )}

            <details className="add edit card">
              <summary className="btn btn-sm">+ Add a parent by hand</summary>
              <form action={familySaveParent} className="fields" style={{ marginTop: 14 }}>
                <div>
                  <label>Name</label>
                  <input name="name" required placeholder="Lakshmi Menon" />
                </div>
                <div>
                  <label>What you call them</label>
                  <input name="relation" placeholder="Amma, Papa, Dadi…" />
                </div>
                <div>
                  <label>Age</label>
                  <input name="age" type="number" min={1} max={120} />
                </div>
                <div>
                  <label>City</label>
                  <input name="city" placeholder="Thrissur, Kerala" />
                </div>
                <div>
                  <label>Helper at home</label>
                  <input name="helper_name" placeholder="Sindhu (home nurse)" />
                </div>
                <div>
                  <label>Helper WhatsApp</label>
                  <input name="helper_phone" placeholder="+91 9…" />
                </div>
                <div className="full">
                  <label>Conditions</label>
                  <input name="conditions" placeholder="Diabetes, high BP" />
                </div>
                <div className="full">
                  <button className="btn btn-primary btn-sm">Create care board</button>
                </div>
              </form>
            </details>

            <div className="card">
              <div className="section-head">
                <h2>Latest from home</h2>
                <span className="faint tiny">updates live</span>
              </div>
              <Feed logs={feed} showParent tz="Asia/Kolkata" />
            </div>
          </div>

          <aside className="stack">
            <div className="card">
              <span className="eyebrow">Your Claude connector</span>
              <h2 style={{ marginTop: 6 }}>Connect Claude</h2>
              <p className="muted small" style={{ marginTop: 6 }}>Claude reads prescriptions and writes the plan. Nearby keeps it live. This link is private to your family.</p>
              <div className="codebox" style={{ marginTop: 12 }}>
                <code>{mcpUrl}</code>
                <CopyButton text={mcpUrl} />
              </div>
              <ol className="steps small">
                <li>In Claude, open <strong>Settings → Connectors → Add custom connector</strong>.</li>
                <li>Name it <strong>Nearby</strong>, paste the link above, click <strong>Add</strong>.</li>
                <li>In a chat, attach a prescription photo and say: <em>“Add this to Amma’s care board.”</em></li>
              </ol>
              <p className="small" style={{ marginTop: 12 }}>
                <Link href="/connect">Claude Desktop, Claude Code & ChatGPT steps →</Link>
              </p>
            </div>

            <div className="card">
              <span className="eyebrow">Family calendar</span>
              <h2 style={{ marginTop: 6 }}>Appointments on every phone</h2>
              <p className="muted small" style={{ marginTop: 6 }}>Every sibling subscribes once. Anything Claude or the helper adds shows up in their calendar, with a reminder the day before.</p>
              <div className="codebox" style={{ marginTop: 12 }}>
                <code>{calUrl}</code>
                <CopyButton text={calUrl} />
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <a className="btn btn-sm" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer">
                  Add to Google Calendar
                </a>
                <a className="btn btn-sm" href={webcal}>Apple / Outlook</a>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
