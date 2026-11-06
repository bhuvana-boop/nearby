import Link from "next/link";
import { headers } from "next/headers";
import Nav from "@/components/Nav";
import CopyButton from "@/components/CopyButton";
import { currentFamily } from "@/lib/auth";
import { baseUrlFrom } from "@/lib/ids";
import { DEMO } from "@/lib/seed";

export const dynamic = "force-dynamic";

const PROMPTS = [
  "[attach prescription photo] My mother Lakshmi (68, Thrissur) saw the doctor today. Add this to her care board. Her home nurse is Sindhu.",
  "Achan was discharged today, here's the summary. Set up a care board for him and list anything you couldn't read clearly.",
  "How is Amma doing this week? Anything overdue or worrying?",
  "The diabetes review got moved to next Friday at 4 PM. Update it.",
  "Dr. Varghese stopped the Atorvastatin. Remove it and add Rosuvastatin 10 mg at night.",
];

export default async function Connect() {
  const fam = await currentFamily();
  const base = baseUrlFrom(await headers());
  const key = fam?.mcp_key ?? DEMO.mcpKey;
  const url = `${base}/api/mcp/${key}`;
  return (
    <>
      <Nav family={fam} active="connect" />
      <main className="container narrow mt stack" style={{ paddingBottom: 48 }}>
        <div>
          <div className="eyebrow">Connect your Claude</div>
          <h1 style={{ marginTop: 8 }}>Plug Nearby into the Claude you already pay for</h1>
          <p className="muted" style={{ marginTop: 10 }}>
            Nearby is an MCP connector. Claude does the reading and writing on your own plan; Nearby saves the result, shares it with the helper and keeps it live. No AI keys, no extra AI cost.
          </p>
        </div>

        <div className="card">
          <h3>{fam ? `Your private connector link (${fam.name})` : "Demo connector link (Menon family demo)"}</h3>
          <div className="codebox" style={{ marginTop: 10 }}>
            <code>{url}</code>
            <CopyButton text={url} />
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            {fam ? (
              "Anyone with this link can edit your family's boards. Keep it private."
            ) : (
              <>
                This writes to the shared demo family. See the results at <Link href="/login">log in</Link> with <code>{DEMO.email}</code> / <code>{DEMO.password}</code>, or <Link href="/signup">create your own family</Link> to get a private link.
              </>
            )}
          </p>
        </div>

        <div className="card">
          <h2>Claude (web, desktop & mobile)</h2>
          <ol className="steps">
            <li>
              Open <a href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer">claude.ai → Settings → Connectors</a>.
            </li>
            <li>
              Click <strong>Add custom connector</strong>. Name: <strong>Nearby</strong>. URL: paste the link above. Click <strong>Add</strong> (no OAuth needed).
            </li>
            <li>
              In a new chat, open the <strong>+ / tools</strong> menu and make sure <strong>Nearby</strong> is switched on. Connectors added on the web also work in the Claude desktop and mobile apps.
            </li>
            <li>Attach a prescription photo and ask Claude to add it to the care board. Approve the tool calls when Claude asks.</li>
          </ol>
        </div>

        <div className="card">
          <h2>Claude Code</h2>
          <div className="codebox" style={{ marginTop: 10 }}>
            <code>claude mcp add --transport http nearby {url}</code>
            <CopyButton text={`claude mcp add --transport http nearby ${url}`} />
          </div>
        </div>

        <div className="card">
          <h2>ChatGPT works too</h2>
          <p className="muted small" style={{ marginTop: 6 }}>
            Settings → Apps &amp; Connectors → Advanced → turn on Developer mode → Create. Paste the same URL, authentication “No authentication”.
          </p>
        </div>

        <div className="card row between">
          <div className="grow">
            <h2>No prescription handy?</h2>
            <p className="muted small" style={{ marginTop: 6 }}>Use our sample discharge summary (fictional patient). Download it, attach it in Claude and ask it to set up a care board.</p>
          </div>
          <a className="btn btn-primary" href="/demo/discharge-summary.png" download>Download sample</a>
        </div>

        <div className="card">
          <h2>Things to ask</h2>
          <ul className="list" style={{ marginTop: 8 }}>
            {PROMPTS.map((p) => (
              <li key={p} className="row between">
                <span className="grow small">“{p}”</span>
                <CopyButton text={p} />
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2>What Claude can do in Nearby</h2>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Tool</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="mono">list_parents</td><td>Finds the parents on your account and their links</td></tr>
              <tr><td className="mono">save_parent</td><td>Creates a care board (and a no-login helper link) or updates a profile</td></tr>
              <tr><td className="mono">add_care_plan</td><td>Saves medicines with times, appointments and tasks extracted from documents</td></tr>
              <tr><td className="mono">update_item</td><td>Reschedules, changes doses, marks done, stops or removes an item</td></tr>
              <tr><td className="mono">get_status</td><td>Reads doses ticked, readings and notes from home, overdue and upcoming items</td></tr>
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
