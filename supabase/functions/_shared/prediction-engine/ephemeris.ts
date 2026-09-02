// Lightweight sidereal ephemeris utilities reused by the prediction engine.
// Uses the same astronomy-engine version + Lahiri ayanamsa as generate-chart.

import {
  Body,
  EclipticLongitude,
  MakeTime,
  GeoVector,
  Ecliptic,
} from "https://esm.sh/astronomy-engine@2.1.19";

export const SIGNS = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];

export function julianDay(year: number, month: number, day: number, utHour: number): number {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + utHour / 24 + B - 1524.5;
}

export function lahiriAyanamsa(jd: number): number {
  const yearsFrom2000 = (jd - 2451545.0) / 365.25;
  return 23.8531 + 0.013925 * yearsFrom2000;
}

export function meanLunarNode(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000.0;
  return ((omega % 360) + 360) % 360;
}

export const PLANET_BODIES = [
  { name: "Sun", body: Body.Sun },
  { name: "Moon", body: Body.Moon },
  { name: "Mercury", body: Body.Mercury },
  { name: "Venus", body: Body.Venus },
  { name: "Mars", body: Body.Mars },
  { name: "Jupiter", body: Body.Jupiter },
  { name: "Saturn", body: Body.Saturn },
];

export interface SiderealSample {
  planet: string;
  date: string;     // YYYY-MM-DD
  longitude: number; // 0..360 sidereal
  retrograde: boolean;
}

// Sample one date for one planet (sidereal Lahiri).
export function sampleSidereal(planet: string, date: Date): SiderealSample {
  const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
  const jd = julianDay(y, m, d, 12.0);
  const ay = lahiriAyanamsa(jd);
  const t1 = MakeTime(new Date(Date.UTC(y, m - 1, d, 12)));
  const t2 = MakeTime(new Date(Date.UTC(y, m - 1, d + 1, 12)));

  if (planet === "Rahu") {
    const trop = meanLunarNode(jd);
    return { planet, date: date.toISOString().slice(0,10), longitude: ((trop - ay) % 360 + 360) % 360, retrograde: true };
  }
  if (planet === "Ketu") {
    const trop = meanLunarNode(jd);
    return { planet, date: date.toISOString().slice(0,10), longitude: (((trop - ay) % 360 + 360) % 360 + 180) % 360, retrograde: true };
  }
  const meta = PLANET_BODIES.find(p => p.name === planet);
  if (!meta) throw new Error(`unknown planet ${planet}`);

  let trop: number, trop2: number;
  if (planet === "Sun" || planet === "Moon") {
    trop = Ecliptic(GeoVector(meta.body, t1, true)).elon;
    trop2 = Ecliptic(GeoVector(meta.body, t2, true)).elon;
  } else {
    trop = EclipticLongitude(meta.body, t1);
    trop2 = EclipticLongitude(meta.body, t2);
  }
  const sid = ((trop - ay) % 360 + 360) % 360;
  const speed = ((trop2 - trop + 540) % 360) - 180;
  return { planet, date: date.toISOString().slice(0,10), longitude: sid, retrograde: speed < 0 };
}

export function signOf(longitude: number): string {
  return SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)];
}

export function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(((a - b + 540) % 360) - 180);
  return diff;
}
