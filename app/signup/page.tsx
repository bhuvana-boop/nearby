import Link from "next/link";
import { UserPlus } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { signup } from "@/app/actions";

export const metadata = { title: "Start free" };

export default async function Signup({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <AuthLayout>
      <div className="stack">
        <div>
          <h1>Start free</h1>
          <p className="muted" style={{ marginTop: 6 }}>One account for your whole family. You’ll get your own private Claude connector link.</p>
        </div>
        {sp.error === "exists" && (
          <div className="error">
            An account with that email already exists. <Link href="/login">Log in</Link>
          </div>
        )}
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
          <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>
            <UserPlus /> Create account
          </button>
        </form>
        <p className="small muted">
          Already have one? <Link href="/login">Log in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
