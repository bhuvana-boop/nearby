import Link from "next/link";
import { ArrowRight, LogIn, Sparkles } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { login } from "@/app/actions";
import { DEMO } from "@/lib/seed";

export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <AuthLayout>
      <div className="stack">
        <div>
          <h1>Welcome back</h1>
          <p className="muted" style={{ marginTop: 6 }}>Log in to your family’s care boards.</p>
        </div>
        {sp.error && <div className="error">That email and password don’t match.</div>}
        <form action={login} className="stack-sm">
          <div>
            <label>Email</label>
            <input name="email" type="email" required autoComplete="username" />
          </div>
          <div>
            <label>Password</label>
            <input name="password" type="password" required autoComplete="current-password" />
          </div>
          <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>
            <LogIn /> Log in
          </button>
        </form>
        <div className="card card-pad stack-sm" style={{ background: "var(--accent-soft)", borderColor: "transparent", boxShadow: "none" }}>
          <div className="row" style={{ gap: 8, color: "var(--accent-ink)" }}>
            <Sparkles size={17} /> <strong>Reviewer demo account</strong>
          </div>
          <div className="small" style={{ color: "var(--accent-ink)" }}>
            <code>{DEMO.email}</code> · <code>{DEMO.password}</code>
          </div>
          <form action={login}>
            <input type="hidden" name="email" value={DEMO.email} />
            <input type="hidden" name="password" value={DEMO.password} />
            <button className="btn btn-sm">
              Log in as the Menon family <ArrowRight />
            </button>
          </form>
        </div>
        <p className="small muted">
          New here? <Link href="/signup">Create a free family account</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
