import Link from "next/link";
import { CalendarDays, House, LogOut, Plug, Settings } from "lucide-react";
import { logout } from "@/app/actions";
import { listParents } from "@/lib/care";
import type { Row } from "@/lib/db";
import ThemeSwitch from "./ThemeSwitch";
import { Avatar, Brand } from "./ui";

type Active = "home" | "calendar" | "connect" | "settings" | `p:${string}`;

export default async function AppShell({
  family,
  active,
  title,
  crumb,
  actions,
  children,
}: {
  family: Row;
  active: Active;
  title?: React.ReactNode;
  crumb?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const parents = await listParents(family.id);
  const nav = [
    { key: "home", href: "/app", label: "Home", icon: <House size={19} /> },
    { key: "calendar", href: "/app/calendar", label: "Calendar", icon: <CalendarDays size={19} /> },
    { key: "connect", href: "/connect", label: "Claude", icon: <Plug size={19} /> },
    { key: "settings", href: "/app/settings", label: "Settings", icon: <Settings size={19} /> },
  ];
  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand href="/app" light />
        {nav.slice(0, 2).map((n) => (
          <Link key={n.key} href={n.href} className={`side-link ${active === n.key ? "active" : ""}`}>
            {n.icon} {n.label}
          </Link>
        ))}
        <div className="side-label">Parents</div>
        {parents.map((p) => (
          <Link key={p.id} href={`/app/p/${p.id}`} className={`side-link ${active === `p:${p.id}` ? "active" : ""}`}>
            <Avatar name={p.relation || p.name} seed={p.id} size="sm" />
            <span className="truncate">{p.relation ? `${p.relation}` : p.name}</span>
          </Link>
        ))}
        {!parents.length && <div className="side-link" style={{ color: "var(--side-muted)", fontWeight: 500 }}>No parents yet</div>}
        <div className="side-label">Workspace</div>
        {nav.slice(2).map((n) => (
          <Link key={n.key} href={n.href} className={`side-link ${active === n.key ? "active" : ""}`}>
            {n.icon} {n.key === "connect" ? "Connect Claude" : n.label}
          </Link>
        ))}
        <div className="side-foot">
          <ThemeSwitch />
          <div className="side-user">
            <Avatar name={family.name} seed={family.id} />
            <div className="grow">
              <div className="name truncate">{family.name}</div>
              <div className="mail truncate">{family.email}</div>
            </div>
            <form action={logout}>
              <button className="btn btn-ghost btn-sm icon-btn" title="Log out" style={{ color: "var(--side-muted)" }}>
                <LogOut />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="only-mobile">
            <Brand href="/app" />
          </span>
          <div className="grow hide-mobile">
            {crumb && <div className="crumb">{crumb}</div>}
            {title && !crumb && <div className="title">{title}</div>}
          </div>
          <div className="grow only-mobile" />
          {actions}
        </header>
        <main className="content">{children}</main>
      </div>

      <nav className="tabbar" aria-label="Main">
        {nav.map((n) => (
          <Link key={n.key} href={n.href} className={`tab ${active === n.key || (n.key === "home" && active.startsWith("p:")) ? "active" : ""}`}>
            {n.icon}
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
