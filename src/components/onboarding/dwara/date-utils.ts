import { INTL_LOCALE } from "@/lib/panchanga-i18n";

export interface YMD {
  y: number;
  /** 1–12 */
  m: number;
  d: number;
}

/** How far back the year wheel goes. */
export const YEAR_SPAN = 120;

const pad = (n: number) => String(n).padStart(2, "0");

export const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

/** Last selectable month of a year — you cannot have been born next month. */
export function maxMonth(y: number, today = new Date()) {
  return y === today.getFullYear() ? today.getMonth() + 1 : 12;
}

/** Last selectable day of a month, capped at today. */
export function maxDay(y: number, m: number, today = new Date()) {
  const dim = daysInMonth(y, m);
  return y === today.getFullYear() && m === today.getMonth() + 1 ? Math.min(dim, today.getDate()) : dim;
}

/** Pull a date back into range after one wheel moved (31 Jan → Feb, a future month…). */
export function clampYMD({ y, m, d }: YMD, today = new Date()): YMD {
  const month = Math.min(m, maxMonth(y, today));
  return { y, m: month, d: Math.min(d, maxDay(y, month, today)) };
}

export const toISO = ({ y, m, d }: YMD) => `${y}-${pad(m)}-${pad(d)}`;

export function parseISO(iso: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

// Some engines ship without "ne" locale data and would print English months.
const NE_MONTHS = [
  "जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन",
  "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर",
];

/** Twelve month names in the reader's own language. */
export function monthNames(lang: string): string[] {
  if (lang === "ne") return NE_MONTHS;
  try {
    const fmt = new Intl.DateTimeFormat(INTL_LOCALE[lang] ?? "en-US", { month: "long" });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2000, i, 1)));
  } catch {
    return Array.from({ length: 12 }, (_, i) =>
      new Date(2000, i, 1).toLocaleString("en-US", { month: "long" })
    );
  }
}

/** Where the sun sat on the sign wheel at `HH:MM` — midnight at the bottom, noon at the top. */
export function timeToAngle(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return (minutes / 1440) * Math.PI * 2 + Math.PI / 2;
}

/** The sign wheel turns a full revolution over the year, so each date aligns it differently. */
export function dateToAngle({ y, m, d }: YMD): number {
  const start = Date.UTC(y, 0, 1);
  const day = (Date.UTC(y, m - 1, d) - start) / 86400000;
  const length = daysInMonth(y, 2) === 29 ? 366 : 365;
  return (day / length) * Math.PI * 2;
}
