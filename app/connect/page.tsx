import Link from "next/link";
import { headers } from "next/headers";
import { Bot, Download, MessageSquareText, Plug, Sparkles, Terminal, Wrench } from "lucide-react";
import AppShell from "@/components/AppShell";
import CopyButton from "@/components/CopyButton";
import PublicNav from "@/components/PublicNav";
import { currentFamily } from "@/lib/auth";
import { baseUrlFrom } from "@/lib/ids";
import { DEMO } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connect Claude" };

const PROMPTS = [
  "[attach prescription photo] My mother Lakshmi (68, Thrissur) saw the doctor today. Add this to her care board. Her home nurse is Sindhu.",
  "My father Gopinath was discharged yesterday. Here's the summary. Set up his care board and list anything you couldn't read clearly.",
  "How is Amma doing this week? Anything overdue or worrying?",
  "The diabetes review got moved to next Friday at 4 PM. Update it.",
  "Dr. Varghese stopped the Atorvastatin. Remove it and add Rosuvastatin 10 mg at night.",
];

const TOOLS: [string, string][] = [
  ["list_parents", "Finds the parents on your account and their links"],
  ["save_parent", "Creates a care board and a no-login helper link, or updates a profile"],
  ["add_care_plan", "Saves medicines with times, appointments and tasks read from documents"],
  ["update_item", "Reschedules, changes doses, marks done, stops or removes an item"],
  ["get_status", "Reads doses ticked, readings and notes from home, and what’s overdue"],
];

export default async function Connect() {
  const fam = await currentFamily();
  const base = baseUrlFrom(await headers());
  const url = `${base}/api/mcp/${fam?.mcp_key ?? DEMO.mcpKey}`;

  const body = (
    <div className="stack-lg" style={{ maxWidth: 860 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div className="grow">
          <div className="hello">Connect your Claude</div>
          <h1 style={{ marginTop: 4 }}>Plug Nearby into the Claude you already pay for</h1>
          <p className="sub">Claude does the reading and writing on your own plan. Nearby saves the result, shares it with the helper and keeps it live. No AI keys, no extra AI cost.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <span className="ico accent"><Plug /></span>
          <h2>{fam ? "Your private connector link" : "Demo connector link"}</h2>
          {!fam && <span className="badge accent">Menon family demo</span>}
        </div>
        <div className="card-b stack-sm">
          <div className="linkbox">
            <code>{url}</code>
            <CopyButton text={url} />
          </div>
          <p className="muted small">
            {fam ? (
              "Anyone with this link can edit your family's boards, so keep it private."
            ) : (
              <>
                This writes to the shared demo family. To see the results, <Link href="/login">log in</Link> with <code>{DEMO.email}</code> / <code>{DEMO.password}</code>, or <Link href="/signup">create your own family</Link> to get a private link.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-h">
            <span className="ico"><Sparkles /></span>
            <h3>Claude (web, desktop, mobile)</h3>
          </div>
          <div className="card-b">
            <ol className="steps small">
              <li>
                Open <a href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer">claude.ai → Settings → Connectors</a>.
              </li>
              <li>
                <strong>Add custom connector</strong>. Name it <strong>Nearby</strong>, paste the link above and click <strong>Add</strong>.
              </li>
              <li>In a new chat, switch <strong>Nearby</strong> on from the tools menu. It works in the desktop and mobile apps too.</li>
              <li>Attach a prescription photo and ask Claude to add it to the care board.</li>
            </ol>
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <div className="card-h">
              <span className="ico"><Terminal /></span>
              <h3>Claude Code</h3>
            </div>
            <div className="card-b">
              <div className="linkbox">
                <code>claude mcp add --transport http nearby {url}</code>
                <CopyButton text={`claude mcp add --transport http nearby ${url}`} iconOnly />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <span className="ico"><Bot /></span>
              <h3>ChatGPT works too</h3>
            </div>
            <div className="card-b muted small">Settings → Apps &amp; Connectors → Advanced → Developer mode → Create. Paste the same link, with “No authentication”.</div>
          </div>
        </div>
      </div>

      <div className="card card-pad row between" style={{ gap: 16 }}>
        <div className="grow">
          <h3>No prescription handy?</h3>
          <p className="muted small" style={{ marginTop: 4 }}>Use our sample discharge summary (fictional patient). Download it, attach it in Claude and ask it to set up a care board.</p>
        </div>
        <a className="btn btn-primary" href="/demo/discharge-summary.png" download>
          <Download /> Sample summary
        </a>
      </div>

      <div className="card">
        <div className="card-h">
          <span className="ico accent"><MessageSquareText /></span>
          <h3>Things to ask</h3>
        </div>
        <div className="card-b">
          <ul className="rows">
            {PROMPTS.map((p) => (
              <li key={p} className="row nowrap between" style={{ alignItems: "flex-start" }}>
                <span className="grow small">“{p}”</span>
                <CopyButton text={p} iconOnly />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <span className="ico"><Wrench /></span>
          <h3>What Claude can do in Nearby</h3>
        </div>
        <div className="card-b">
          <ul className="rows">
            {TOOLS.map(([t, d]) => (
              <li key={t} className="row nowrap" style={{ alignItems: "flex-start" }}>
                <code className="chip" style={{ fontFamily: "ui-monospace, monospace" }}>{t}</code>
                <span className="muted small grow">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  if (fam) {
    return (
      <AppShell family={fam} active="connect" title="Connect Claude">
        {body}
      </AppShell>
    );
  }
  return (
    <>
      <PublicNav />
      <main className="wrap" style={{ paddingTop: 32, paddingBottom: 64 }}>
        {body}
      </main>
    </>
  );
}
