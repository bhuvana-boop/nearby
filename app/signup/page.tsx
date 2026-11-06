import Link from "next/link";
import Nav from "@/components/Nav";
import { signup } from "@/app/actions";

export default async function Signup({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <>
      <Nav />
      <main className="container" style={{ maxWidth: 440, paddingTop: 48, paddingBottom: 48 }}>
        <div className="card stack">
          <div>
            <h1>Start free</h1>
            <p className="muted" style={{ marginTop: 6 }}>One account for your family. You’ll get your own private Claude connector link.</p>
          </div>
          {sp.error === "exists" && <div className="error">An account with that email already exists. <Link href="/login">Log in</Link></div>}
          {sp.error === "invalid" && <div className="error">Please enter a family name, a valid email and a password of 6+ characters.</div>}
          <form action={signup} className="stack-sm">
            <div>
              <label>Family name</label>
              <input name="name" required placeholder="e.g. Menon family" />
            </div>
            <div>
              <label>Your email</label>
              <input name="email" type="email" required autoComplete="username" />
            </div>
            <div>
              <label>Password</label>
              <input name="password" type="password" required minLength={6} autoComplete="new-password" />
            </div>
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }}>Create account</button>
          </form>
          <p className="small muted">
            Already have one? <Link href="/login">Log in</Link>
          </p>
        </div>
      </main>
    </>
  );
}
