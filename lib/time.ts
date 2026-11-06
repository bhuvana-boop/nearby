// Timezone helpers with no dependencies. Each parent has their own timezone (default Asia/Kolkata).
export const DEFAULT_TZ = "Asia/Kolkata";

export function safeTz(tz?: string | null): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

export function localParts(tz: string, d: Date = new Date()) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTz(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(d)) p[x.type] = x.value;
  const hour = p.hour === "24" ? "00" : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function isDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

export function isTime(s: unknown): s is string {
  return typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/** Offset (ms) of tz from UTC at a given instant. */
function tzOffset(tz: string, at: Date): number {
  const p = localParts(tz, at);
  const [y, m, d] = p.date.split("-").map(Number);
  const [hh, mm] = p.time.split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  return asUtc - Math.floor(at.getTime() / 60000) * 60000;
}

/** Convert a local date + time in tz to a UTC Date. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off = tzOffset(tz, new Date(guess));
  return new Date(guess - off);
}

const WORDS: Record<string, string> = {
  morning: "08:00",
  breakfast: "08:00",
  "before breakfast": "07:30",
  "after breakfast": "08:30",
  noon: "13:00",
  afternoon: "13:00",
  lunch: "13:00",
  "after lunch": "13:30",
  evening: "18:00",
  dinner: "20:00",
  "after dinner": "20:30",
  night: "21:00",
  bedtime: "22:00",
  "at bedtime": "22:00",
};

/** Accepts ["08:00","8 pm","night"], "1-0-1", "8am, 8pm" etc. Returns sorted HH:MM list. */
export function normalizeTimes(input: unknown): { times: string[]; unclear: string[] } {
  const unclear: string[] = [];
  const out = new Set<string>();
  let parts: string[] = [];
  if (Array.isArray(input)) parts = input.map(String);
  else if (typeof input === "string") parts = input.split(/[,;/]|\band\b/);

  for (const raw of parts) {
    const s = raw.trim().toLowerCase().replace(/[‐-―−]/g, "-");
    if (!s) continue;
    // Indian prescription notation: 1-0-1 (morning-afternoon-night) or 1-1-1-1
    const pattern = s.match(/^([0-9½.]+)\s*-\s*([0-9½.]+)\s*-\s*([0-9½.]+)(?:\s*-\s*([0-9½.]+))?$/);
    if (pattern) {
      const slots = pattern[4] !== undefined ? ["08:00", "13:00", "18:00", "22:00"] : ["08:00", "13:00", "21:00"];
      pattern.slice(1, pattern[4] !== undefined ? 5 : 4).forEach((v, i) => {
        if (v && v !== "0") out.add(slots[i]);
      });
      continue;
    }
    if (WORDS[s]) {
      out.add(WORDS[s]);
      continue;
    }
    const m = s.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/);
    if (m) {
      let h = Number(m[1]);
      const min = Number(m[2] ?? 0);
      const ap = m[3]?.replace(/\./g, "");
      if (ap === "pm" && h < 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
      if (h <= 23 && min <= 59) {
        out.add(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
        continue;
      }
    }
    unclear.push(raw.trim());
  }
  return { times: [...out].sort(), unclear };
}

export function fmtTime(t?: string | null): string {
  if (!t || !isTime(t)) return t ?? "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

export function fmtDate(d?: string | null, opts: { weekday?: boolean; year?: boolean } = { weekday: true }): string {
  if (!d || !isDate(d)) return d ?? "";
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  return dt.toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: opts.weekday === false ? undefined : "short",
    day: "numeric",
    month: "short",
    year: opts.year ? "numeric" : undefined,
  });
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

export function relDay(date: string, today: string): string {
  const n = daysBetween(today, date);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 1) return `in ${n} days`;
  return `${-n} days ago`;
}

/** "5 Nov, 7:40 PM" for an ISO timestamp shown in tz. */
export function fmtStamp(iso: string, tz: string): string {
  const p = localParts(tz, new Date(iso));
  return `${fmtDate(p.date, { weekday: false })}, ${fmtTime(p.time)}`;
}
