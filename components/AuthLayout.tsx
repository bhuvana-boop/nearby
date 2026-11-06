import { CalendarPlus, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "./ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <Brand light />
        <div className="hide-sm" style={{ position: "relative", zIndex: 1 }}>
          <h2>Care for your parents, from wherever you are.</h2>
          <ul>
            <li><Sparkles /> Claude reads prescriptions, Nearby keeps the plan</li>
            <li><MessageCircle /> The helper ticks doses from a WhatsApp link</li>
            <li><CalendarPlus /> Every visit lands on every sibling’s calendar</li>
            <li><ShieldCheck /> No AI inside. Your data, your Claude.</li>
          </ul>
        </div>
        <div className="hide-sm" style={{ color: "#7fa1a7", fontSize: 13, position: "relative", zIndex: 1 }}>Care coordination, not medical advice.</div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
