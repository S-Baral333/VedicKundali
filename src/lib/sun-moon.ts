/**
 * Lightweight sunrise/sunset + moonrise/moonset calculator.
 * Pure functions, no dependencies, ±1–2 minute accuracy — meant for
 * ambient header display only (not for muhurta or any prediction engine).
 *
 * - Sunrise/sunset: NOAA solar position algorithm.
 * - Moonrise/moonset: low-precision Meeus formulas + hour-by-hour
 *   altitude scan to find rise/set crossings on a given local day.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/* ════════ SUN ════════ */

function julianDay(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

/** Returns sunrise/sunset Date objects (UTC) for the given UTC date + location, or null at extreme latitudes. */
export function sunTimes(date: Date, lat: number, lng: number): { sunrise: Date | null; sunset: Date | null } {
  // Use day at noon UTC of the local calendar day for stable calc
  const jd = Math.floor(julianDay(date) - 0.5) + 0.5;
  const n = jd - 2451545.0 + 0.0008;
  const Jstar = n - lng / 360;
  const M = (357.5291 + 0.98560028 * Jstar) % 360;
  const Mr = M * RAD;
  const C = 1.9148 * Math.sin(Mr) + 0.0200 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const lambdaR = lambda * RAD;
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lambdaR);
  const decl = Math.asin(Math.sin(lambdaR) * Math.sin(23.44 * RAD));
  const latR = lat * RAD;
  const cosH = (Math.sin(-0.83 * RAD) - Math.sin(latR) * Math.sin(decl)) / (Math.cos(latR) * Math.cos(decl));
  if (cosH < -1 || cosH > 1) return { sunrise: null, sunset: null };
  const H = Math.acos(cosH) * DEG;
  const Jset = Jtransit + H / 360;
  const Jrise = Jtransit - H / 360;
  return {
    sunrise: new Date((Jrise - 2440587.5) * 86400000),
    sunset: new Date((Jset - 2440587.5) * 86400000),
  };
}

/* ════════ MOON ════════ */

/** Low-precision Moon position (Meeus ch.47 simplified). Returns geocentric ra/dec in radians. */
function moonPosition(d: Date): { ra: number; dec: number } {
  const days = julianDay(d) - 2451545.0;
  const L = (218.316 + 13.176396 * days) * RAD;
  const M = (134.963 + 13.064993 * days) * RAD;
  const F = (93.272 + 13.229350 * days) * RAD;
  const lambda = L + 6.289 * RAD * Math.sin(M);
  const beta = 5.128 * RAD * Math.sin(F);
  const e = 23.4397 * RAD;
  const ra = Math.atan2(Math.sin(lambda) * Math.cos(e) - Math.tan(beta) * Math.sin(e), Math.cos(lambda));
  const dec = Math.asin(Math.sin(beta) * Math.cos(e) + Math.cos(beta) * Math.sin(e) * Math.sin(lambda));
  return { ra, dec };
}

/** Greenwich Mean Sidereal Time in radians. */
function gmst(d: Date): number {
  const days = julianDay(d) - 2451545.0;
  return ((280.16 + 360.9856235 * days) % 360) * RAD;
}

/** Moon altitude in radians at the given moment & location. */
function moonAltitude(d: Date, lat: number, lng: number): number {
  const { ra, dec } = moonPosition(d);
  const H = gmst(d) + lng * RAD - ra;
  const latR = lat * RAD;
  return Math.asin(Math.sin(latR) * Math.sin(dec) + Math.cos(latR) * Math.cos(dec) * Math.cos(H));
}

/**
 * Moonrise/moonset for the LOCAL calendar day spanning the given Date.
 * Scans 24 hours starting at local-midnight UTC offset, using hour steps
 * with linear interpolation around the horizon-crossing.
 */
export function moonTimes(
  date: Date,
  lat: number,
  lng: number,
  timeZone: string,
): { moonrise: Date | null; moonset: Date | null } {
  // Find local-midnight in UTC ms by formatting the given date in tz, then parsing back.
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  const offsetMs = tzDate.getTime() - date.getTime();
  const localMidnight = new Date(date);
  localMidnight.setHours(0, 0, 0, 0);
  // Adjust to true local midnight in tz: subtract the diff between system-local and target tz
  const startUtc = new Date(localMidnight.getTime() - offsetMs);

  const HORIZON = 0.133 * RAD; // refraction + parallax adj (~7.7')
  let moonrise: Date | null = null;
  let moonset: Date | null = null;

  let prevAlt = moonAltitude(startUtc, lat, lng) - HORIZON;
  for (let h = 1; h <= 24; h++) {
    const t = new Date(startUtc.getTime() + h * 3600_000);
    const alt = moonAltitude(t, lat, lng) - HORIZON;
    if (prevAlt * alt < 0) {
      // Linear interpolation for crossing minute
      const frac = prevAlt / (prevAlt - alt);
      const cross = new Date(startUtc.getTime() + (h - 1 + frac) * 3600_000);
      if (alt > prevAlt && !moonrise) moonrise = cross;
      else if (alt < prevAlt && !moonset) moonset = cross;
    }
    prevAlt = alt;
    if (moonrise && moonset) break;
  }
  return { moonrise, moonset };
}

/** Format a Date as HH:MM in the supplied IANA timezone (24h). */
export function formatHM(d: Date | null, timeZone: string): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
