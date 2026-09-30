/**
 * Birth time precision.
 *
 * An exact birth time is the difference between a chart and an estimate, but a
 * great many people simply do not have one — it is not on the certificate, or
 * the certificate is gone, or the family remembers "just after sunrise". The
 * app used to offer a "skip" checkbox and then fail to cast a chart at all,
 * which is the worst of both.
 *
 * Naming a part of the day narrows 24 hours to roughly six. That is enough for
 * some of the chart and nowhere near enough for the rest, and the difference
 * matters enough to be written down rather than glossed:
 *
 *   Moon sign      ~3.3° of drift across a 30° sign — right about nine times in ten
 *   Nakshatra      ~3.3° of 13°20' — usually right, but the pada often is not
 *   Lagna, houses  the ascendant changes sign roughly every two hours — a six
 *                  hour window spans about three of them, so this is a guess
 *   Dasha timing   set by the Moon's exact position within its nakshatra, so a
 *                  quarter-nakshatra of drift can move dasha dates by years
 *   Divisionals    built on the lagna, so no better than the lagna
 *
 * Hence `claimable()`: the prompt layer asks what a reading may state as fact
 * for a given precision, instead of each caller deciding for itself.
 */

export type BirthTimeAccuracy = "exact" | "period" | "unknown";

export interface BirthPeriod {
  /** Stored in profiles.birth_time_period. */
  key: string;
  /** i18n key suffix under pages:ui.birthTime. */
  labelKey: string;
  /** English fallback. */
  label: string;
  /** Traditional name, shown alongside — this is a jyotisha app. */
  sanskrit: string;
  /** Inclusive start and exclusive end, local 24h clock. */
  from: string;
  to: string;
  /**
   * The representative time a chart is cast from. Deliberately the midpoint:
   * it minimises the worst-case error across the window rather than favouring
   * either end.
   */
  midpoint: string;
}

export const BIRTH_PERIODS: BirthPeriod[] = [
  { key: "brahma",    labelKey: "periodBrahma",    label: "Before sunrise", sanskrit: "Brahma Muhurta", from: "04:00", to: "06:00", midpoint: "05:00" },
  { key: "morning",   labelKey: "periodMorning",   label: "Morning",        sanskrit: "Pratah",         from: "06:00", to: "12:00", midpoint: "09:00" },
  { key: "afternoon", labelKey: "periodAfternoon", label: "Afternoon",      sanskrit: "Madhyahna",      from: "12:00", to: "17:00", midpoint: "14:30" },
  { key: "evening",   labelKey: "periodEvening",   label: "Evening",        sanskrit: "Sayam",          from: "17:00", to: "21:00", midpoint: "19:00" },
  { key: "night",     labelKey: "periodNight",     label: "Night",          sanskrit: "Ratri",          from: "21:00", to: "04:00", midpoint: "00:30" },
];

export const getPeriod = (key?: string | null): BirthPeriod | undefined =>
  BIRTH_PERIODS.find((p) => p.key === key);

/** The clock time a chart should actually be cast from. */
export function resolveBirthTime(
  accuracy: BirthTimeAccuracy,
  exactTime?: string | null,
  periodKey?: string | null
): string | null {
  if (accuracy === "exact") return exactTime || null;
  if (accuracy === "period") return getPeriod(periodKey)?.midpoint ?? null;
  return null;
}

/**
 * What a reading may present as established fact at this precision.
 *
 * `false` does not mean "omit" — the engine still computes everything, and a
 * reading may still reason from it. It means "do not cite it as certain, and
 * do not quote a degree for it".
 */
export function claimable(accuracy: BirthTimeAccuracy) {
  const exact = accuracy === "exact";
  return {
    moonSign: true,          // survives a six-hour window
    nakshatra: accuracy !== "unknown",
    nakshatraPada: exact,
    lagna: exact,
    houses: exact,
    dashaSequence: accuracy !== "unknown", // the order holds; the dates do not
    dashaDates: exact,
    divisionalCharts: exact,
    exactDegrees: exact,
  };
}

/** One line telling the reader what their precision costs them. */
export function precisionNote(accuracy: BirthTimeAccuracy): string | null {
  if (accuracy === "exact") return null;
  if (accuracy === "period")
    return "Cast from the middle of the part of day you gave. Your Moon and nakshatra are reliable; your ascendant, houses and dasha dates are estimates until you add an exact time.";
  return "No birth time on file, so this chart is cast from midday. Only your Moon sign is dependable. Add a birth time to get the rest.";
}
