import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Body, EclipticLongitude, MakeTime, GeoVector, Ecliptic } from "https://esm.sh/astronomy-engine@2.1.19";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Panchanga (Tithi, Nakshatra, Yoga, Karana, Masa, Vara) ───
const PANCH_TITHI_NAMES = [
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami",
  "Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima",
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami",
  "Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Amavasya",
];
const PANCH_NAK_NAMES = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha",
  "Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
  "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati",
];
const PANCH_YOGA_NAMES = [
  "Vishkambha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shula",
  "Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyan",
  "Parigha","Shiva","Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti",
];
const PANCH_MOVABLE_KARANAS = ["Bava","Balava","Kaulava","Taitila","Garaja","Vanija","Vishti"];
const PANCH_SIGN_TO_MASA = [
  "Vaishakha","Jyaishtha","Ashadha","Shravana","Bhadrapada","Ashwina",
  "Kartika","Margashirsha","Pausha","Magha","Phalguna","Chaitra",
];
const PANCH_VARA_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function computePanchanga(sunLongitude: number, moonLongitude: number, gregorianDate: string) {
  const mod360 = (x: number) => ((x % 360) + 360) % 360;
  const phase = mod360(moonLongitude - sunLongitude);
  const tithiIdx = Math.floor(phase / 12); // 0..29
  const paksha = tithiIdx < 15 ? "Shukla" : "Krishna";
  const nakSpan = 360 / 27;
  const nakIdx = Math.floor(mod360(moonLongitude) / nakSpan);
  const withinNak = mod360(moonLongitude) - nakIdx * nakSpan;
  const pada = Math.min(4, Math.floor(withinNak / (nakSpan / 4)) + 1);
  const yogaIdx = Math.floor(mod360(sunLongitude + moonLongitude) / nakSpan);
  const karanaIdx = Math.floor(phase / 6); // 0..59
  let karanaName: string;
  if (karanaIdx === 0) karanaName = "Kimstughna";
  else if (karanaIdx === 57) karanaName = "Shakuni";
  else if (karanaIdx === 58) karanaName = "Chatushpada";
  else if (karanaIdx === 59) karanaName = "Naga";
  else karanaName = PANCH_MOVABLE_KARANAS[(karanaIdx - 1) % 7];
  const sunSignIdx = Math.floor(mod360(sunLongitude) / 30);
  const masaName = PANCH_SIGN_TO_MASA[sunSignIdx];
  const d = new Date(`${gregorianDate}T00:00:00Z`);
  const varaName = PANCH_VARA_NAMES[d.getUTCDay()];
  return {
    tithi: { number: tithiIdx + 1, name: PANCH_TITHI_NAMES[tithiIdx], paksha },
    nakshatra: { number: nakIdx + 1, name: PANCH_NAK_NAMES[nakIdx], pada },
    yoga: { number: yogaIdx + 1, name: PANCH_YOGA_NAMES[yogaIdx] },
    karana: { number: karanaIdx + 1, name: karanaName },
    masa: { name: masaName },
    vara: { name: varaName },
  };
}

// ─── Lahiri Ayanamsa (improved precision) ───
function lahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0; // Julian centuries from J2000.0
  // Lahiri ayanamsa: based on IAU precession with Lahiri epoch
  // At J2000.0 (2000-01-01): ayanamsa ≈ 23.8531°
  // Precession rate: ~50.2388475″/year = 0.01396663°/year
  return 23.8531 + 0.01396663 * T * 100 + 0.000308 * T * T;
}

// ─── Julian Day ───
function julianDay(year: number, month: number, day: number, utHour: number): number {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + utHour / 24 + B - 1524.5;
}

// ─── Mean Lunar Node (Rahu) ───
function meanLunarNode(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000.0;
  return ((omega % 360) + 360) % 360;
}

// ─── Planet IDs (Swiss Ephemeris standard) ───
const PLANET_IDS: Record<string, number> = {
  Sun: 0,      // SE_SUN
  Moon: 1,     // SE_MOON
  Mercury: 2,  // SE_MERCURY
  Venus: 3,    // SE_VENUS
  Mars: 4,     // SE_MARS
  Jupiter: 5,  // SE_JUPITER
  Saturn: 6,   // SE_SATURN
};
const SE_TRUE_NODE = 11; // Rahu (True Node)

// ─── Deterministic Vedic Astrology Tables ───

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

const SIGN_LORD: Record<string, string> = {
  Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon", Leo:"Sun",
  Virgo:"Mercury", Libra:"Venus", Scorpio:"Mars", Sagittarius:"Jupiter",
  Capricorn:"Saturn", Aquarius:"Saturn", Pisces:"Jupiter",
};

const EXALTATION: Record<string, string> = {
  Sun:"Aries", Moon:"Taurus", Mars:"Capricorn", Mercury:"Virgo",
  Jupiter:"Cancer", Venus:"Pisces", Saturn:"Libra", Rahu:"Taurus", Ketu:"Scorpio",
};

const DEBILITATION: Record<string, string> = {
  Sun:"Libra", Moon:"Scorpio", Mars:"Cancer", Mercury:"Pisces",
  Jupiter:"Capricorn", Venus:"Virgo", Saturn:"Aries", Rahu:"Scorpio", Ketu:"Taurus",
};

const OWN_SIGNS: Record<string, string[]> = {
  Sun:["Leo"], Moon:["Cancer"], Mars:["Aries","Scorpio"],
  Mercury:["Gemini","Virgo"], Jupiter:["Sagittarius","Pisces"],
  Venus:["Taurus","Libra"], Saturn:["Capricorn","Aquarius"],
  Rahu:["Aquarius"], Ketu:["Scorpio"],
};

const MOOLATRIKONA: Record<string, string> = {
  Sun:"Leo", Moon:"Taurus", Mars:"Aries", Mercury:"Virgo",
  Jupiter:"Sagittarius", Venus:"Libra", Saturn:"Aquarius",
};

const FRIENDSHIP: Record<string, { friends: string[]; enemies: string[]; neutral: string[] }> = {
  Sun:    { friends:["Moon","Mars","Jupiter"], enemies:["Venus","Saturn"], neutral:["Mercury"] },
  Moon:   { friends:["Sun","Mercury"], enemies:[], neutral:["Mars","Jupiter","Venus","Saturn"] },
  Mars:   { friends:["Sun","Moon","Jupiter"], enemies:["Mercury"], neutral:["Venus","Saturn"] },
  Mercury:{ friends:["Sun","Venus"], enemies:["Moon"], neutral:["Mars","Jupiter","Saturn"] },
  Jupiter:{ friends:["Sun","Moon","Mars"], enemies:["Mercury","Venus"], neutral:["Saturn"] },
  Venus:  { friends:["Mercury","Saturn"], enemies:["Sun","Moon"], neutral:["Mars","Jupiter"] },
  Saturn: { friends:["Mercury","Venus"], enemies:["Sun","Moon","Mars"], neutral:["Jupiter"] },
};

const NAISARGIKA_BALA: Record<string, number> = {
  Sun:15, Moon:13, Venus:12, Jupiter:11, Mercury:10, Mars:8, Saturn:5, Rahu:4, Ketu:4,
};

const DIG_BALA_HOUSE: Record<string, number> = {
  Jupiter:1, Mercury:1, Sun:10, Mars:10, Saturn:7, Moon:4, Venus:4,
};

// ─── Combustion Orbs (degrees from Sun) — direct vs retrograde ───
const COMBUSTION_ORBS: Record<string, number> = {
  Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15,
};
const COMBUSTION_ORBS_RETRO: Record<string, number> = {
  Mercury: 12, Venus: 8,
};

// ─── Parashari Special Aspects (offsets in houses, 7th universal) ───
const SPECIAL_ASPECT_OFFSETS: Record<string, number[]> = {
  Mars:    [4, 7, 8],
  Jupiter: [5, 7, 9],
  Saturn:  [3, 7, 10],
  Rahu:    [5, 7, 9],
  Ketu:    [5, 7, 9],
};

function parashariAspects(planet: string, house: number): number[] {
  const offsets = SPECIAL_ASPECT_OFFSETS[planet] ?? [7];
  const set = new Set<number>();
  for (const off of offsets) set.add(((house - 1 + off - 1) % 12) + 1);
  return [...set].sort((a, b) => a - b);
}

