import Link from "next/link";
import Nav from "@/components/Nav";
import { login } from "@/app/actions";
import { DEMO } from "@/lib/seed";

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <>
      <Nav />
      <main className="container" style={{ maxWidth: 440, paddingTop: 48, paddingBottom: 48 }}>
        <div className="card stack">
          <h1>Log in</h1>
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
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }}>Log in</button>
          </form>
          <div className="notice small">
            <strong>Demo account</strong>
            <br />
            Email: <code>{DEMO.email}</code>
            <br />
            Password: <code>{DEMO.password}</code>
            <form action={login} style={{ marginTop: 10 }}>
              <input type="hidden" name="email" value={DEMO.email} />
              <input type="hidden" name="password" value={DEMO.password} />
              <button className="btn btn-sm">Log in as demo family</button>
            </form>
          </div>
          <p className="small muted">
            New here? <Link href="/signup">Create a free family account</Link>
          </p>
        </div>
      </main>
    </>
  );
}
