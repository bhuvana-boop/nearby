import Link from "next/link";
import { Sparkles } from "lucide-react";

const AV_COLORS = ["#0a6c74", "#c27712", "#c2553a", "#8b4a8c", "#3f5bb5", "#4f7d2c", "#0e7490", "#a33f63"];

export function avatarColor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}

export function initials(name: string) {
  return (
    name
      .replace(/\(.*\)/, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function Avatar({ name, seed, size = "", className = "" }: { name: string; seed?: string; size?: "" | "sm" | "lg" | "xl"; className?: string }) {
  if (name === "Claude") {
    return (
      <span className={`av claude ${size ? `av-${size}` : ""} ${className}`} title="Claude">
        <Sparkles />
      </span>
    );
  }
  return (
    <span className={`av ${size ? `av-${size}` : ""} ${className}`} style={{ background: avatarColor(seed ?? name) }} title={name}>
      {initials(name)}
    </span>
  );
}

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="18" fill="#0a6c74" />
      <path d="M17 42c4-14 26-14 30 0" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="17" cy="42" r="6" fill="#fff" />
      <circle cx="47" cy="42" r="6" fill="#f2a93b" />
      <circle cx="32" cy="22" r="4" fill="#f2a93b" opacity=".9" />
    </svg>
  );
}

export function Brand({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="brand" style={light ? { color: "#fff" } : undefined}>
      <BrandMark /> Nearby
    </Link>
  );
}

export function Ring({ pct, size = 56, stroke = 6, label, tone }: { pct: number | null; size?: number; stroke?: number; label?: string; tone?: "ok" | "warn" | "danger" | "" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  const t = tone ?? (pct === null ? "" : v >= 90 ? "ok" : v >= 75 ? "warn" : "danger");
  return (
    <div className={`ring ${t}`} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ring-val"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * v) / 100}
        />
      </svg>
      <div className="ring-label" style={{ fontSize: size < 50 ? 11 : size > 70 ? 18 : 14 }}>{label ?? (pct === null ? "–" : `${v}%`)}</div>
    </div>
  );
}

export function toneFor(pct: number | null) {
  return pct === null ? "" : pct >= 90 ? "ok" : pct >= 75 ? "warn" : "danger";
}
