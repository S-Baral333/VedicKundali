/**
 * Bikram Sambat (BS) ↔ Gregorian (AD) calendar utilities.
 *
 * The astrology engine ALWAYS receives a Gregorian date — BS is only an input
 * convenience for users in Nepal/Hindu calendar regions. We convert at the
 * form layer; the chart pipeline is unchanged.
 *
 * Underlying lib: `nepali-date-converter` (MIT, deterministic month-length tables).
 */
import NepaliDate from "nepali-date-converter";

export type CalendarSystem = "gregorian" | "bs";

/** BS month names (1 = Baishak … 12 = Chaitra). */
export const BS_MONTHS: { value: number; en: string; np: string }[] = [
  { value: 1, en: "Baishak", np: "बैशाख" },
  { value: 2, en: "Jestha", np: "जेठ" },
  { value: 3, en: "Ashadh", np: "असार" },
  { value: 4, en: "Shrawan", np: "साउन" },
  { value: 5, en: "Bhadra", np: "भदौ" },
  { value: 6, en: "Ashwin", np: "असोज" },
  { value: 7, en: "Kartik", np: "कार्तिक" },
  { value: 8, en: "Mangsir", np: "मंसिर" },
  { value: 9, en: "Poush", np: "पुष" },
  { value: 10, en: "Magh", np: "माघ" },
  { value: 11, en: "Falgun", np: "फागुन" },
  { value: 12, en: "Chaitra", np: "चैत" },
];

/** Supported BS year range (matches nepali-date-converter coverage). */
export const BS_YEAR_MIN = 1970;
export const BS_YEAR_MAX = 2090;

/**
 * Days in a given BS month. BS months vary 29–32 days year to year.
 * We probe by attempting day=32 down to find the actual last valid day.
 */
export function daysInBsMonth(bsYear: number, bsMonth: number): number {
  // nepali-date-converter clamps invalid days; safer to query its internal map.
  // Library exposes getBsMonthInfo via static — fallback to probe loop.
  for (let d = 32; d >= 28; d--) {
    try {
      const nd = new NepaliDate(bsYear, bsMonth - 1, d);
      // If reconstructed date matches input → valid
      if (nd.getYear() === bsYear && nd.getMonth() === bsMonth - 1 && nd.getDate() === d) {
        return d;
      }
    } catch {
      // ignore
    }
  }
  return 30;
}

/**
 * Convert BS (year, month 1-12, day) → Gregorian Date object (local-midnight).
 * Returns null if conversion fails.
 */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date | null {
  try {
    const nd = new NepaliDate(bsYear, bsMonth - 1, bsDay);
    return nd.toJsDate();
  } catch {
    return null;
  }
}

/** Convert BS triplet → Gregorian "YYYY-MM-DD" string for date inputs / DB. */
export function bsToAdString(bsYear: number, bsMonth: number, bsDay: number): string | null {
  const d = bsToAd(bsYear, bsMonth, bsDay);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Convert Gregorian "YYYY-MM-DD" → BS triplet. */
export function adStringToBs(adString: string): { year: number; month: number; day: number } | null {
  try {
    const [y, m, d] = adString.split("-").map(Number);
    if (!y || !m || !d) return null;
    const nd = new NepaliDate(new Date(y, m - 1, d));
    return { year: nd.getYear(), month: nd.getMonth() + 1, day: nd.getDate() };
  } catch {
    return null;
  }
}

/** Format BS triplet → "15 Baishak 2054 BS" (English). */
export function formatBsDate(bsYear: number, bsMonth: number, bsDay: number): string {
  const month = BS_MONTHS.find(m => m.value === bsMonth);
  return `${bsDay} ${month?.en ?? ""} ${bsYear} BS`;
}

/** Format Gregorian "YYYY-MM-DD" → "28 April 1997 AD" for the confirmation hint. */
export function formatAdDate(adString: string): string {
  const [y, m, d] = adString.split("-").map(Number);
  if (!y || !m || !d) return adString;
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${d} ${monthNames[m - 1]} ${y} AD`;
}

/** Parse stored bs_date "YYYY-MM-DD" (BS) → triplet. */
export function parseBsDateString(bsDate: string): { year: number; month: number; day: number } | null {
  const parts = bsDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}

/** Build a "YYYY-MM-DD" BS string from triplet for storage. */
export function buildBsDateString(bsYear: number, bsMonth: number, bsDay: number): string {
  return `${bsYear}-${String(bsMonth).padStart(2, "0")}-${String(bsDay).padStart(2, "0")}`;
}
