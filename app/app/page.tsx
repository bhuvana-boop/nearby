import Link from "next/link";
import { headers } from "next/headers";
import { CalendarClock, ChevronRight, ListTodo, Pill, Plug, RotateCcw, Sparkles, TriangleAlert, UserPlus } from "lucide-react";
import AppShell from "@/components/AppShell";
import AutoRefresh from "@/components/AutoRefresh";
import CopyButton from "@/components/CopyButton";
import { Feed } from "@/components/Care";
import { Avatar, Ring } from "@/components/ui";
import { requireFamily } from "@/lib/auth";
import { activity, doseView, getItems, listParents, parentLabel } from "@/lib/care";
import { baseUrlFrom } from "@/lib/ids";
import { DEMO } from "@/lib/seed";
import { fmtDate, fmtTime, localParts, relDay } from "@/lib/time";
import { familySaveParent, resetDemoAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const fam = await requireFamily();
  const base = baseUrlFrom(await headers());
  const parents = await listParents(fam.id);
  const attention: { tone: string; icon: React.ReactNode; text: string; sub: string; href: string }[] = [];

  const cards = await Promise.all(
    parents.map(async (p) => {
      const items = await getItems(p.id);
      const dv = await doseView(p, items, 7);
      const today = dv.now.date;
      const next = items.find((i) => i.kind === "appointment" && i.status === "active" && i.due_date >= today);
      const who = p.relation || p.name;
      for (const t of items.filter((i) => i.kind === "task" && i.status === "active" && i.due_date && i.due_date < today)) {
        attention.push({ tone: "danger", icon: <ListTodo />, text: `${who}: ${t.title}`, sub: `Overdue since ${fmtDate(t.due_date)}${t.assignee ? ` · ${t.assignee}` : ""}`, href: `/app/p/${p.id}#tasks` });
      }
      const unmarked = dv.today.filter((s) => s.state === "missed");
      if (unmarked.length) {
        attention.push({ tone: "warn", icon: <Pill />, text: `${who}: ${unmarked.length} dose${unmarked.length > 1 ? "s" : ""} not marked today`, sub: unmarked.map((s) => `${s.item.title} ${fmtTime(s.time)}`).join(", "), href: `/app/p/${p.id}#today` });
      }
      for (const a of items.filter((i) => i.kind === "appointment" && i.status === "active" && i.due_date >= today && i.due_date <= addDaysStr(today, 3))) {
        attention.push({ tone: "brand", icon: <CalendarClock />, text: `${who}: ${a.title}`, sub: `${relDay(a.due_date, today)}${a.due_time ? `, ${fmtTime(a.due_time)}` : ""}${a.assignee ? ` · ${a.assignee}` : ""}`, href: `/app/p/${p.id}#visits` });
      }
      const todayGiven = dv.today.filter((s) => s.state === "given").length;
      return { p, dv, next, today, todayGiven };
    })
  );
  const feed = await activity({ familyId: fam.id, limit: 10 });
  const mcpUrl = `${base}/api/mcp/${fam.mcp_key}`;
  const hour = Number(localParts("Asia/Kolkata").time.slice(0, 2));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const isDemo = fam.email === DEMO.email;

  return (
    <AppShell family={fam} active="home" title="Home" actions={<Link href="/connect" className="btn btn-sm btn-accent"><Sparkles /> <span>Ask Claude</span></Link>}>
      <AutoRefresh seconds={10} />
      <div className="page-head">
        <div className="grow">
          <div className="hello">{greet}</div>
          <h1 style={{ marginTop: 4 }}>{fam.name}</h1>
          <p className="sub">{parents.length ? `Here’s how ${new Intl.ListFormat("en", { type: "conjunction" }).format([...new Set(parents.map((p) => p.relation || p.name.split(" ")[0]))])} ${parents.length > 1 ? "are" : "is"} doing today.` : "Let’s set up your first care board."}</p>
        </div>
      </div>

      {sp.welcome && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <Sparkles /> <span><strong>Welcome to Nearby.</strong> Connect your Claude, then send it a prescription photo and say “set up a care board for Amma”.</span>
        </div>
      )}
      {sp.reset && <div className="notice" style={{ marginBottom: 16 }}><RotateCcw /> Demo data reset.</div>}
      {isDemo && (
        <div className="notice accent row between" style={{ marginBottom: 20 }}>
          <span className="grow small"><strong>This is the demo family.</strong> Edit anything, or connect Claude and ask it to add a parent.</span>
          <form action={resetDemoAction}>
            <button className="btn btn-sm"><RotateCcw /> Reset demo</button>
          </form>
        </div>
      )}

      <div className="layout">
        <div className="stack">
          {cards.map(({ p, dv, next, today, todayGiven }) => (
            <Link key={p.id} href={`/app/p/${p.id}`} className="card pcard">
              <div className="pcard-top">
                <Avatar name={p.relation || p.name} seed={p.id} size="xl" />
                <div className="grow">
                  <h2>{parentLabel(p)}</h2>
                  <div className="muted small" style={{ marginTop: 3 }}>{[p.age && `${p.age} yrs`, p.city].filter(Boolean).join(" · ")}</div>
                  {p.conditions && <div className="faint small truncate">{p.conditions}</div>}
                </div>
                <ChevronRight className="faint" />
              </div>
              <div className="pcard-stats">
                <Ring pct={dv.stats.pct} size={58} />
                <div>
                  <div className="s-label">This week</div>
                  <div className="s-val">{dv.stats.given}/{dv.stats.expected} doses</div>
                  <div className="faint tiny">Today: {todayGiven} of {dv.today.length} given</div>
                </div>
                <div>
                  <div className="s-label">Next visit</div>
                  <div className="s-val truncate">{next ? next.title : "None booked"}</div>
                  <div className="faint tiny">{next ? `${fmtDate(next.due_date)}${next.due_time ? `, ${fmtTime(next.due_time)}` : ""} · ${relDay(next.due_date, today)}` : "Ask Claude to add one"}</div>
                </div>
              </div>
            </Link>
          ))}

          {!parents.length && (
            <div className="card card-pad empty">
              <div className="e-ico"><UserPlus /></div>
              <h2 style={{ color: "var(--ink)" }}>No parents yet</h2>
              <p className="small" style={{ marginTop: 6 }}>Connect Claude and send it a prescription photo, or add a parent by hand.</p>
              <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
                <Link href="/connect" className="btn btn-primary"><Plug /> Connect Claude</Link>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-h">
              <h2>Latest from home</h2>
              <span className="badge ok">● Live</span>
            </div>
            <div className="card-b">
              <Feed logs={feed} showParent tz="Asia/Kolkata" />
            </div>
          </div>
        </div>

        <aside className="stack">
          <div className="card">
            <div className="card-h">
              <span className="ico danger"><TriangleAlert /></span>
              <h3>Needs attention</h3>
              {attention.length > 0 && <span className="badge danger">{attention.length}</span>}
            </div>
            <div className="card-b">
              {attention.length ? (
                <ul className="rows attention" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {attention.map((a, i) => (
                    <li key={i}>
                      <span className={`a-ico ${a.tone}`}>{a.icon}</span>
                      <Link href={a.href} className="grow" style={{ color: "inherit" }}>
                        <div className="bold small">{a.text}</div>
                        <div className="faint tiny">{a.sub}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">All clear. Nothing overdue.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <span className="ico accent"><Sparkles /></span>
              <h3>Your Claude connector</h3>
            </div>
            <div className="card-b stack-sm">
              <p className="muted small">Paste this in Claude → Settings → Connectors → Add custom connector.</p>
              <div className="linkbox">
                <code>{mcpUrl}</code>
                <CopyButton text={mcpUrl} iconOnly />
              </div>
              <Link href="/connect" className="linkbtn small">Full setup guide <ChevronRight /></Link>
            </div>
          </div>

          <details className="add card">
            <summary className="card-h" style={{ borderBottom: 0 }}>
              <span className="ico"><UserPlus /></span>
              <h3>Add a parent</h3>
              <span className="badge brand">Manual</span>
            </summary>
            <form action={familySaveParent} className="fields card-b" style={{ paddingTop: 0 }}>
              <div>
                <label>Name</label>
                <input name="name" required placeholder="Lakshmi Menon" />
              </div>
              <div>
                <label>You call them</label>
                <input name="relation" placeholder="Amma, Papa…" />
              </div>
              <div>
                <label>Age</label>
                <input name="age" type="number" min={1} max={120} />
              </div>
              <div>
                <label>City</label>
                <input name="city" placeholder="Thrissur" />
              </div>
              <div>
                <label>Helper at home</label>
                <input name="helper_name" placeholder="Sindhu (nurse)" />
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
                <button className="btn btn-primary btn-block"><UserPlus /> Create care board</button>
              </div>
            </form>
          </details>
        </aside>
      </div>
    </AppShell>
  );
}

function addDaysStr(d: string, n: number) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10);
}
