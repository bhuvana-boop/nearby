import { randomBytes } from "crypto";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function rand(n: number): string {
  let s = "";
  for (const b of randomBytes(n)) s += ALPHABET[b % ALPHABET.length];
  return s;
}

export const newId = (prefix: string) => `${prefix}_${rand(6)}`;
export const nowIso = () => new Date().toISOString();

export function baseUrlFrom(h: Headers): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
