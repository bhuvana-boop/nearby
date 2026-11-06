import Link from "next/link";
import { logout } from "@/app/actions";

export function Logo() {
  return (
    <Link href="/" className="logo">
      <span className="logo-mark">◐</span> Nearby
    </Link>
  );
}

export default function Nav({ family, active }: { family?: Record<string, any> | null; active?: string }) {
  return (
    <nav className="nav">
      <div className="container">
        <Logo />
        <div className="nav-links">
          {family ? (
            <>
              <Link href="/app" className={active === "app" ? "active" : ""}>
                Parents
              </Link>
              <Link href="/connect" className={active === "connect" ? "active" : ""}>
                Connect Claude
              </Link>
              <span className="faint hide-sm">{family.name}</span>
              <form action={logout} className="inline">
                <button className="btn btn-sm">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/#how" className="hide-sm">How it works</Link>
              <Link href="/connect" className="hide-sm">Connect Claude</Link>
              <Link href="/#pricing" className="hide-sm">Pricing</Link>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">Start free</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
