// Tiny database layer: Neon Postgres in production, PGlite (embedded Postgres) locally.
// Both speak the same SQL with $1-style parameters, so the rest of the app doesn't care.
import { SCHEMA } from "./schema";
import { seedDemo } from "./seed";

export type Row = Record<string, any>;
type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>;

const g = globalThis as unknown as { __nearbyDb?: Promise<QueryFn> };

export function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

async function connect(): Promise<QueryFn> {
  const url = databaseUrl();
  let q: QueryFn;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    q = async (text, params = []) => (await sql.query(text, params as any[])) as Row[];
  } else {
    if (process.env.VERCEL) {
      throw new Error("DATABASE_URL is not set. Connect a Neon database to this Vercel project.");
    }
    const { PGlite } = await import("@electric-sql/pglite");
    const { mkdirSync } = await import("fs");
    mkdirSync("./.data", { recursive: true });
    const db = new PGlite("./.data/pglite");
    q = async (text, params = []) => (await db.query(text, params as any[])).rows as Row[];
  }
  for (const stmt of SCHEMA) await q(stmt);
  try {
    await seedDemo(q);
  } catch (e) {
    // Another cold start may have seeded at the same moment (unique key clash) - safe to ignore.
    console.warn("Demo seed skipped:", (e as Error).message);
  }
  return q;
}

export async function query(text: string, params: unknown[] = []): Promise<Row[]> {
  if (!g.__nearbyDb) {
    g.__nearbyDb = connect().catch((e) => {
      g.__nearbyDb = undefined;
      throw e;
    });
  }
  const q = await g.__nearbyDb;
  return q(text, params);
}

export async function one(text: string, params: unknown[] = []): Promise<Row | null> {
  const rows = await query(text, params);
  return rows[0] ?? null;
}
