import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { databaseUrl, one } from "./db";

const COOKIE = "nearby_session";

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 32).toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pw, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

function secret(): string {
  return process.env.SESSION_SECRET || createHash("sha256").update(`nearby:${databaseUrl() || "local-dev"}`).digest("hex");
}

function sign(v: string) {
  return createHmac("sha256", secret()).update(v).digest("base64url");
}

export async function startSession(familyId: string) {
  (await cookies()).set(COOKIE, `${familyId}.${sign(familyId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentFamily() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  const id = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const good = Buffer.from(sign(id));
  const got = Buffer.from(sig);
  if (good.length !== got.length || !timingSafeEqual(good, got)) return null;
  return one(`SELECT * FROM families WHERE id=$1`, [id]);
}

export async function requireFamily() {
  const f = await currentFamily();
  if (!f) redirect("/login");
  return f;
}
