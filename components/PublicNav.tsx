import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Row } from "@/lib/db";
import { Brand } from "./ui";

export default function PublicNav({ family }: { family?: Row | null }) {
  return (
    <nav className="pnav">
      <div className="in">
        <Brand light />
        <div className="links">
          <Link href="/#how" className="hide-sm">How it works</Link>
          <Link href="/#pricing" className="hide-sm">Pricing</Link>
          <Link href="/connect" className="hide-sm">Connect Claude</Link>
          {family ? (
            <Link href="/app" className="btn btn-sm btn-accent">Open app <ArrowRight /></Link>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="btn btn-sm btn-accent">Start free</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
