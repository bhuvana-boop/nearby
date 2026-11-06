import Link from "next/link";
import { headers } from "next/headers";
import { CalendarPlus, LogOut, Palette, Plug, RotateCcw, Shield, Smartphone } from "lucide-react";
import AppShell from "@/components/AppShell";
import CopyButton from "@/components/CopyButton";
import ThemeSwitch from "@/components/ThemeSwitch";
import { Avatar } from "@/components/ui";
import { requireFamily } from "@/lib/auth";
import { baseUrlFrom } from "@/lib/ids";
import { DEMO } from "@/lib/seed";
import { logout, resetDemoAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const fam = await requireFamily();
  const base = baseUrlFrom(await headers());
  const mcpUrl = `${base}/api/mcp/${fam.mcp_key}`;
  const calUrl = `${base}/api/cal/${fam.cal_token}`;
  const isDemo = fam.email === DEMO.email;
  return (
    <AppShell family={fam} active="settings" title="Settings">
      <div className="page-head">
        <div className="grow">
          <h1>Settings</h1>
          <p className="sub">Your family account, links and appearance.</p>
        </div>
      </div>
      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-h">
            <Avatar name={fam.name} seed={fam.id} size="lg" />
            <div className="grow">
              <h2>{fam.name}</h2>
              <div className="muted small">{fam.email}</div>
            </div>
          </div>
          <div className="card-b row between">
            <span className="muted small">Signed in on this device</span>
            <form action={logout}>
              <button className="btn btn-sm"><LogOut /> Log out</button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <span className="ico accent"><Palette /></span>
            <h3>Appearance</h3>
          </div>
          <div className="card-b row between">
            <span className="muted small">Theme</span>
            <ThemeSwitch labels />
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <span className="ico"><Plug /></span>
            <h3>Claude connector</h3>
          </div>
          <div className="card-b stack-sm">
            <div className="linkbox">
              <code>{mcpUrl}</code>
              <CopyButton text={mcpUrl} iconOnly />
            </div>
            <p className="faint tiny row" style={{ gap: 6 }}><Shield size={13} /> Private to your family. Anyone with this link can edit your boards.</p>
            <Link href="/connect" className="linkbtn small">How to connect</Link>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <span className="ico accent"><CalendarPlus /></span>
            <h3>Calendar feed</h3>
          </div>
          <div className="card-b stack-sm">
            <div className="linkbox">
              <code>{calUrl}</code>
              <CopyButton text={calUrl} iconOnly />
            </div>
            <Link href="/app/calendar" className="linkbtn small">Open calendar</Link>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <span className="ico ok"><Smartphone /></span>
            <h3>Install on your phone</h3>
          </div>
          <div className="card-b">
            <p className="muted small">
              Nearby works like an app. Android: Chrome menu → <strong>Add to Home screen</strong>. iPhone: Safari share button → <strong>Add to Home Screen</strong>.
            </p>
          </div>
        </div>

        {isDemo && (
          <div className="card">
            <div className="card-h">
              <span className="ico danger"><RotateCcw /></span>
              <h3>Demo data</h3>
            </div>
            <div className="card-b row between">
              <span className="muted small">Restore the demo family to its starting state.</span>
              <form action={resetDemoAction}>
                <button className="btn btn-sm"><RotateCcw /> Reset demo</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
