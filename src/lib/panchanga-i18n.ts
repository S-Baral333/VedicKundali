import type { TFunction } from "i18next";
import { adStringToBs, BS_MONTHS } from "@/lib/calendar-bs";

/**
 * Localised labels for the almanac values the horoscope engine returns in
 * English (tithi, paksha, nakshatra, deity/symbol, zodiac sign) and for the
 * reading date. English falls back to the engine's own strings, so its output
 * is unchanged; translations live under `pages:panchanga.*`.
 */

const nakKey = (name: string) => name.trim().replace(/\s+/g, "_");

export const pakshaTithiLabel = (t: TFunction, paksha: string, tithi: string) =>
  [paksha && t(`pages:panchanga.paksha.${paksha}`, paksha), tithi && t(`pages:panchanga.tithi.${tithi}`, tithi)]
    .filter(Boolean)
    .join(" ");

export const tithiMeaningLabel = (t: TFunction, tithi: string, fallback: string) =>
  t(`pages:panchanga.tithiMeaning.${tithi}`, fallback);

export const nakshatraLabels = (t: TFunction, nak: { name: string; deity: string; symbol: string }) => {
  const k = nakKey(nak.name);
  return {
    name: t(`pages:panchanga.nak.${k}`, nak.name),
    deity: t(`pages:panchanga.nakDeity.${k}`, nak.deity),
    symbol: t(`pages:panchanga.nakSymbol.${k}`, nak.symbol),
  };
};

/** Graha names: shown wherever a planet is named inside running text. The
 *  chart square keeps its two-letter abbreviations, which are layout-bound. */
export const planetLabel = (t: TFunction, planet: string) =>
  t(`pages:panchanga.planet.${planet}`, planet);

export const signLabel = (t: TFunction, sign: string) => t(`pages:ui.cosmicRibbon.sign${sign}`, sign);

const DEVANAGARI_DIGITS = "०१२३४५६७८९";
export const toDevanagariDigits = (v: number | string) =>
  String(v).replace(/\d/g, (d) => DEVANAGARI_DIGITS[Number(d)]);

// Nepali weekdays spelled out: some engines ship without "ne" locale data and
// would print the English weekday.
const NE_WEEKDAYS = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];

/** Numbers inside localized strings: Nepali reads Devanagari digits. */
export const localNum = (lang: string, v: number | string) =>
  lang === "ne" ? toDevanagariDigits(v) : String(v);


type Period = "daily" | "tomorrow" | "weekly" | "monthly" | "yearly";

const INTL_LOCALE: Record<string, string> = { ne: "ne-NP", hi: "hi-IN", mr: "mr-IN", bn: "bn-IN", ta: "ta-IN", te: "te-IN" };

/** "Tue, 6 Asoj" — a day in a list. Nepali uses the Bikram Sambat date. */
export function formatShortDate(iso: string, lang: string): string {
  const d = new Date(iso.length > 10 ? iso : iso + "T12:00:00");
  if (lang === "ne") {
    const bs = adStringToBs(iso.slice(0, 10));
    const month = bs && BS_MONTHS.find((m) => m.value === bs.month)?.np;
    if (bs && month) return `${NE_WEEKDAYS[d.getDay()]}, ${toDevanagariDigits(bs.day)} ${month}`;
  }
  return d.toLocaleDateString(INTL_LOCALE[lang] ?? "en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "Falgun 2083" — a month-and-year label (prediction windows). */
export function formatMonthYear(iso: string, lang: string): string {
  const d = new Date(iso.length > 10 ? iso : iso + "T12:00:00");
  if (lang === "ne") {
    const bs = adStringToBs(iso.slice(0, 10));
    const month = bs && BS_MONTHS.find((m) => m.value === bs.month)?.np;
    if (bs && month) return `${month} ${toDevanagariDigits(bs.year)}`;
  }
  return d.toLocaleDateString(INTL_LOCALE[lang] ?? "en-US", { month: "short", year: "numeric" });
}

/** "6 Asoj 2083" — a chosen date in a picker. */
export function formatPickerDate(date: Date, lang: string): string {
  if (lang === "ne") {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const bs = adStringToBs(iso);
    const month = bs && BS_MONTHS.find((m) => m.value === bs.month)?.np;
    if (bs && month) return `${toDevanagariDigits(bs.day)} ${month} ${toDevanagariDigits(bs.year)}`;
  }
  return date.toLocaleDateString(INTL_LOCALE[lang] ?? "en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Date line for a reading. English keeps its original en-US format; Nepali day
 * readings show the Bikram Sambat date ("मंगलबार, ६ असोज २०८३"); other
 * languages use their own locale's month and weekday names.
 */
export function formatReadingDate(validDate: string, period: Period, lang: string): string {
  if (!validDate) return "";
  const d = new Date(validDate + "T00:00");
  const locale = INTL_LOCALE[lang] ?? "en-US";

  if (period === "daily" || period === "tomorrow") {
    if (lang === "ne") {
      const bs = adStringToBs(validDate);
      const month = bs && BS_MONTHS.find((m) => m.value === bs.month)?.np;
      if (bs && month) {
        return `${NE_WEEKDAYS[d.getDay()]}, ${toDevanagariDigits(bs.day)} ${month} ${toDevanagariDigits(bs.year)}`;
      }
    }
    return d.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
  }
  if (period === "weekly") {
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    return `${d.toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  if (period === "monthly") return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
  return lang === "ne" ? toDevanagariDigits(d.getFullYear()) : d.getFullYear().toString();
}