// ─── Degree → DMS string  e.g. 9.1394 → "9°08'22\"" ───
function toDMS(deg: number): string {
  const d = Math.floor(deg);
  const mFloat = (deg - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}

// ─── Years → "Xy Xm Xd" ───
function yearsToDHMS(years: number): string {
  const totalDays = years * 365.25;
  const y = Math.floor(totalDays / 365.25);
  const rem = totalDays - y * 365.25;
  const m = Math.floor(rem / 30.4375);
  const d = Math.floor(rem - m * 30.4375);
  return `${y}y ${m}m ${d}d`;
}

// ─── Citation-grade ASCII chart summary for LLM prompts ───
function buildLlmSummary(chart: any): string {
  const lines: string[] = [];
  const a = (s: string) => lines.push(s);
  a("════════════════════════════════════════════════════════════");
  a("CHART DATA — Sidereal (Lahiri ayanamsa). Cite these exact values.");
  a("════════════════════════════════════════════════════════════");
  a(`LAGNA: ${chart.ascendant?.sign} ${chart.ascendant?.dms || ""} — ${chart.ascendant?.nakshatra || ""} Pd-${chart.ascendant?.nakshatra_pada || ""}`);
  a("");
  a("GRAHA POSITIONS  [H=house  R=retro  C=combust  Ex=exalted  De=debilitated]");
  const order = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
  for (const name of order) {
    const p = (chart.planets || []).find((pl: any) => pl.name === name);
    if (!p) continue;
    const flags: string[] = [];
    if (p.is_retrograde) flags.push("R");
    if (p.is_combust) flags.push("C");
    if (p.dignity === "exalted") flags.push("Ex");
    if (p.dignity === "debilitated") flags.push("De");
    if (p.dignity === "own_sign" || p.dignity === "moolatrikona") flags.push("Own");
    if (p.is_vargottama) flags.push("Vgm");
    const strength = p.strength != null ? ` ${p.strength}/100` : "";
    const aspects = (p.aspects || []).length ? ` aspects→H${(p.aspects).join(",H")}` : "";
    a(`  ${p.name.padEnd(8)} ${String(p.sign).padEnd(11)} ${p.dms || ""}  ${p.nakshatra || ""}-${p.nakshatra_pada || ""}  H${p.house}${strength}  ${flags.join(" ")}${aspects}`);
  }
  a("");
  if (chart.dasha) {
    a("VIMSHOTTARI DASHA");
    if (chart.dasha.birth_dasha_lord) {
      a(`  Birth: ${chart.dasha.birth_dasha_lord} (balance ${chart.dasha.balance_str || "?"})`);
    }
    a(`  Maha:  ${chart.dasha.maha_dasha || "?"}  → ${chart.dasha.maha_dasha_end || ""}`);
    a(`  Antar: ${chart.dasha.antar_dasha || "?"} → ${chart.dasha.antar_dasha_end || ""}`);
    a(`  Praty: ${chart.dasha.pratyantar_dasha || "?"} → ${chart.dasha.pratyantar_dasha_end || ""}`);
  }
  if (chart.active_yogas?.length) {
    a("");
    a("ACTIVE YOGAS");
    for (const y of chart.active_yogas.slice(0, 12)) {
      a(`  • ${y.name || y}${y.planets ? ` (${y.planets.join(", ")})` : ""}${y.strength ? ` [${y.strength}]` : ""}`);
    }
  }
  if (chart.ashtakavarga?.sav) {
    a("");
    a("ASHTAKAVARGA SAV (per house, /56 max)");
    a("  " + chart.ashtakavarga.sav.map((v: number, i: number) => `H${i+1}:${v}`).join("  "));
  }
  if (chart.life_scores) {
    a("");
    a("LIFE-AREA SCORES");
    a("  " + Object.entries(chart.life_scores).map(([k, v]) => `${k}:${v}`).join("  "));
  }
  if (chart.combustion?.length) {
    a("");
    a("COMBUSTION: " + chart.combustion.map((c: any) => `${c.name}@${c.angularDist}°`).join(", "));
  }
  return lines.join("\n");
}

// ─── Dignity Calculator ───

function determineDignity(planet: string, sign: string): string {
  if (EXALTATION[planet] === sign) return "exalted";
  if (DEBILITATION[planet] === sign) return "debilitated";
  if (MOOLATRIKONA[planet] === sign) return "moolatrikona";
  if (OWN_SIGNS[planet]?.includes(sign)) return "own_sign";
  if (!FRIENDSHIP[planet]) return "neutral";
  const signLord = SIGN_LORD[sign];
  if (!signLord) return "neutral";
  if (FRIENDSHIP[planet].friends.includes(signLord)) return "friendly";
  if (FRIENDSHIP[planet].enemies.includes(signLord)) return "enemy";
  return "neutral";
}

// ─── Nakshatra Lookup ───

const NAKSHATRA_DATA = [
  { name:"Ashwini", ruler:"Ketu", start:0, end:13.333 },
  { name:"Bharani", ruler:"Venus", start:13.333, end:26.667 },
  { name:"Krittika", ruler:"Sun", start:26.667, end:40 },
  { name:"Rohini", ruler:"Moon", start:40, end:53.333 },
  { name:"Mrigashira", ruler:"Mars", start:53.333, end:66.667 },
  { name:"Ardra", ruler:"Rahu", start:66.667, end:80 },
  { name:"Punarvasu", ruler:"Jupiter", start:80, end:93.333 },
  { name:"Pushya", ruler:"Saturn", start:93.333, end:106.667 },
  { name:"Ashlesha", ruler:"Mercury", start:106.667, end:120 },
  { name:"Magha", ruler:"Ketu", start:120, end:133.333 },
  { name:"Purva Phalguni", ruler:"Venus", start:133.333, end:146.667 },
  { name:"Uttara Phalguni", ruler:"Sun", start:146.667, end:160 },
  { name:"Hasta", ruler:"Moon", start:160, end:173.333 },
  { name:"Chitra", ruler:"Mars", start:173.333, end:186.667 },
  { name:"Swati", ruler:"Rahu", start:186.667, end:200 },
  { name:"Vishakha", ruler:"Jupiter", start:200, end:213.333 },
  { name:"Anuradha", ruler:"Saturn", start:213.333, end:226.667 },
  { name:"Jyeshtha", ruler:"Mercury", start:226.667, end:240 },
  { name:"Mula", ruler:"Ketu", start:240, end:253.333 },
  { name:"Purva Ashadha", ruler:"Venus", start:253.333, end:266.667 },
  { name:"Uttara Ashadha", ruler:"Sun", start:266.667, end:280 },
  { name:"Shravana", ruler:"Moon", start:280, end:293.333 },
  { name:"Dhanishta", ruler:"Mars", start:293.333, end:306.667 },
  { name:"Shatabhisha", ruler:"Rahu", start:306.667, end:320 },
  { name:"Purva Bhadrapada", ruler:"Jupiter", start:320, end:333.333 },
  { name:"Uttara Bhadrapada", ruler:"Saturn", start:333.333, end:346.667 },
  { name:"Revati", ruler:"Mercury", start:346.667, end:360 },
];

function getNakshatraFromDegree(totalDegree: number) {
  const deg = ((totalDegree % 360) + 360) % 360;
  const nak = NAKSHATRA_DATA.find(n => deg >= n.start && deg < n.end) || NAKSHATRA_DATA[0];
  const padaSize = (nak.end - nak.start) / 4;
  const pada = Math.min(4, Math.floor((deg - nak.start) / padaSize) + 1);
  return { name: nak.name, pada, ruler: nak.ruler, degree: deg };
}

function signToIndex(sign: string): number {
  return SIGNS.indexOf(sign);
}

function signDegreeToTotal(sign: string, degree: number): number {
  return signToIndex(sign) * 30 + (degree || 0);
}

// ─── Varga Chart Calculators ───

// D9 — Navamsa
function computeNavamsaSign(sign: string, degree: number): string {
  const navamsaPart = Math.floor(degree / (30 / 9));
  const signIdx = SIGNS.indexOf(sign);
  const signElement = signIdx % 4;
  const startSigns = [0, 9, 6, 3]; // Aries, Cap, Libra, Cancer
  const navamsaIndex = (startSigns[signElement] + navamsaPart) % 12;
  return SIGNS[navamsaIndex];
}

// D7 — Saptamsha (Children)
function computeD7Sign(sign: string, degree: number): string {
  const part = Math.floor(degree / (30 / 7));
  const signIdx = SIGNS.indexOf(sign);
  const isOdd = signIdx % 2 === 0; // 0-indexed: Aries=0 (odd sign)
  const start = isOdd ? signIdx : (signIdx + 6) % 12;
  return SIGNS[(start + part) % 12];
}

// D10 — Dashamsha (Career)
function computeD10Sign(sign: string, degree: number): string {
  const part = Math.floor(degree / 3);
  const signIdx = SIGNS.indexOf(sign);
  const isOdd = signIdx % 2 === 0;
  const start = isOdd ? signIdx : (signIdx + 9) % 12;
  return SIGNS[(start + part) % 12];
}

// D12 — Dwadashamsha (Parents)
function computeD12Sign(sign: string, degree: number): string {
  const part = Math.floor(degree / 2.5);
  const signIdx = SIGNS.indexOf(sign);
  return SIGNS[(signIdx + part) % 12];
}

// D2 — Hora (Wealth). 0–15° → odd-sign Hora (Sun=Leo), 15–30° → even-sign (Moon=Cancer); reversed for even signs.
function computeD2Sign(sign: string, degree: number): string {
  const signIdx = SIGNS.indexOf(sign);
  const isOdd = signIdx % 2 === 0; // 0-indexed: Aries=0 is odd
  const firstHalf = degree < 15;
  // Odd signs: 1st Hora = Leo (Sun), 2nd = Cancer (Moon).
  // Even signs: reversed — 1st = Cancer, 2nd = Leo.
  if (isOdd) return firstHalf ? "Leo" : "Cancer";
  return firstHalf ? "Cancer" : "Leo";
}

// D3 — Drekkana (Siblings). 10° each: 1st = same sign, 2nd = 5th from it, 3rd = 9th from it.
function computeD3Sign(sign: string, degree: number): string {
  const part = Math.floor(degree / 10);
  const signIdx = SIGNS.indexOf(sign);
  const offsets = [0, 4, 8];
  return SIGNS[(signIdx + offsets[part]) % 12];
}

// D4 — Chaturthamsha (Fortune/Property). 7°30' each starting at sign, then 4th, 7th, 10th from it.
function computeD4Sign(sign: string, degree: number): string {
  const part = Math.floor(degree / 7.5);
  const signIdx = SIGNS.indexOf(sign);
  const offsets = [0, 3, 6, 9];
  return SIGNS[(signIdx + offsets[part]) % 12];
}

// D16 — Shodashamsha (Vehicles/Comforts). 1°52'30" each.
// Movable signs start from Aries, fixed from Leo, dual from Sagittarius.
function computeD16Sign(sign: string, degree: number): string {
  const part = Math.floor(degree / 1.875);
  const signIdx = SIGNS.indexOf(sign);
  const mod = signIdx % 3; // 0=movable, 1=fixed, 2=dual
  const start = mod === 0 ? 0 : mod === 1 ? 4 : 8;
  return SIGNS[(start + part) % 12];
}

// D20 — Vimshamsha (Spiritual Progress). 1°30' each.
// Movable: from Aries; Fixed: from Sagittarius; Dual: from Leo.
function computeD20Sign(sign: string, degree: number): string {
  const part = Math.floor(degree / 1.5);
  const signIdx = SIGNS.indexOf(sign);
  const mod = signIdx % 3;
  const start = mod === 0 ? 0 : mod === 1 ? 8 : 4;
  return SIGNS[(start + part) % 12];
}

// D24 — Chaturvimshamsha (Education). 1°15' each.
// Odd signs start from Leo, even signs from Cancer.
function computeD24Sign(sign: string, degree: number): string {
  const part = Math.floor(degree / 1.25);
  const signIdx = SIGNS.indexOf(sign);
  const isOdd = signIdx % 2 === 0;
  const start = isOdd ? 4 : 3; // Leo=4, Cancer=3
  return SIGNS[(start + part) % 12];
}

// D27 — Bhamsha / Saptavimshamsha (Strengths & Weaknesses). ~1°6'40" each.
// Fire signs from Aries, Earth from Capricorn, Air from Libra, Water from Cancer.
function computeD27Sign(sign: string, degree: number): string {
  const part = Math.floor(degree / (30 / 27));
  const signIdx = SIGNS.indexOf(sign);
  const elem = signIdx % 4; // 0=fire,1=earth,2=air,3=water
  const startSigns = [0, 9, 6, 3];
  return SIGNS[(startSigns[elem] + part) % 12];
}

// D30 — Trimshamsha (Misfortunes & Character). Unequal divisions; only odd-sign rulers used.
// Odd signs: Mars(0-5°), Saturn(5-10°), Jupiter(10-18°), Mercury(18-25°), Venus(25-30°).
// Even signs: Venus, Mercury, Jupiter, Saturn, Mars (reversed lord, but sign stays same lord-ruled).
function computeD30Sign(sign: string, degree: number): string {
  const signIdx = SIGNS.indexOf(sign);
  const isOdd = signIdx % 2 === 0;
  // Mapped trimshamsa signs (lord's own sign chosen): Mars=Aries, Saturn=Aquarius,
  // Jupiter=Sagittarius, Mercury=Gemini, Venus=Libra (or Taurus for even).
  if (isOdd) {
    if (degree < 5) return "Aries";        // Mars
    if (degree < 10) return "Aquarius";    // Saturn
    if (degree < 18) return "Sagittarius"; // Jupiter
    if (degree < 25) return "Gemini";      // Mercury
    return "Libra";                         // Venus
  } else {
    if (degree < 5) return "Taurus";       // Venus
    if (degree < 12) return "Virgo";       // Mercury
    if (degree < 20) return "Pisces";      // Jupiter
    if (degree < 25) return "Capricorn";   // Saturn
    return "Scorpio";                       // Mars
  }
}

// D40 — Khavedamsha (Maternal Lineage / Auspicious-Inauspicious). 0°45' each.
// Odd signs from Aries, even from Libra.
function computeD40Sign(sign: string, degree: number): string {
  const part = Math.floor(degree / 0.75);
  const signIdx = SIGNS.indexOf(sign);
  const isOdd = signIdx % 2 === 0;
  const start = isOdd ? 0 : 6;
  return SIGNS[(start + part) % 12];
}

// D45 — Akshavedamsha (Paternal Lineage / Character). 0°40' each.
// Movable from Aries, Fixed from Leo, Dual from Sagittarius.
function computeD45Sign(sign: string, degree: number): string {
  const part = Math.floor(degree / (2 / 3));
  const signIdx = SIGNS.indexOf(sign);
  const mod = signIdx % 3;
  const start = mod === 0 ? 0 : mod === 1 ? 4 : 8;
  return SIGNS[(start + part) % 12];
}

// D60 — Shashtiamsa (Past Karma — most important). 0°30' each.
// Standard formula: count = floor(degree * 2) + 1; dest = (signIdx + count) % 12 with parity twist for even signs.
function computeD60Sign(sign: string, degree: number): string {
  const signIdx = SIGNS.indexOf(sign);
  const part = Math.floor(degree / 0.5); // 0..59
  const isOdd = signIdx % 2 === 0;
  // Parashari: for even signs, count from the 9th sign.
  const start = isOdd ? signIdx : (signIdx + 8) % 12;
  return SIGNS[(start + part) % 12];
}

// ─── Vimshopaka Bala (weighted strength across Shodashavarga) ───
// Parashari Shadvarga weights (sum=20): D1:6, D2:2, D3:4, D9:5, D12:2, D30:1.
// Score per varga: planet's sign in that varga is its own/exalted/moolatrikona/friend → full weight;
// neutral → half; enemy/debilitated → zero.
const VIMSHOPAKA_WEIGHTS: Record<string, number> = {
  d1: 6, d2: 2, d3: 4, d9: 5, d12: 2, d30: 1,
};

function vargaScoreForPlanet(planet: string, vargaSign: string): number {
  const dignity = determineDignity(planet, vargaSign);
  if (dignity === "exalted" || dignity === "moolatrikona" || dignity === "own_sign") return 1.0;
  if (dignity === "friendly") return 0.85;
  if (dignity === "neutral") return 0.5;
  if (dignity === "enemy") return 0.15;
  if (dignity === "debilitated") return 0;
  return 0.5;
}

function computeVimshopakaBala(planet: string, vargaSigns: Record<string, string>): { score: number; max: number } {
  let total = 0;
  let max = 0;
  for (const [v, w] of Object.entries(VIMSHOPAKA_WEIGHTS)) {
    max += w;
    const sg = vargaSigns[v];
    if (!sg) continue;
    total += vargaScoreForPlanet(planet, sg) * w;
  }
  return { score: Math.round(total * 10) / 10, max };
}

// Count how many of the 16 Shodashavarga charts place the planet in the same sign as D1.
function computeVargottamaCount(d1Sign: string, vargaSigns: Record<string, string>): number {
  let count = 0;
  for (const v of Object.keys(vargaSigns)) {
    if (vargaSigns[v] === d1Sign) count++;
  }
  return count;
}

// ─── Combustion Detection ───

function detectCombustion(planets: PlanetPos[]): { name: string; angularDist: number }[] {
  const sun = planets.find(p => p.name === "Sun");
  if (!sun) return [];
  const combust: { name: string; angularDist: number }[] = [];
  for (const p of planets) {
    if (p.name === "Sun" || p.name === "Rahu" || p.name === "Ketu") continue;
    const orb = (p.is_retrograde && COMBUSTION_ORBS_RETRO[p.name]) || COMBUSTION_ORBS[p.name];
    if (!orb) continue;
    const dist = Math.abs(p.totalDegree - sun.totalDegree);
    const angularDist = Math.min(dist, 360 - dist);
    if (angularDist <= orb) {
      p.is_combust = true;
      combust.push({ name: p.name, angularDist: Math.round(angularDist * 100) / 100 });
    }
  }
  return combust;
}

// ─── Planetary War (Graha Yuddha) ───

function detectPlanetaryWar(planets: PlanetPos[]): { planet1: string; planet2: string; winner: string }[] {
  const wars: { planet1: string; planet2: string; winner: string }[] = [];
  const combatants = planets.filter(p => ["Mars","Mercury","Jupiter","Venus","Saturn"].includes(p.name));
  for (let i = 0; i < combatants.length; i++) {
    for (let j = i + 1; j < combatants.length; j++) {
      const dist = Math.abs(combatants[i].totalDegree - combatants[j].totalDegree);
      const angularDist = Math.min(dist, 360 - dist);
      if (angularDist <= 1) {
        // Winner = planet with higher latitude (or brighter = lower magnitude)
        // Simplified: use natural strength (Naisargika Bala)
        const strength1 = NAISARGIKA_BALA[combatants[i].name] || 0;
        const strength2 = NAISARGIKA_BALA[combatants[j].name] || 0;
        const winner = strength1 >= strength2 ? combatants[i].name : combatants[j].name;
        wars.push({ planet1: combatants[i].name, planet2: combatants[j].name, winner });
      }
    }
  }
  return wars;
}

// ─── Shadbala-Lite Calculator ───

function computeShadbala(planet: PlanetPos, birthHour: number, planets: PlanetPos[]): number {
  const dignityScores: Record<string, number> = {
    exalted: 30, own_sign: 25, moolatrikona: 22, friendly: 15, neutral: 10, enemy: 5, debilitated: 0,
  };
  const sthanaBala = dignityScores[planet.dignity] ?? 10;

  const idealHouse = DIG_BALA_HOUSE[planet.name];
  let digBala = 7;
  if (idealHouse) {
    const dist = Math.abs(planet.house - idealHouse);
    const normalizedDist = Math.min(dist, 12 - dist);
    digBala = Math.round(15 * (1 - normalizedDist / 6));
  }

  const isDayBirth = birthHour >= 6 && birthHour < 18;
  const dayStrong = ["Sun", "Jupiter", "Venus"];
  const nightStrong = ["Moon", "Mars", "Saturn"];
  let kalaBala = 7;
  if (isDayBirth && dayStrong.includes(planet.name)) kalaBala = 15;
  else if (!isDayBirth && nightStrong.includes(planet.name)) kalaBala = 15;
  else if (isDayBirth && nightStrong.includes(planet.name)) kalaBala = 3;
  else if (!isDayBirth && dayStrong.includes(planet.name)) kalaBala = 3;

  const chestaBala = planet.is_retrograde ? 10 : 5;
  const naisargikaBala = NAISARGIKA_BALA[planet.name] ?? 5;

  const benefics = ["Jupiter", "Venus", "Mercury", "Moon"];
  const malefics = ["Saturn", "Mars", "Rahu", "Ketu", "Sun"];
  let beneficAspects = 0, maleficAspects = 0;
  for (const other of planets) {
    if (other.name === planet.name) continue;
    const aspectHouse = ((other.house - 1 + 6) % 12) + 1;
    if (aspectHouse === planet.house) {
      if (benefics.includes(other.name)) beneficAspects++;
      if (malefics.includes(other.name)) maleficAspects++;
    }
    if (other.name === "Jupiter") {
      const j5 = ((other.house - 1 + 4) % 12) + 1;
      const j9 = ((other.house - 1 + 8) % 12) + 1;
      if (j5 === planet.house || j9 === planet.house) beneficAspects++;
    }
    if (other.name === "Mars") {
      const m4 = ((other.house - 1 + 3) % 12) + 1;
      const m8 = ((other.house - 1 + 7) % 12) + 1;
      if (m4 === planet.house || m8 === planet.house) maleficAspects++;
    }
    if (other.name === "Saturn") {
      const s3 = ((other.house - 1 + 2) % 12) + 1;
      const s10 = ((other.house - 1 + 9) % 12) + 1;
      if (s3 === planet.house || s10 === planet.house) maleficAspects++;
    }
  }
  let drikBala = 7;
  if (beneficAspects > 0 && maleficAspects === 0) drikBala = 15;
  else if (maleficAspects > 0 && beneficAspects === 0) drikBala = 0;
  else if (beneficAspects > maleficAspects) drikBala = 11;
  else if (maleficAspects > beneficAspects) drikBala = 3;

  return Math.min(100, sthanaBala + digBala + kalaBala + chestaBala + naisargikaBala + drikBala);
}

// ─── Mangal Dosha Detection ───

interface MangalDosha {
  present: boolean;
  from_lagna?: boolean;
  from_moon?: boolean;
  from_venus?: boolean;
  cancelled?: boolean;
  cancellation_reason?: string;
}

function detectMangalDosha(planets: PlanetPos[], ascSign: string): MangalDosha {
  const mars = planets.find(p => p.name === "Mars");
  if (!mars) return { present: false };
  const doshaHouses = [1, 2, 4, 7, 8, 12];
  const marsFromLagna = getHouseFromSign(mars.sign, ascSign);
  const moon = planets.find(p => p.name === "Moon");
  const venus = planets.find(p => p.name === "Venus");
  const jupiter = planets.find(p => p.name === "Jupiter");

  const fromLagna = doshaHouses.includes(marsFromLagna);
  const fromMoon = moon ? doshaHouses.includes(getHouseFromSign(mars.sign, moon.sign)) : false;
  const fromVenus = venus ? doshaHouses.includes(getHouseFromSign(mars.sign, venus.sign)) : false;
  const present = fromLagna || fromMoon || fromVenus;

  if (!present) return { present: false };

  const reasons: string[] = [];
  if (mars.dignity === "own_sign" || mars.dignity === "exalted") reasons.push("Mars in own/exalted sign");
  if (jupiter) {
    const jupAspect7 = ((jupiter.house - 1 + 6) % 12) + 1;
    const jupAspect5 = ((jupiter.house - 1 + 4) % 12) + 1;
    const jupAspect9 = ((jupiter.house - 1 + 8) % 12) + 1;
    if ([jupAspect7, jupAspect5, jupAspect9].includes(marsFromLagna)) reasons.push("Jupiter aspects Mars");
  }
  if (mars.sign === "Leo" || mars.sign === "Aquarius") reasons.push("Mars in Leo/Aquarius");

  const cancelled = reasons.length > 0;
  return { present, from_lagna: fromLagna, from_moon: fromMoon, from_venus: fromVenus, cancelled, cancellation_reason: cancelled ? reasons.join("; ") : undefined };
}

// ─── Vimshottari Dasha Calculator (with Pratyantar) ───

const DASHA_ORDER = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
const DASHA_YEARS: Record<string, number> = {
  Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17,
};
const TOTAL_DASHA_CYCLE = 120;

function computeVimshottariDasha(moonTotalDegree: number, birthDate: string) {
  const nak = getNakshatraFromDegree(moonTotalDegree);
  const ruler = nak.ruler;
  const rulerIndex = DASHA_ORDER.indexOf(ruler);

  const nakSpan = 13.333;
  const nakStart = NAKSHATRA_DATA.find(n => n.name === nak.name)!.start;
  const elapsed = (moonTotalDegree - nakStart) / nakSpan;
  const remaining = 1 - elapsed;

  const firstDashaTotal = DASHA_YEARS[ruler];
  const firstDashaRemaining = remaining * firstDashaTotal;

  const bd = new Date(birthDate);
  const now = new Date();
  const ageYears = (now.getTime() - bd.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  let accumulated = firstDashaRemaining;
  let currentIdx = rulerIndex;

  if (ageYears <= accumulated) {
    const endDate = new Date(bd.getTime() + accumulated * 365.25 * 24 * 60 * 60 * 1000);
    return computeDashaResult(DASHA_ORDER[currentIdx], ageYears, accumulated, bd, endDate);
  }

  for (let i = 1; i <= 9; i++) {
    currentIdx = (rulerIndex + i) % 9;
    const dashaYears = DASHA_YEARS[DASHA_ORDER[currentIdx]];
    if (ageYears <= accumulated + dashaYears) {
      const startDate = new Date(bd.getTime() + accumulated * 365.25 * 24 * 60 * 60 * 1000);
      const endDate = new Date(bd.getTime() + (accumulated + dashaYears) * 365.25 * 24 * 60 * 60 * 1000);
      const elapsedInDasha = ageYears - accumulated;
      return computeDashaResult(DASHA_ORDER[currentIdx], elapsedInDasha, dashaYears, startDate, endDate);
    }
    accumulated += dashaYears;
  }

  return { maha_dasha: DASHA_ORDER[currentIdx], maha_dasha_end: "", antar_dasha: "", pratyantar_dasha: "" };
}

function computeDashaResult(mahaDashaLord: string, elapsedInMaha: number, totalMahaYears: number, startDate: Date, endDate: Date) {
  const mahaIndex = DASHA_ORDER.indexOf(mahaDashaLord);
  const fractionElapsed = elapsedInMaha / totalMahaYears;
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

  // Antardasha
  let antarAccum = 0, antarDasha = mahaDashaLord, antarFractionSize = 0, antarIndex = mahaIndex;
  let antarStartFraction = 0;
  for (let i = 0; i < 9; i++) {
    const antarLord = DASHA_ORDER[(mahaIndex + i) % 9];
    const antarFraction = DASHA_YEARS[antarLord] / TOTAL_DASHA_CYCLE;
    if (fractionElapsed <= antarAccum + antarFraction) {
      antarDasha = antarLord;
      antarFractionSize = antarFraction;
      antarIndex = (mahaIndex + i) % 9;
      antarStartFraction = antarAccum;
      break;
    }
    antarAccum += antarFraction;
  }
  const antarStart = new Date(startDate.getTime() + antarStartFraction * totalMahaYears * MS_PER_YEAR);
  const antarEnd = new Date(antarStart.getTime() + antarFractionSize * totalMahaYears * MS_PER_YEAR);

  // Pratyantar
  const fractionInAntar = antarFractionSize > 0 ? (fractionElapsed - antarStartFraction) / antarFractionSize : 0;
  let pAccum = 0, pratyantarDasha = antarDasha, pIndex = antarIndex, pFractionSize = 0, pStartFraction = 0;
  for (let j = 0; j < 9; j++) {
    const pLord = DASHA_ORDER[(antarIndex + j) % 9];
    const pFraction = DASHA_YEARS[pLord] / TOTAL_DASHA_CYCLE;
    if (fractionInAntar <= pAccum + pFraction) {
      pratyantarDasha = pLord;
      pIndex = (antarIndex + j) % 9;
      pFractionSize = pFraction;
      pStartFraction = pAccum;
      break;
    }
    pAccum += pFraction;
  }
  const antarSpanMs = antarEnd.getTime() - antarStart.getTime();
  const pratyantarStart = new Date(antarStart.getTime() + pStartFraction * antarSpanMs);
  const pratyantarEnd = new Date(pratyantarStart.getTime() + pFractionSize * antarSpanMs);

  // Sookshma
  const fractionInPratyantar = pFractionSize > 0 ? (fractionInAntar - pStartFraction) / pFractionSize : 0;
  let sAccum = 0, sookshmaDasha = pratyantarDasha, sIndex = pIndex, sFractionSize = 0, sStartFraction = 0;
  for (let k = 0; k < 9; k++) {
    const sLord = DASHA_ORDER[(pIndex + k) % 9];
    const sFraction = DASHA_YEARS[sLord] / TOTAL_DASHA_CYCLE;
    if (fractionInPratyantar <= sAccum + sFraction) {
      sookshmaDasha = sLord;
      sIndex = (pIndex + k) % 9;
      sFractionSize = sFraction;
      sStartFraction = sAccum;
      break;
    }
    sAccum += sFraction;
  }
  const pSpanMs = pratyantarEnd.getTime() - pratyantarStart.getTime();
  const sookshmaStart = new Date(pratyantarStart.getTime() + sStartFraction * pSpanMs);
  const sookshmaEnd = new Date(sookshmaStart.getTime() + sFractionSize * pSpanMs);

  // Prana
  const fractionInSookshma = sFractionSize > 0 ? (fractionInPratyantar - sStartFraction) / sFractionSize : 0;
  let prAccum = 0, pranaDasha = sookshmaDasha, prFractionSize = 0, prStartFraction = 0;
  for (let l = 0; l < 9; l++) {
    const prLord = DASHA_ORDER[(sIndex + l) % 9];
    const prFraction = DASHA_YEARS[prLord] / TOTAL_DASHA_CYCLE;
    if (fractionInSookshma <= prAccum + prFraction) {
      pranaDasha = prLord;
      prFractionSize = prFraction;
      prStartFraction = prAccum;
      break;
    }
    prAccum += prFraction;
  }
  const sSpanMs = sookshmaEnd.getTime() - sookshmaStart.getTime();
  const pranaStart = new Date(sookshmaStart.getTime() + prStartFraction * sSpanMs);
  const pranaEnd = new Date(pranaStart.getTime() + prFractionSize * sSpanMs);

  const fmt = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

  return {
    maha_dasha: mahaDashaLord,
    antar_dasha: antarDasha,
    pratyantar_dasha: pratyantarDasha,
    sookshma_dasha: sookshmaDasha,
    prana_dasha: pranaDasha,
    maha_dasha_start: startDate.toISOString().slice(0, 10),
    maha_dasha_end: endDate.toISOString().slice(0, 10),
    antar_dasha_start: antarStart.toISOString().slice(0, 10),
    antar_dasha_end: antarEnd.toISOString().slice(0, 10),
    pratyantar_dasha_start: pratyantarStart.toISOString().slice(0, 10),
    pratyantar_dasha_end: pratyantarEnd.toISOString().slice(0, 10),
    sookshma_dasha_start: fmt(sookshmaStart),
    sookshma_dasha_end: fmt(sookshmaEnd),
    prana_dasha_start: fmt(pranaStart),
    prana_dasha_end: fmt(pranaEnd),
  };
}

// ─── Yogini Dasha Calculator ───

const YOGINI_ORDER = [
  { name: "Mangala", planet: "Moon", years: 1 },
  { name: "Pingala", planet: "Sun", years: 2 },
  { name: "Dhanya", planet: "Jupiter", years: 3 },
  { name: "Bhramari", planet: "Mars", years: 4 },
  { name: "Bhadrika", planet: "Mercury", years: 5 },
  { name: "Ulka", planet: "Saturn", years: 6 },
  { name: "Siddha", planet: "Venus", years: 7 },
  { name: "Sankata", planet: "Rahu", years: 8 },
];
const YOGINI_TOTAL = 36;

function computeYoginiDasha(moonTotalDegree: number, birthDate: string) {
  const nak = getNakshatraFromDegree(moonTotalDegree);
  const nakNumber = NAKSHATRA_DATA.findIndex(n => n.name === nak.name) + 1; // 1-27
  const startIdx = (nakNumber + 3) % 8;

  const nakSpan = 13.333;
  const nakStart = NAKSHATRA_DATA.find(n => n.name === nak.name)!.start;
  const elapsed = (moonTotalDegree - nakStart) / nakSpan;
  const remaining = 1 - elapsed;

  const firstYogini = YOGINI_ORDER[startIdx];
  const firstRemaining = remaining * firstYogini.years;

  const bd = new Date(birthDate);
  const now = new Date();
  const ageYears = (now.getTime() - bd.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  let accumulated = firstRemaining;
  if (ageYears <= accumulated) {
    return { yogini: firstYogini.name, planet: firstYogini.planet, years: firstYogini.years };
  }

  for (let i = 1; i < 8; i++) {
    const idx = (startIdx + i) % 8;
    const y = YOGINI_ORDER[idx];
    if (ageYears <= accumulated + y.years) {
      return { yogini: y.name, planet: y.planet, years: y.years };
    }
    accumulated += y.years;
  }

  // Cycle repeats
  const cycleAge = ageYears % YOGINI_TOTAL;
  accumulated = firstRemaining;
  if (cycleAge <= accumulated) {
    return { yogini: firstYogini.name, planet: firstYogini.planet, years: firstYogini.years };
  }
  for (let i = 1; i < 8; i++) {
    const idx = (startIdx + i) % 8;
    const y = YOGINI_ORDER[idx];
    if (cycleAge <= accumulated + y.years) {
      return { yogini: y.name, planet: y.planet, years: y.years };
    }
    accumulated += y.years;
  }

  return { yogini: YOGINI_ORDER[startIdx].name, planet: YOGINI_ORDER[startIdx].planet, years: YOGINI_ORDER[startIdx].years };
}

// ─── Ashtottari Dasha (108-year cycle) ───
const ASHTOTTARI_ORDER = [
  { planet: "Sun",     years: 6 },
  { planet: "Moon",    years: 15 },
  { planet: "Mars",    years: 8 },
  { planet: "Mercury", years: 17 },
  { planet: "Saturn",  years: 10 },
  { planet: "Jupiter", years: 19 },
  { planet: "Rahu",    years: 12 },
  { planet: "Venus",   years: 21 },
];
const ASHTOTTARI_TOTAL = 108;
function ashtottariStartIdx(nakNumber: number): number {
  if (nakNumber >= 6 && nakNumber <= 9) return 0;
  if (nakNumber >= 10 && nakNumber <= 14) return 1;
  if (nakNumber >= 15 && nakNumber <= 18) return 2;
  if (nakNumber >= 19 && nakNumber <= 23) return 3;
  if (nakNumber >= 24 && nakNumber <= 27) return 4;
  if (nakNumber >= 1 && nakNumber <= 3) return 5;
  if (nakNumber === 4 || nakNumber === 5) return 6;
  return 0;
}
function computeAshtottariDasha(moonTotalDegree: number, birthDate: string) {
  const nak = getNakshatraFromDegree(moonTotalDegree);
  const nakNumber = NAKSHATRA_DATA.findIndex(n => n.name === nak.name) + 1;
  const startIdx = ashtottariStartIdx(nakNumber);
  const nakSpan = 13.333;
  const nakStart = NAKSHATRA_DATA.find(n => n.name === nak.name)!.start;
  const elapsed = (moonTotalDegree - nakStart) / nakSpan;
  const remaining = 1 - elapsed;
  const first = ASHTOTTARI_ORDER[startIdx];
  const firstRemaining = remaining * first.years;
  const bd = new Date(birthDate);
  const now = new Date();
  const ageYears = (now.getTime() - bd.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  let accumulated = firstRemaining;
  if (ageYears <= accumulated) {
    return { current: first.planet, years: first.years, remaining_years: Math.round((accumulated - ageYears) * 100) / 100 };
  }
  for (let i = 1; i < 8; i++) {
    const idx = (startIdx + i) % 8;
    const d = ASHTOTTARI_ORDER[idx];
    if (ageYears <= accumulated + d.years) {
      return { current: d.planet, years: d.years, remaining_years: Math.round((accumulated + d.years - ageYears) * 100) / 100 };
    }
    accumulated += d.years;
  }
  const cycleAge = ageYears % ASHTOTTARI_TOTAL;
  accumulated = firstRemaining;
  if (cycleAge <= accumulated) return { current: first.planet, years: first.years, remaining_years: Math.round((accumulated - cycleAge) * 100) / 100 };
  for (let i = 1; i < 8; i++) {
    const idx = (startIdx + i) % 8;
    const d = ASHTOTTARI_ORDER[idx];
    if (cycleAge <= accumulated + d.years) {
      return { current: d.planet, years: d.years, remaining_years: Math.round((accumulated + d.years - cycleAge) * 100) / 100 };
    }
    accumulated += d.years;
  }
  return { current: first.planet, years: first.years, remaining_years: 0 };
}

// ─── Chara Dasha (Jaimini, sign-based) ───
function charaSignYears(sign: string): number {
  const signIdx = SIGNS.indexOf(sign);
  const lordPlanet = SIGN_LORD[sign];
  const lordSignName = MOOLATRIKONA[lordPlanet] || OWN_SIGNS[lordPlanet]?.[0] || sign;
  const lordIdx = SIGNS.indexOf(lordSignName);
  const isOddSign = signIdx % 2 === 0;
  let dist: number;
  if (isOddSign) dist = ((lordIdx - signIdx + 12) % 12);
  else dist = ((signIdx - lordIdx + 12) % 12);
  if (dist === 0) dist = 12;
  return Math.max(1, dist - 1);
}
function computeCharaDasha(ascSign: string, birthDate: string) {
  const startIdx = SIGNS.indexOf(ascSign);
  const sequence: { sign: string; years: number }[] = [];
  const forward = startIdx % 2 === 0;
  for (let i = 0; i < 12; i++) {
    const idx = forward ? (startIdx + i) % 12 : (startIdx - i + 12) % 12;
    const sg = SIGNS[idx];
    sequence.push({ sign: sg, years: charaSignYears(sg) });
  }
  const total = sequence.reduce((s, x) => s + x.years, 0) || 96;
  const bd = new Date(birthDate);
  const now = new Date();
  const ageYears = (now.getTime() - bd.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const cycleAge = ageYears % total;
  let acc = 0;
  for (const item of sequence) {
    if (cycleAge <= acc + item.years) {
      return { current_sign: item.sign, years: item.years, remaining_years: Math.round((acc + item.years - cycleAge) * 100) / 100, sequence };
    }
    acc += item.years;
  }
  return { current_sign: sequence[0].sign, years: sequence[0].years, remaining_years: 0, sequence };
}

// ─── Yoga Detection (20 yogas) ───

function getHouseFromSign(planetSign: string, ascendantSign: string): number {
  const diff = (signToIndex(planetSign) - signToIndex(ascendantSign) + 12) % 12;
  return diff + 1;
}

function isKendra(house: number): boolean {
  return [1, 4, 7, 10].includes(house);
}

function isTrikona(house: number): boolean {
  return [1, 5, 9].includes(house);
}

interface PlanetPos {
  name: string; sign: string; degree: number; house: number; dignity: string;
  is_retrograde?: boolean; totalDegree: number; is_combust?: boolean;
  speed?: number; latitude?: number;
}

function detectYogas(planets: PlanetPos[], ascendantSign: string): { name: string; description: string; involved_planets: string[] }[] {
  const detected: { name: string; description: string; involved_planets: string[] }[] = [];
  const getP = (name: string) => planets.find(p => p.name === name);
  const houseOf = (sign: string) => getHouseFromSign(sign, ascendantSign);
  const houseOfFromRef = (planetSign: string, refSign: string) => ((signToIndex(planetSign) - signToIndex(refSign) + 12) % 12) + 1;

  const jupiter = getP("Jupiter"), moon = getP("Moon"), mercury = getP("Mercury");
  const sun = getP("Sun"), mars = getP("Mars"), venus = getP("Venus"), saturn = getP("Saturn");
  const rahu = getP("Rahu"), ketu = getP("Ketu");

  // 1. Gajakesari
  if (jupiter && moon) {
    const jFromMoon = houseOfFromRef(jupiter.sign, moon.sign);
    if (isKendra(jFromMoon) && jupiter.dignity !== "debilitated") {
      detected.push({ name: "Gajakesari Yoga", description: "Jupiter in kendra from Moon grants wisdom and fame.", involved_planets: ["Jupiter", "Moon"] });
    }
  }

  // 2. Budhaditya
  if (mercury && sun && mercury.sign === sun.sign) {
    detected.push({ name: "Budhaditya Yoga", description: "Mercury conjunct Sun bestows sharp intellect.", involved_planets: ["Mercury", "Sun"] });
  }

  // 3. Chandra-Mangal
  if (moon && mars && moon.sign === mars.sign) {
    detected.push({ name: "Chandra-Mangal Yoga", description: "Moon-Mars conjunction creates wealth through self-effort.", involved_planets: ["Moon", "Mars"] });
  }

  // 4-8. Pancha Mahapurusha
  const pmChecks = [
    { planet: "Jupiter", signs: ["Sagittarius","Pisces","Cancer"], yogaName: "Hamsa Yoga", desc: "Jupiter in own/exalted sign in kendra." },
    { planet: "Venus", signs: ["Taurus","Libra","Pisces"], yogaName: "Malavya Yoga", desc: "Venus in own/exalted sign in kendra." },
    { planet: "Mars", signs: ["Aries","Scorpio","Capricorn"], yogaName: "Ruchaka Yoga", desc: "Mars in own/exalted sign in kendra." },
    { planet: "Mercury", signs: ["Gemini","Virgo"], yogaName: "Bhadra Yoga", desc: "Mercury in own/exalted sign in kendra." },
    { planet: "Saturn", signs: ["Capricorn","Aquarius","Libra"], yogaName: "Shasha Yoga", desc: "Saturn in own/exalted sign in kendra." },
  ];
  for (const check of pmChecks) {
    const p = getP(check.planet);
    if (p && check.signs.includes(p.sign) && isKendra(p.house)) {
      detected.push({ name: check.yogaName, description: check.desc, involved_planets: [check.planet] });
    }
  }

  // 9. Amala
  const benefics = ["Jupiter","Venus","Mercury","Moon"];
  for (const bName of benefics) {
    const b = getP(bName);
    if (b && b.house === 10 && b.dignity !== "debilitated") {
      detected.push({ name: "Amala Yoga", description: `${bName} in 10th house creates spotless reputation.`, involved_planets: [bName] });
      break;
    }
  }

  // 10. Kemadruma
  if (moon) {
    const moonIdx = signToIndex(moon.sign);
    const sign2 = SIGNS[(moonIdx + 1) % 12];
    const sign12 = SIGNS[(moonIdx + 11) % 12];
    const checkPlanets = planets.filter(p => !["Sun","Rahu","Ketu","Moon"].includes(p.name));
    const hasNeighbor = checkPlanets.some(p => p.sign === sign2 || p.sign === sign12);
    if (!hasNeighbor) {
      const moonHouse = houseOf(moon.sign);
      const cancelled = isKendra(moonHouse) || (jupiter && (jupiter.house === moonHouse || Math.abs(jupiter.house - moonHouse) === 6));
      if (!cancelled) {
        detected.push({ name: "Kemadruma Yoga", description: "No planets flanking Moon - emotional challenges.", involved_planets: ["Moon"] });
      }
    }
  }

  // 11. Kala Sarpa
  if (rahu && ketu) {
    const rahuIdx = signToIndex(rahu.sign);
    const ketuIdx = signToIndex(ketu.sign);
    const otherPlanets = planets.filter(p => !["Rahu","Ketu"].includes(p.name));
    const allOnOneSide = otherPlanets.every(p => {
      const pIdx = signToIndex(p.sign);
      if (rahuIdx <= ketuIdx) return pIdx >= rahuIdx && pIdx <= ketuIdx;
      return pIdx >= rahuIdx || pIdx <= ketuIdx;
    });
    if (allOnOneSide) {
      detected.push({ name: "Kala Sarpa Yoga", description: "All planets hemmed between Rahu-Ketu axis.", involved_planets: ["Rahu","Ketu"] });
    }
  }

  // 12. Raj Yoga
  const kendraHouses = [1, 4, 7, 10];
  const trikonaHouses = [5, 9];
  const kendraLords = kendraHouses.map(h => SIGN_LORD[SIGNS[(signToIndex(ascendantSign) + h - 1) % 12]]);
  const trikonaLords = trikonaHouses.map(h => SIGN_LORD[SIGNS[(signToIndex(ascendantSign) + h - 1) % 12]]);
  for (const kl of kendraLords) {
    for (const tl of trikonaLords) {
      if (kl === tl) continue;
      const klP = getP(kl), tlP = getP(tl);
      if (klP && tlP && klP.sign === tlP.sign) {
        detected.push({ name: "Raj Yoga", description: `${kl} (kendra lord) conjunct ${tl} (trikona lord).`, involved_planets: [kl, tl] });
        break;
      }
    }
    if (detected.some(d => d.name === "Raj Yoga")) break;
  }

  // 13. Vipareeta Raj Yoga
  const dusthanaHouses = [6, 8, 12];
  const dusthanaLords = dusthanaHouses.map(h => ({
    house: h, lord: SIGN_LORD[SIGNS[(signToIndex(ascendantSign) + h - 1) % 12]],
  }));
  for (const dl of dusthanaLords) {
    const p = getP(dl.lord);
    if (!p) continue;
    const otherDusthanas = dusthanaHouses.filter(h => h !== dl.house);
    if (otherDusthanas.includes(p.house)) {
      detected.push({ name: "Vipareeta Raj Yoga", description: `Lord of ${dl.house}th in ${p.house}th — unexpected rise.`, involved_planets: [dl.lord] });
      break;
    }
  }

  // 14. Neecha Bhanga Raj Yoga
  for (const p of planets) {
    if (p.dignity !== "debilitated") continue;
    const lord = SIGN_LORD[p.sign];
    const lordP = getP(lord);
    if (lordP && (isKendra(lordP.house) || (moon && isKendra(houseOfFromRef(lordP.sign, moon.sign))))) {
      detected.push({ name: "Neecha Bhanga Raj Yoga", description: `${p.name}'s debilitation cancelled by ${lord} in kendra.`, involved_planets: [p.name, lord] });
    }
  }

  // 15. Saraswati Yoga
  const saraswatiH = [1, 2, 4, 5, 7, 9, 10];
  if (jupiter && venus && mercury) {
    if (saraswatiH.includes(jupiter.house) && saraswatiH.includes(venus.house) && saraswatiH.includes(mercury.house)
        && jupiter.dignity !== "debilitated" && venus.dignity !== "debilitated" && mercury.dignity !== "debilitated") {
      detected.push({ name: "Saraswati Yoga", description: "Jupiter, Venus, Mercury in auspicious houses — learning and arts.", involved_planets: ["Jupiter", "Venus", "Mercury"] });
    }
  }

  // 16. Lakshmi Yoga
  const ninthSign = SIGNS[(signToIndex(ascendantSign) + 8) % 12];
  const ninthLord = SIGN_LORD[ninthSign];
  const ninthLordP = getP(ninthLord);
  if (ninthLordP) {
    const goodH = [1, 4, 5, 7, 9, 10];
    if (goodH.includes(ninthLordP.house) && (ninthLordP.dignity === "own_sign" || ninthLordP.dignity === "exalted")) {
      detected.push({ name: "Lakshmi Yoga", description: `${ninthLord} (9th lord) in ${ninthLordP.dignity}.`, involved_planets: [ninthLord] });
    }
  }

  // 17. Dhana Yoga
  const dhSrc = [2, 11], dhTri = [5, 9];
  let dhFound = false;
  for (const dh of dhSrc) {
    if (dhFound) break;
    const dhLord = SIGN_LORD[SIGNS[(signToIndex(ascendantSign) + dh - 1) % 12]];
    const dhLordP = getP(dhLord);
    if (!dhLordP) continue;
    for (const th of dhTri) {
      const thLord = SIGN_LORD[SIGNS[(signToIndex(ascendantSign) + th - 1) % 12]];
      if (dhLord === thLord) continue;
      const thLordP = getP(thLord);
      if (thLordP && dhLordP.sign === thLordP.sign) {
        detected.push({ name: "Dhana Yoga", description: `${dhLord} conjunct ${thLord} — wealth.`, involved_planets: [dhLord, thLord] });
        dhFound = true; break;
      }
    }
  }

  // 18. Adhi Yoga
  if (moon) {
    const adhiB = ["Jupiter", "Venus", "Mercury"];
    const adhiH = [6, 7, 8];
    const adhiCount = adhiB.filter(bName => {
      const b = getP(bName);
      return b && adhiH.includes(houseOfFromRef(b.sign, moon.sign));
    });
    if (adhiCount.length >= 2) {
      detected.push({ name: "Adhi Yoga", description: `${adhiCount.join(", ")} in 6/7/8th from Moon.`, involved_planets: adhiCount });
    }
  }

  // 19-21. Sunapha, Anapha, Durudhara
  if (moon) {
    const moonIdx = signToIndex(moon.sign);
    const s2 = SIGNS[(moonIdx + 1) % 12];
    const s12 = SIGNS[(moonIdx + 11) % 12];
    const eligible = planets.filter(p => !["Sun", "Rahu", "Ketu", "Moon"].includes(p.name));
    const in2 = eligible.filter(p => p.sign === s2);
    const in12 = eligible.filter(p => p.sign === s12);
    if (in2.length > 0 && in12.length > 0) {
      detected.push({ name: "Durudhara Yoga", description: "Planets on both sides of Moon.", involved_planets: [...in2.map(p => p.name), ...in12.map(p => p.name), "Moon"] });
    } else if (in2.length > 0) {
      detected.push({ name: "Sunapha Yoga", description: "Planet in 2nd from Moon.", involved_planets: [...in2.map(p => p.name), "Moon"] });
    } else if (in12.length > 0) {
      detected.push({ name: "Anapha Yoga", description: "Planet in 12th from Moon.", involved_planets: [...in12.map(p => p.name), "Moon"] });
    }
  }

  return detected;
}

// ─── Life Area Scoring System ───

function computeLifeScores(planets: PlanetPos[], ascSign: string, yogas: { name: string }[]) {
  const getHouseLord = (house: number) => SIGN_LORD[SIGNS[(signToIndex(ascSign) + house - 1) % 12]];
  const getP = (name: string) => planets.find(p => p.name === name);
  const getStrength = (name: string) => (getP(name) as any)?.strength ?? 50;

  // Career (0-100): 10th lord strength + planets in 10th + Raj Yoga
  const tenthLord = getHouseLord(10);
  const careerBase = getStrength(tenthLord);
  const planetsIn10 = planets.filter(p => p.house === 10).length;
  const rajYoga = yogas.some(y => y.name.includes("Raj")) ? 15 : 0;
  const career = Math.min(100, Math.round(careerBase * 0.6 + planetsIn10 * 8 + rajYoga));

  // Marriage (0-100): 7th lord + Venus + D9 factors
  const seventhLord = getHouseLord(7);
  const venusStrength = getStrength("Venus");
  const seventhLordStr = getStrength(seventhLord);
  const marriage = Math.min(100, Math.round((seventhLordStr + venusStrength) / 2 * 0.8 + (yogas.some(y => y.name === "Malavya Yoga") ? 15 : 0)));

  // Wealth (0-100): 2nd/11th lords + Dhana yogas + Jupiter
  const secondLordStr = getStrength(getHouseLord(2));
  const eleventhLordStr = getStrength(getHouseLord(11));
  const jupiterStr = getStrength("Jupiter");
  const dhanaBoost = yogas.some(y => y.name.includes("Dhana") || y.name.includes("Lakshmi")) ? 15 : 0;
  const wealth = Math.min(100, Math.round((secondLordStr + eleventhLordStr + jupiterStr) / 3 * 0.7 + dhanaBoost));

  // Health (0-100): Lagna lord + 6th house affliction
  const lagnaLordStr = getStrength(getHouseLord(1));
  const planetsIn6 = planets.filter(p => p.house === 6).length;
  const health = Math.min(100, Math.round(lagnaLordStr * 0.8 - planetsIn6 * 5 + 20));

  // Spiritual (0-100): 9th/12th lords + Jupiter/Ketu
  const ninthLordStr = getStrength(getHouseLord(9));
  const twelfthLordStr = getStrength(getHouseLord(12));
  const ketuStr = getStrength("Ketu");
  const spiritual = Math.min(100, Math.round((ninthLordStr + twelfthLordStr + jupiterStr + ketuStr) / 4 * 0.8 + 10));

  return {
    career: Math.max(0, career),
    marriage: Math.max(0, marriage),
    wealth: Math.max(0, wealth),
    health: Math.max(0, health),
    spiritual: Math.max(0, spiritual),
  };
}

// ─── Astronomical Computation (Pure JS via astronomy-engine) ───

interface EphPlanet {
  name: string;
  longitude: number;
  latitude: number;
  speed: number;
  sign: string;
  degree: number;
  is_retrograde: boolean;
}

function computeAscendantLng(jd: number, lat: number, lng: number, ayanamsa: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
             + 0.000387933 * T * T - T * T * T / 38710000.0;
  const lstDeg = ((gmst + lng) % 360 + 360) % 360;
  const lstRad = lstDeg * Math.PI / 180;
  const obliquity = (23.4393 - 0.013 * T) * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const ascRad = Math.atan2(-Math.cos(lstRad),
    Math.sin(lstRad) * Math.cos(obliquity) + Math.tan(latRad) * Math.sin(obliquity));
  let ascDeg = (ascRad * 180 / Math.PI + 360) % 360;
  ascDeg = ((ascDeg - ayanamsa) % 360 + 360) % 360;
  return ascDeg;
}

const BODY_MAP: { name: string; body: any }[] = [
  { name: "Sun", body: Body.Sun },
  { name: "Moon", body: Body.Moon },
  { name: "Mercury", body: Body.Mercury },
  { name: "Venus", body: Body.Venus },
  { name: "Mars", body: Body.Mars },
  { name: "Jupiter", body: Body.Jupiter },
  { name: "Saturn", body: Body.Saturn },
];

async function computeChartFromEphemeris(
  dateOfBirth: string, birthTime: string, lat: number, lng: number, utcOffsetMinutes?: number
): Promise<{ planets: EphPlanet[]; ascendant: { longitude: number; sign: string; degree: number } }> {
  let [year, month, day] = dateOfBirth.split("-").map(Number);

  // Year validation guard
  if (year < 1800 || year > 2200) {
    throw new Error(`Invalid birth year: ${year}. Must be between 1800 and 2200.`);
  }

  const timeParts = birthTime.split(":");
  const hour = parseInt(timeParts[0]) || 0;
  const minute = parseInt(timeParts[1]) || 0;
  const second = parseInt(timeParts[2]) || 0;
  const localHourDecimal = hour + minute / 60 + second / 3600;

  // Use actual timezone offset if provided, otherwise fall back to LMT
  const offsetHours = (utcOffsetMinutes != null) ? (utcOffsetMinutes / 60) : (lng / 15);
  let utHour = localHourDecimal - offsetHours;

  // ─── UTC Date Rollover ───
  // When timezone offset pushes UTC hour outside 0-24, adjust the calendar date
  if (utHour < 0) {
    // Birth in UTC is previous day
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() - 1);
    year = d.getUTCFullYear();
    month = d.getUTCMonth() + 1;
    day = d.getUTCDate();
    utHour += 24;
  } else if (utHour >= 24) {
    // Birth in UTC is next day
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() + 1);
    year = d.getUTCFullYear();
    month = d.getUTCMonth() + 1;
    day = d.getUTCDate();
    utHour -= 24;
  }

  console.log(`UTC resolved: ${year}-${month}-${day} ${utHour.toFixed(4)}h (offset=${offsetHours}h)`);

  const jd = julianDay(year, month, day, utHour);
  const ayanamsa = lahiriAyanamsa(jd);

  // Create time objects using corrected UTC date/time
  const utDate = new Date(Date.UTC(year, month - 1, day, Math.floor(utHour), Math.round((utHour % 1) * 60)));
  const time1 = MakeTime(utDate);
  const time2 = MakeTime(new Date(utDate.getTime() + 86400000));

  const planets: EphPlanet[] = [];

  for (const pl of BODY_MAP) {
    let tropicalLng: number, tropicalLng2: number;
    if (pl.name === "Sun") {
      tropicalLng = Ecliptic(GeoVector(Body.Sun, time1, true)).elon;
      tropicalLng2 = Ecliptic(GeoVector(Body.Sun, time2, true)).elon;
    } else if (pl.name === "Moon") {
      tropicalLng = Ecliptic(GeoVector(Body.Moon, time1, true)).elon;
      tropicalLng2 = Ecliptic(GeoVector(Body.Moon, time2, true)).elon;
    } else {
      tropicalLng = EclipticLongitude(pl.body, time1);
      tropicalLng2 = EclipticLongitude(pl.body, time2);
    }
    const siderealLng = ((tropicalLng - ayanamsa) % 360 + 360) % 360;
    const speed = ((tropicalLng2 - tropicalLng + 540) % 360) - 180;
    const signIdx = Math.floor(siderealLng / 30);
    const deg = siderealLng % 30;
    planets.push({
      name: pl.name,
      longitude: siderealLng,
      latitude: 0,
      speed,
      sign: SIGNS[signIdx],
      degree: Math.round(deg * 100) / 100,
      is_retrograde: speed < 0,
    });
  }

  // Rahu (Mean Lunar Node)
  const rahuTropical = meanLunarNode(jd);
  const rahuLng = ((rahuTropical - ayanamsa) % 360 + 360) % 360;
  const rahuSignIdx = Math.floor(rahuLng / 30);
  planets.push({
    name: "Rahu", longitude: rahuLng, latitude: 0, speed: -0.053,
    sign: SIGNS[rahuSignIdx], degree: Math.round((rahuLng % 30) * 100) / 100, is_retrograde: true,
  });

  const ketuLng = (rahuLng + 180) % 360;
  const ketuSignIdx = Math.floor(ketuLng / 30);
  planets.push({
    name: "Ketu", longitude: ketuLng, latitude: 0, speed: 0,
    sign: SIGNS[ketuSignIdx], degree: Math.round((ketuLng % 30) * 100) / 100, is_retrograde: true,
  });

  // Ascendant
  const ascLng = computeAscendantLng(jd, lat, lng, ayanamsa);
  const ascSignIdx = Math.floor(ascLng / 30);

  return {
    planets,
    ascendant: {
      longitude: ascLng,
      sign: SIGNS[ascSignIdx],
      degree: Math.round((ascLng % 30) * 100) / 100,
    },
  };
}

// ─── Server-Side Timezone Resolution ───

// Hardcoded geographic timezone boundaries for critical fallback
const GEO_TIMEZONE_MAP: { latMin: number; latMax: number; lonMin: number; lonMax: number; iana: string; offsetMinutes: number }[] = [
  { latMin: 26, latMax: 31, lonMin: 80, lonMax: 89, iana: "Asia/Kathmandu", offsetMinutes: 345 },    // Nepal +5:45
  { latMin: 6, latMax: 36, lonMin: 68, lonMax: 97, iana: "Asia/Kolkata", offsetMinutes: 330 },         // India +5:30
  { latMin: 5, latMax: 10, lonMin: 79, lonMax: 82, iana: "Asia/Colombo", offsetMinutes: 330 },         // Sri Lanka +5:30
  { latMin: 20, latMax: 27, lonMin: 88, lonMax: 93, iana: "Asia/Dhaka", offsetMinutes: 360 },          // Bangladesh +6:00
  { latMin: 23, latMax: 37, lonMin: 60, lonMax: 78, iana: "Asia/Karachi", offsetMinutes: 300 },        // Pakistan +5:00
  { latMin: 14, latMax: 29, lonMin: 92, lonMax: 102, iana: "Asia/Yangon", offsetMinutes: 390 },        // Myanmar +6:30
  { latMin: 5, latMax: 21, lonMin: 97, lonMax: 106, iana: "Asia/Bangkok", offsetMinutes: 420 },        // Thailand +7:00
  { latMin: 18, latMax: 54, lonMin: 73, lonMax: 135, iana: "Asia/Shanghai", offsetMinutes: 480 },      // China +8:00
  { latMin: 30, latMax: 46, lonMin: 128, lonMax: 146, iana: "Asia/Tokyo", offsetMinutes: 540 },        // Japan +9:00
  { latMin: 33, latMax: 39, lonMin: 124, lonMax: 131, iana: "Asia/Seoul", offsetMinutes: 540 },        // Korea +9:00
  { latMin: 35, latMax: 72, lonMin: -10, lonMax: 2, iana: "Europe/London", offsetMinutes: 0 },         // UK +0:00
  { latMin: 42, latMax: 55, lonMin: 2, lonMax: 15, iana: "Europe/Paris", offsetMinutes: 60 },          // Central Europe +1:00
  { latMin: 24, latMax: 50, lonMin: -125, lonMax: -114, iana: "America/Los_Angeles", offsetMinutes: -480 }, // US Pacific
  { latMin: 24, latMax: 50, lonMin: -114, lonMax: -101, iana: "America/Denver", offsetMinutes: -420 },      // US Mountain
  { latMin: 24, latMax: 50, lonMin: -101, lonMax: -87, iana: "America/Chicago", offsetMinutes: -360 },      // US Central
  { latMin: 24, latMax: 50, lonMin: -87, lonMax: -66, iana: "America/New_York", offsetMinutes: -300 },      // US Eastern
];

function resolveTimezoneFromCoords(lat: number, lng: number, dateStr: string, timeStr: string): { iana: string; offsetMinutes: number } | null {
  // Try geographic lookup first for precision
  for (const zone of GEO_TIMEZONE_MAP) {
    if (lat >= zone.latMin && lat <= zone.latMax && lng >= zone.lonMin && lng <= zone.lonMax) {
      // Use Intl to get exact historical offset for this IANA timezone
      try {
        const [y, m, d] = dateStr.split("-").map(Number);
        const [h, min] = timeStr.split(":").map(Number);
        const utcDate = new Date(Date.UTC(y, m - 1, d, h, min || 0));
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: zone.iana,
          timeZoneName: "longOffset",
          year: "numeric", month: "numeric", day: "numeric",
          hour: "numeric", minute: "numeric",
        });
        const parts = formatter.formatToParts(utcDate);
        const tzPart = parts.find(p => p.type === "timeZoneName");
        if (tzPart) {
          const tzStr = tzPart.value;
          if (tzStr === "GMT" || tzStr === "UTC") return { iana: zone.iana, offsetMinutes: 0 };
          const match = tzStr.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
          if (match) {
            const sign = match[1] === "-" ? -1 : 1;
            const hours = parseInt(match[2]);
            const minutes = parseInt(match[3] || "0");
            return { iana: zone.iana, offsetMinutes: sign * (hours * 60 + minutes) };
          }
        }
      } catch {
        // Fall back to static offset
      }
      return { iana: zone.iana, offsetMinutes: zone.offsetMinutes };
    }
  }
  return null;
}

async function resolveTimezoneServerSide(lat: number, lng: number, dateStr: string, timeStr: string): Promise<{ iana: string; offsetMinutes: number }> {
  // Try timeapi.io first
  try {
    const res = await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`);
    if (res.ok) {
      const data = await res.json();
      const ianaName = data.timeZone;
      if (ianaName) {
        // Use Intl for exact historical offset
        try {
          const [y, m, d] = dateStr.split("-").map(Number);
          const [h, min] = timeStr.split(":").map(Number);
          const utcDate = new Date(Date.UTC(y, m - 1, d, h, min || 0));
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: ianaName,
            timeZoneName: "longOffset",
            year: "numeric", month: "numeric", day: "numeric",
            hour: "numeric", minute: "numeric",
          });
          const parts = formatter.formatToParts(utcDate);
          const tzPart = parts.find(p => p.type === "timeZoneName");
          if (tzPart) {
            const tzStr = tzPart.value;
            if (tzStr === "GMT" || tzStr === "UTC") return { iana: ianaName, offsetMinutes: 0 };
            const match = tzStr.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
            if (match) {
              const sign = match[1] === "-" ? -1 : 1;
              const hours = parseInt(match[2]);
              const minutes = parseInt(match[3] || "0");
              console.log(`Timezone API resolved: ${ianaName} → ${sign * (hours * 60 + minutes)} min`);
              return { iana: ianaName, offsetMinutes: sign * (hours * 60 + minutes) };
            }
          }
        } catch { /* fall through to offset parsing */ }
        
        // Fallback: parse offset from API response
        const offsetStr = data.standardUtcOffset?.toString() || data.currentUtcOffset?.toString();
        if (offsetStr) {
          const match = offsetStr.match(/^([+-]?)(\d{2}):(\d{2})/);
          if (match) {
            const sign = match[1] === "-" ? -1 : 1;
            const offset = sign * (parseInt(match[2]) * 60 + parseInt(match[3]));
            return { iana: ianaName, offsetMinutes: offset };
          }
        }
      }
    }
  } catch {
    console.warn("timeapi.io failed, using geographic fallback");
  }

  // Fallback: geographic boundary map
  const geoResult = resolveTimezoneFromCoords(lat, lng, dateStr, timeStr);
  if (geoResult) {
    console.log(`Geographic fallback: ${geoResult.iana} → ${geoResult.offsetMinutes} min`);
    return geoResult;
  }

  // Last resort: LMT from longitude
  const lmtMinutes = Math.round(lng / 15 * 60);
  console.warn(`All timezone methods failed, using LMT: ${lmtMinutes} min for lng=${lng}`);
  return { iana: "LMT", offsetMinutes: lmtMinutes };
}

// ─── Ashtakavarga (BAV + SAV) ───
// Parashari benefic point rules. For each contributor (Sun..Saturn + Lagna),
// list the houses (1..12, counted from the contributor) that get a bindu (benefic point)
// for each beneficiary planet. Standard Brihat Parashara Hora Shastra tables.
const ASHTAKAVARGA_RULES: Record<string, Record<string, number[]>> = {
  Sun: {
    Sun:     [1,2,4,7,8,9,10,11],
    Moon:    [3,6,10,11],
    Mars:    [1,2,4,7,8,9,10,11],
    Mercury: [3,5,6,9,10,11,12],
    Jupiter: [5,6,9,11],
    Venus:   [6,7,12],
    Saturn:  [1,2,4,7,8,9,10,11],
    Lagna:   [3,4,6,10,11,12],
  },
  Moon: {
    Sun:     [3,6,7,8,10,11],
    Moon:    [1,3,6,7,9,10,11],
    Mars:    [2,3,5,6,9,10,11],
    Mercury: [1,3,4,5,7,8,10,11],
    Jupiter: [1,4,7,8,10,11,12],
    Venus:   [3,4,5,7,9,10,11],
    Saturn:  [3,5,6,11],
    Lagna:   [3,6,10,11],
  },
  Mars: {
    Sun:     [3,5,6,10,11],
    Moon:    [3,6,11],
    Mars:    [1,2,4,7,8,10,11],
    Mercury: [3,5,6,11],
    Jupiter: [6,10,11,12],
    Venus:   [6,8,11,12],
    Saturn:  [1,4,7,8,9,10,11],
    Lagna:   [1,3,6,10,11],
  },
  Mercury: {
    Sun:     [5,6,9,11,12],
    Moon:    [2,4,6,8,10,11],
    Mars:    [1,2,4,7,8,9,10,11],
    Mercury: [1,3,5,6,9,10,11,12],
    Jupiter: [6,8,11,12],
    Venus:   [1,2,3,4,5,8,9,11],
    Saturn:  [1,2,4,7,8,9,10,11],
    Lagna:   [1,2,4,6,8,10,11],
  },
  Jupiter: {
    Sun:     [1,2,3,4,7,8,9,10,11],
    Moon:    [2,5,7,9,11],
    Mars:    [1,2,4,7,8,10,11],
    Mercury: [1,2,4,5,6,9,10,11],
    Jupiter: [1,2,3,4,7,8,10,11],
    Venus:   [2,5,6,9,10,11],
    Saturn:  [3,5,6,12],
    Lagna:   [1,2,4,5,6,7,9,10,11],
  },
  Venus: {
    Sun:     [8,11,12],
    Moon:    [1,2,3,4,5,8,9,11,12],
    Mars:    [3,5,6,9,11,12],
    Mercury: [3,5,6,9,11],
    Jupiter: [5,8,9,10,11],
    Venus:   [1,2,3,4,5,8,9,10,11],
    Saturn:  [3,4,5,8,9,10,11],
    Lagna:   [1,2,3,4,5,8,9,11],
  },
  Saturn: {
    Sun:     [1,2,4,7,8,10,11],
    Moon:    [3,6,11],
    Mars:    [3,5,6,10,11,12],
    Mercury: [6,8,9,10,11,12],
    Jupiter: [5,6,11,12],
    Venus:   [6,11,12],
    Saturn:  [3,5,6,11],
    Lagna:   [1,3,4,6,10,11],
  },
};

interface AshtakavargaResult {
  bav: Record<string, number[]>; // planet -> 12 bindus (per sign, Aries..Pisces)
  sav: number[];                  // 12 bindus (per sign)
  bindus_in_house: number[];      // 12 bindus from Lagna (house 1..12)
}

function computeAshtakavarga(planets: PlanetPos[], ascSign: string): AshtakavargaResult {
  const positions: Record<string, number> = {};
  for (const p of planets) {
    if (["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"].includes(p.name)) {
      positions[p.name] = signToIndex(p.sign); // 0..11
    }
  }
  const lagnaIdx = signToIndex(ascSign);

  const bav: Record<string, number[]> = {};

  for (const beneficiary of ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]) {
    const bindus = new Array(12).fill(0);
    const rules = ASHTAKAVARGA_RULES[beneficiary];
    for (const contributor of ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Lagna"]) {
      const fromIdx = contributor === "Lagna" ? lagnaIdx : positions[contributor];
      if (fromIdx == null) continue;
      const beneficHouses: number[] = rules[contributor] || [];
      for (const h of beneficHouses) {
        const signIdx = (fromIdx + h - 1) % 12;
        bindus[signIdx] += 1;
      }
    }
    bav[beneficiary] = bindus;
  }

  // SAV = sum of all 7 BAVs per sign
  const sav = new Array(12).fill(0);
  for (let i = 0; i < 12; i++) {
    for (const p of ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]) {
      sav[i] += bav[p][i];
    }
  }

  // Re-index by house from Lagna
  const bindus_in_house = new Array(12).fill(0);
  for (let h = 1; h <= 12; h++) {
    const signIdx = (lagnaIdx + h - 1) % 12;
    bindus_in_house[h - 1] = sav[signIdx];
  }

  return { bav, sav, bindus_in_house };
}

// ─── Kakshya (sub-divisions of a sign for transit fine-tuning) ───
// Each 30° sign is split into 8 kakshyas of 3°45' each, ruled in the
// Parashari order: Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon, Lagna.
const KAKSHYA_LORDS = ["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon","Lagna"];

function computeKakshya(degreeInSign: number) {
  const idx = Math.min(7, Math.floor(degreeInSign / 3.75));
  return { index: idx + 1, lord: KAKSHYA_LORDS[idx] };
}

// ─── Vedha (blocking houses for Saturn / Jupiter transit from Moon) ───
// Classical Vedha pairs: when Saturn transits a house from natal Moon,
// a planet in the paired "vedha house" cancels the transit's effect.
const SATURN_VEDHA_PAIRS: Record<number, number> = {
  3: 12, 6: 9, 11: 5, 1: 7, 4: 10, 7: 1, 10: 4, 12: 3, 9: 6, 5: 11, 2: 8, 8: 2,
};
const JUPITER_VEDHA_PAIRS: Record<number, number> = {
  2: 12, 5: 4, 7: 3, 9: 8, 11: 10, 12: 2, 4: 5, 3: 7, 8: 9, 10: 11, 1: 6, 6: 1,
};

function detectVedha(
  transitPlanet: "Saturn" | "Jupiter",
  transitHouseFromMoon: number,
  natalPlanets: PlanetPos[],
  moonSign: string,
): { blocked: boolean; blocker?: string; vedha_house?: number } {
  const pairs = transitPlanet === "Saturn" ? SATURN_VEDHA_PAIRS : JUPITER_VEDHA_PAIRS;
  const vedhaHouse = pairs[transitHouseFromMoon];
  if (!vedhaHouse) return { blocked: false };
  const moonIdx = signToIndex(moonSign);
  const vedhaSign = SIGNS[(moonIdx + vedhaHouse - 1) % 12];
  const blocker = natalPlanets.find(p =>
    p.sign === vedhaSign && !["Sun","Moon",transitPlanet].includes(p.name),
  );
  if (blocker) return { blocked: true, blocker: blocker.name, vedha_house: vedhaHouse };
  return { blocked: false, vedha_house: vedhaHouse };
}

// ─── Main Handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { full_name, date_of_birth, birth_time, birthplace, latitude, longitude, utc_offset_minutes } = await req.json();

    if (!full_name || !date_of_birth || !birth_time || !birthplace || latitude == null || longitude == null) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Server-Side Timezone Resolution ───
    let resolvedTimezone: { iana: string; offsetMinutes: number };
    if (utc_offset_minutes != null) {
      // Manual override from client
      resolvedTimezone = { iana: "Manual Override", offsetMinutes: utc_offset_minutes };
      console.log(`Using manual timezone override: ${utc_offset_minutes} min`);
    } else {
      // Resolve server-side
      resolvedTimezone = await resolveTimezoneServerSide(latitude, longitude, date_of_birth, birth_time);
      console.log(`Server-resolved timezone: ${resolvedTimezone.iana} → ${resolvedTimezone.offsetMinutes} min`);
    }

    // ─── LAYER 1: Swiss Ephemeris Computation ───
    console.log(`Computing chart via Swiss Ephemeris for ${full_name}, ${date_of_birth} ${birth_time} at ${latitude},${longitude}, timezone=${resolvedTimezone.iana} (${resolvedTimezone.offsetMinutes}min)`);
    const ephResult = await computeChartFromEphemeris(date_of_birth, birth_time, latitude, longitude, resolvedTimezone.offsetMinutes);

    const ascSign = ephResult.ascendant.sign;
    const birthHour = parseInt(birth_time.split(":")[0]) || 12;

    // ─── LAYER 2: Deterministic Chart Math ───
    const correctedPlanets = ephResult.planets.map((p) => {
      const totalDeg = p.longitude;
      const nak = getNakshatraFromDegree(totalDeg);
      const house = getHouseFromSign(p.sign, ascSign);
      const dignity = determineDignity(p.name, p.sign);

      // D9 Navamsa
      const navamsa_sign = computeNavamsaSign(p.sign, p.degree);
      const is_vargottama = p.sign === navamsa_sign;

      // D7, D10, D12
      const d7_sign = computeD7Sign(p.sign, p.degree);
      const d10_sign = computeD10Sign(p.sign, p.degree);
      const d12_sign = computeD12Sign(p.sign, p.degree);

      // Phase 3: 11 additional Shodashavarga divisions
      const d2_sign = computeD2Sign(p.sign, p.degree);
      const d3_sign = computeD3Sign(p.sign, p.degree);
      const d4_sign = computeD4Sign(p.sign, p.degree);
      const d16_sign = computeD16Sign(p.sign, p.degree);
      const d20_sign = computeD20Sign(p.sign, p.degree);
      const d24_sign = computeD24Sign(p.sign, p.degree);
      const d27_sign = computeD27Sign(p.sign, p.degree);
      const d30_sign = computeD30Sign(p.sign, p.degree);
      const d40_sign = computeD40Sign(p.sign, p.degree);
      const d45_sign = computeD45Sign(p.sign, p.degree);
      const d60_sign = computeD60Sign(p.sign, p.degree);

      // Vimshopaka Bala + Vargottama count across all 16 vargas
      const allVargaSigns: Record<string, string> = {
        d1: p.sign, d2: d2_sign, d3: d3_sign, d4: d4_sign, d7: d7_sign,
        d9: navamsa_sign, d10: d10_sign, d12: d12_sign, d16: d16_sign,
        d20: d20_sign, d24: d24_sign, d27: d27_sign, d30: d30_sign,
        d40: d40_sign, d45: d45_sign, d60: d60_sign,
      };
      const vimshopaka = (p.name === "Rahu" || p.name === "Ketu")
        ? { score: 0, max: 20 }
        : computeVimshopakaBala(p.name, allVargaSigns);
      const vargottama_count = computeVargottamaCount(p.sign, allVargaSigns);

      return {
        name: p.name,
        sign: p.sign,
        degree: p.degree,
        dms: toDMS(p.degree),
        house,
        dignity,
        nakshatra: nak.name,
        nakshatra_pada: nak.pada,
        is_retrograde: p.is_retrograde,
        totalDegree: totalDeg,
        speed: p.speed,
        latitude: p.latitude,
        aspects: parashariAspects(p.name, house),
        navamsa_sign,
        is_vargottama,
        d7_sign,
        d10_sign,
        d12_sign,
        // Phase 3 fields
        d2_sign, d3_sign, d4_sign, d16_sign, d20_sign, d24_sign,
        d27_sign, d30_sign, d40_sign, d45_sign, d60_sign,
        vimshopaka_score: vimshopaka.score,
        vimshopaka_max: vimshopaka.max,
        vargottama_count,
      };
    });

    // Build PlanetPos array for downstream functions
    const planetPositions: PlanetPos[] = correctedPlanets.map((p) => ({
      name: p.name, sign: p.sign, degree: p.degree, house: p.house,
      dignity: p.dignity, is_retrograde: p.is_retrograde, totalDegree: p.totalDegree,
      speed: p.speed, latitude: p.latitude,
    }));

    // Combustion detection
    const combustion = detectCombustion(planetPositions);
    for (const c of combustion) {
      const cp = correctedPlanets.find(p => p.name === c.name);
      if (cp) (cp as any).is_combust = true;
    }

    // Planetary War
    const graha_yuddha = detectPlanetaryWar(planetPositions);

    // Shadbala
    for (const p of correctedPlanets) {
      const pos = planetPositions.find(pp => pp.name === p.name)!;
      (p as any).strength = computeShadbala(pos, birthHour, planetPositions);
    }

    // ─── LAYER 2 continued: Birth Nakshatra ───
    const moonPlanet = correctedPlanets.find(p => p.name === "Moon");
    const moonTotalDeg = moonPlanet ? moonPlanet.totalDegree : 0;
    const birthNak = getNakshatraFromDegree(moonTotalDeg);

    // Fetch nakshatra DB data for deity info
    const { data: nakDBData } = await supabase
      .from("nakshatras")
      .select("name, deity")
      .eq("name", birthNak.name)
      .maybeSingle();

    const birth_nakshatra = {
      name: birthNak.name,
      pada: birthNak.pada,
      ruling_planet: birthNak.ruler,
      deity: nakDBData?.deity || "",
    };

    // ─── LAYER 4: Dasha Systems ───
    const dasha = computeVimshottariDasha(moonTotalDeg, date_of_birth);
    const yogini_dasha = computeYoginiDasha(moonTotalDeg, date_of_birth);
    const ashtottari_dasha = computeAshtottariDasha(moonTotalDeg, date_of_birth);
    const chara_dasha = computeCharaDasha(ascSign, date_of_birth);

    // Dasha balance at birth (Vimshottari) — for "Xy Xm Xd" display
    const moonNakSpan = 13.333;
    const moonNak = getNakshatraFromDegree(moonTotalDeg);
    const moonNakStart = NAKSHATRA_DATA.find(n => n.name === moonNak.name)!.start;
    const elapsedFrac = (moonTotalDeg - moonNakStart) / moonNakSpan;
    const balanceYears = (1 - elapsedFrac) * (DASHA_YEARS[moonNak.ruler] ?? 0);
    (dasha as any).balance_years = Math.round(balanceYears * 1000) / 1000;
    (dasha as any).balance_str = yearsToDHMS(balanceYears);
    (dasha as any).birth_dasha_lord = moonNak.ruler;

    // ─── LAYER 6: Yoga Detection ───
    const active_yogas = detectYogas(planetPositions, ascSign);

    // ─── Ascendant enrichment ───
    const ascTotalDeg = ephResult.ascendant.longitude;
    const ascNak = getNakshatraFromDegree(ascTotalDeg);
    const ascNavamsa = computeNavamsaSign(ascSign, ephResult.ascendant.degree);

    // ─── Mangal Dosha ───
    const mangal_dosha = detectMangalDosha(planetPositions, ascSign);

    // ─── LAYER 3: Varga Charts ───
    const navamsa = {
      ascendant: ascNavamsa,
      planets: correctedPlanets.map(p => ({ name: p.name, navamsa_sign: p.navamsa_sign, is_vargottama: p.is_vargottama })),
    };

    const vargas = {
      d7: correctedPlanets.map(p => ({ name: p.name, sign: p.d7_sign })),
      d10: correctedPlanets.map(p => ({ name: p.name, sign: p.d10_sign })),
      d12: correctedPlanets.map(p => ({ name: p.name, sign: p.d12_sign })),
    };

    // Phase 3: Full Shodashavarga (16 divisional charts)
    const vargas_full = {
      d1:  correctedPlanets.map(p => ({ name: p.name, sign: p.sign })),
      d2:  correctedPlanets.map(p => ({ name: p.name, sign: (p as any).d2_sign })),
      d3:  correctedPlanets.map(p => ({ name: p.name, sign: (p as any).d3_sign })),
      d4:  correctedPlanets.map(p => ({ name: p.name, sign: (p as any).d4_sign })),
      d7:  correctedPlanets.map(p => ({ name: p.name, sign: p.d7_sign })),
      d9:  correctedPlanets.map(p => ({ name: p.name, sign: p.navamsa_sign, is_vargottama: p.is_vargottama })),
      d10: correctedPlanets.map(p => ({ name: p.name, sign: p.d10_sign })),
      d12: correctedPlanets.map(p => ({ name: p.name, sign: p.d12_sign })),
      d16: correctedPlanets.map(p => ({ name: p.name, sign: (p as any).d16_sign })),
      d20: correctedPlanets.map(p => ({ name: p.name, sign: (p as any).d20_sign })),
      d24: correctedPlanets.map(p => ({ name: p.name, sign: (p as any).d24_sign })),
      d27: correctedPlanets.map(p => ({ name: p.name, sign: (p as any).d27_sign })),
      d30: correctedPlanets.map(p => ({ name: p.name, sign: (p as any).d30_sign })),
      d40: correctedPlanets.map(p => ({ name: p.name, sign: (p as any).d40_sign })),
      d45: correctedPlanets.map(p => ({ name: p.name, sign: (p as any).d45_sign })),
      d60: correctedPlanets.map(p => ({ name: p.name, sign: (p as any).d60_sign })),
    };

    const vimshopaka = correctedPlanets.map(p => ({
      name: p.name,
      score: (p as any).vimshopaka_score ?? 0,
      max: (p as any).vimshopaka_max ?? 20,
      vargottama_count: (p as any).vargottama_count ?? 0,
    }));

    // ─── LAYER 7: Life Area Scores ───
    const life_scores = computeLifeScores(planetPositions, ascSign, active_yogas);

    // ─── Ashtakavarga (BAV + SAV) ───
    const ashtakavarga = computeAshtakavarga(planetPositions, ascSign);

    // ─── Panchanga (Tithi, Nakshatra, Yoga, Karana, Masa, Vara) ───
    const sunPlanet = correctedPlanets.find(p => p.name === "Sun");
    const sunTotalDeg = sunPlanet ? (sunPlanet as any).totalDegree ?? 0 : 0;
    const panchanga = computePanchanga(sunTotalDeg, moonTotalDeg, date_of_birth);

    // ─── Build Chart Data ───
    const offsetSign = resolvedTimezone.offsetMinutes >= 0 ? "+" : "-";
    const absOffset = Math.abs(resolvedTimezone.offsetMinutes);
    const offsetLabel = `UTC${offsetSign}${Math.floor(absOffset / 60)}:${String(absOffset % 60).padStart(2, "0")}`;
    
    const chartData = {
      engine: "swiss_ephemeris",
      timezone_used: {
        iana: resolvedTimezone.iana,
        offset_minutes: resolvedTimezone.offsetMinutes,
        label: `${resolvedTimezone.iana} (${offsetLabel})`,
      },
      ascendant: {
        sign: ascSign,
        degree: ephResult.ascendant.degree,
        dms: toDMS(ephResult.ascendant.degree),
        nakshatra: ascNak.name,
        nakshatra_pada: ascNak.pada,
        navamsa_sign: ascNavamsa,
      },
      planets: correctedPlanets,
      birth_nakshatra,
      moon_sign: moonPlanet?.sign || "",
      sun_sign: correctedPlanets.find(p => p.name === "Sun")?.sign || "",
      active_yogas,
      dasha,
      yogini_dasha,
      ashtottari_dasha,
      chara_dasha,
      mangal_dosha,
      navamsa,
      vargas,
      vargas_full,
      vimshopaka,
      combustion,
      graha_yuddha,
      life_scores,
      ashtakavarga,
      panchanga,
    } as any;

    // ─── LLM-ready ASCII summary (citation-grade) ───
    chartData.llm_summary = buildLlmSummary(chartData);

    // Save to database
    const { data: chart, error: insertError } = await supabase
      .from("birth_charts")
      .insert({
        user_id: user.id,
        full_name,
        date_of_birth,
        birth_time,
        birthplace,
        latitude,
        longitude,
        chart_data: chartData,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save chart");
    }

    return new Response(JSON.stringify(chart), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-chart error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
