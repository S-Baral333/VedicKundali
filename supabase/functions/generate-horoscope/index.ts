import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Body, EclipticLongitude, MakeTime, GeoVector, Ecliptic } from "https://esm.sh/astronomy-engine@2.1.19";
import {
  loadGuruBundle,
  assembleGuruSystemPrompt,
  assembleGuruWritingRules,
  GURU_EXTRA_JSON,
  COMMON_EXTRA_JSON,
} from "../_shared/guru.ts";
import { normalizeLanguage, buildLanguageInstruction } from "../_shared/languages.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

// ─── Lahiri Ayanamsa ───
function lahiriAyanamsa(jd: number): number {
  const yearsFrom2000 = (jd - 2451545.0) / 365.25;
  return 23.8531 + 0.013925 * yearsFrom2000;
}

function julianDay(year: number, month: number, day: number, utHour: number): number {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + utHour / 24 + B - 1524.5;
}

function meanLunarNode(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000.0;
  return ((omega % 360) + 360) % 360;
}

const BODY_MAP = [
  { name: "Sun", body: Body.Sun },
  { name: "Moon", body: Body.Moon },
  { name: "Mercury", body: Body.Mercury },
  { name: "Venus", body: Body.Venus },
  { name: "Mars", body: Body.Mars },
  { name: "Jupiter", body: Body.Jupiter },
  { name: "Saturn", body: Body.Saturn },
];

interface TransitPlanet {
  name: string;
  sign: string;
  degree: number;
  longitude: number;
  is_retrograde: boolean;
}

function computeTransits(dateStr: string): TransitPlanet[] {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const jd = julianDay(year, month, day, 12.0);
  const ayanamsa = lahiriAyanamsa(jd);
  const time1 = MakeTime(utDate);
  const time2 = MakeTime(new Date(utDate.getTime() + 86400000));

  const transits: TransitPlanet[] = [];

  for (const pl of BODY_MAP) {
    let tropLng: number, tropLng2: number;
    if (pl.name === "Sun" || pl.name === "Moon") {
      tropLng = Ecliptic(GeoVector(pl.body, time1, true)).elon;
      tropLng2 = Ecliptic(GeoVector(pl.body, time2, true)).elon;
    } else {
      tropLng = EclipticLongitude(pl.body, time1);
      tropLng2 = EclipticLongitude(pl.body, time2);
    }
    const siderealLng = ((tropLng - ayanamsa) % 360 + 360) % 360;
    const speed = ((tropLng2 - tropLng + 540) % 360) - 180;
    transits.push({
      name: pl.name,
      sign: SIGNS[Math.floor(siderealLng / 30)],
      degree: Math.round((siderealLng % 30) * 100) / 100,
      longitude: siderealLng,
      is_retrograde: speed < 0,
    });
  }

  const rahuTropical = meanLunarNode(jd);
  const rahuLng = ((rahuTropical - ayanamsa) % 360 + 360) % 360;
  transits.push({ name: "Rahu", sign: SIGNS[Math.floor(rahuLng / 30)], degree: Math.round((rahuLng % 30) * 100) / 100, longitude: rahuLng, is_retrograde: true });
  const ketuLng = (rahuLng + 180) % 360;
  transits.push({ name: "Ketu", sign: SIGNS[Math.floor(ketuLng / 30)], degree: Math.round((ketuLng % 30) * 100) / 100, longitude: ketuLng, is_retrograde: true });

  return transits;
}

// ─── Transit-to-Natal Aspects ───

function signToIndex(sign: string): number {
  return SIGNS.indexOf(sign);
}

function computeTransitAspects(transits: TransitPlanet[], natalMoonSign: string, natalPlanets: any[]): {
  transitContext: string;
  sadeSati: { active: boolean; phase: string };
  aspects: { transit: string; natal: string; aspect: string; }[];
} {
  const aspects: { transit: string; natal: string; aspect: string }[] = [];
  const moonIdx = signToIndex(natalMoonSign);

  for (const tp of transits) {
    const tpIdx = signToIndex(tp.sign);
    for (const np of (natalPlanets || [])) {
      const npIdx = signToIndex(np.sign);
      const dist = ((tpIdx - npIdx + 12) % 12);
      if (dist === 0) aspects.push({ transit: tp.name, natal: np.name, aspect: "conjunction" });
      else if (dist === 4 || dist === 8) aspects.push({ transit: tp.name, natal: np.name, aspect: "trine" });
      else if (dist === 3 || dist === 9) aspects.push({ transit: tp.name, natal: np.name, aspect: "square" });
      else if (dist === 6) aspects.push({ transit: tp.name, natal: np.name, aspect: "opposition" });
    }
  }

  const saturn = transits.find(t => t.name === "Saturn");
  const saturnIdx = saturn ? signToIndex(saturn.sign) : -1;
  let sadeSati = { active: false, phase: "" };
  if (saturnIdx >= 0 && moonIdx >= 0) {
    const dist = ((saturnIdx - moonIdx + 12) % 12);
    if (dist === 11) sadeSati = { active: true, phase: "Rising (12th from Moon)" };
    else if (dist === 0) sadeSati = { active: true, phase: "Peak (over Moon)" };
    else if (dist === 1) sadeSati = { active: true, phase: "Setting (2nd from Moon)" };
  }

  const lines = transits.map(t =>
    `- ${t.name}: ${t.sign} ${t.degree.toFixed(1)}°${t.is_retrograde ? " (R)" : ""}`
  );

  const keyAspects = aspects.filter(a =>
    ["Jupiter","Saturn","Rahu","Ketu"].includes(a.transit) ||
    ["Moon","Sun","Jupiter"].includes(a.natal)
  ).slice(0, 10);

  let transitContext = `Current planetary transits (Swiss Ephemeris, sidereal/Lahiri):\n${lines.join("\n")}`;

  if (keyAspects.length > 0) {
    transitContext += `\n\nKey transit aspects to natal chart:\n`;
    transitContext += keyAspects.map(a => `- Transit ${a.transit} ${a.aspect} natal ${a.natal}`).join("\n");
  }

  if (sadeSati.active) {
    transitContext += `\n\n⚠️ SADE SATI ACTIVE: ${sadeSati.phase}. Saturn is transiting ${saturn?.sign}, relative to natal Moon in ${natalMoonSign}.`;
  }

  return { transitContext, sadeSati, aspects: keyAspects };
}

// ─── Tithi & Paksha computation ───
const TITHI_NAMES = [
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami",
  "Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima",
  "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami",
  "Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Amavasya"
];
const TITHI_MEANINGS: Record<string, string> = {
  "Pratipada": "a fresh start — gentle beginnings favoured",
  "Dwitiya": "build connections — easy days for talking and reaching out",
  "Tritiya": "creative spark — arts, beauty, sweet conversations",
  "Chaturthi": "obstacles soften when you slow down and think first",
  "Panchami": "learning, healing and listening flow easily today",
  "Shashthi": "courage day — face what's been waiting",
  "Saptami": "a building day — push initiatives forward",
  "Ashtami": "intense, transformative — strong feelings near the surface",
  "Navami": "victory through patience — finish what's started",
  "Dashami": "stable, grounded — official matters favoured",
  "Ekadashi": "fasting day — light food, deep reflection",
  "Dwadashi": "release and forgive — let something old go",
  "Trayodashi": "passionate, romantic, slightly volatile",
  "Chaturdashi": "the veil thins — dreams and intuition heightened",
  "Purnima": "fullness — completion, celebration, big feelings",
  "Amavasya": "darkness rests — rest, ancestor reverence, no big launches"
};
function computeTithiAndPaksha(transits: TransitPlanet[]): { tithi: string; paksha: string; meaning: string } {
  const sun = transits.find(t => t.name === "Sun");
  const moon = transits.find(t => t.name === "Moon");
  if (!sun || !moon) return { tithi: "Pratipada", paksha: "Shukla", meaning: TITHI_MEANINGS["Pratipada"] };
  const diff = ((moon.longitude - sun.longitude) % 360 + 360) % 360;
  const tithiIdx = Math.floor(diff / 12);
  const paksha = tithiIdx < 15 ? "Shukla" : "Krishna";
  const tithi = TITHI_NAMES[tithiIdx] || "Pratipada";
  return { tithi, paksha, meaning: TITHI_MEANINGS[tithi] || "a quiet day in the lunar cycle" };
}

const NAK_NAMES_27 = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const NAK_DEITIES: Record<string, { deity: string; symbol: string }> = {
  "Ashwini": { deity: "Ashwini Kumaras (twin healers)", symbol: "horse's head" },
  "Bharani": { deity: "Yama (lord of restraint)", symbol: "yoni" },
  "Krittika": { deity: "Agni (sacred fire)", symbol: "razor / flame" },
  "Rohini": { deity: "Brahma (the creator)", symbol: "ox cart" },
  "Mrigashira": { deity: "Soma (the moon nectar)", symbol: "deer's head" },
  "Ardra": { deity: "Rudra (the storm)", symbol: "teardrop" },
  "Punarvasu": { deity: "Aditi (mother of light)", symbol: "quiver of arrows" },
  "Pushya": { deity: "Brihaspati (Jupiter, the guru)", symbol: "lotus / cow udder" },
  "Ashlesha": { deity: "Sarpas (the serpents)", symbol: "coiled snake" },
  "Magha": { deity: "Pitris (the ancestors)", symbol: "royal throne" },
  "Purva Phalguni": { deity: "Bhaga (delight)", symbol: "front legs of a bed" },
  "Uttara Phalguni": { deity: "Aryaman (patron of contracts)", symbol: "back legs of a bed" },
  "Hasta": { deity: "Savitr (the inspirer)", symbol: "open palm" },
  "Chitra": { deity: "Vishvakarma (cosmic architect)", symbol: "bright jewel" },
  "Swati": { deity: "Vayu (the wind)", symbol: "young shoot in the breeze" },
  "Vishakha": { deity: "Indra & Agni", symbol: "triumphal archway" },
  "Anuradha": { deity: "Mitra (friendship)", symbol: "lotus garland" },
  "Jyeshtha": { deity: "Indra (the king)", symbol: "earring / umbrella" },
  "Mula": { deity: "Nirriti (dissolution)", symbol: "tied roots" },
  "Purva Ashadha": { deity: "Apas (the waters)", symbol: "fan / winnowing basket" },
  "Uttara Ashadha": { deity: "Vishvedevas (the universal gods)", symbol: "elephant tusk" },
  "Shravana": { deity: "Vishnu (the preserver)", symbol: "ear / three footprints" },
  "Dhanishta": { deity: "Eight Vasus", symbol: "drum" },
  "Shatabhisha": { deity: "Varuna (cosmic waters)", symbol: "empty circle / 100 healers" },
  "Purva Bhadrapada": { deity: "Aja Ekapada (one-footed serpent)", symbol: "front of a funeral cot" },
  "Uttara Bhadrapada": { deity: "Ahir Budhnya (serpent of the deep)", symbol: "back of a funeral cot" },
  "Revati": { deity: "Pushan (the nourisher)", symbol: "fish swimming home" }
};
function computeNakshatraOfDay(transits: TransitPlanet[]): { name: string; deity: string; symbol: string } {
  const moon = transits.find(t => t.name === "Moon");
  if (!moon) return { name: "Ashwini", ...NAK_DEITIES["Ashwini"] };
  const moonAbsLng = (SIGNS.indexOf(moon.sign) * 30 + moon.degree) % 360;
  const idx = Math.floor(moonAbsLng / (360 / 27)) % 27;
  const name = NAK_NAMES_27[idx];
  return { name, ...(NAK_DEITIES[name] || { deity: "—", symbol: "—" }) };
}

// ─── Mood + Voice rotation ───
type Mood = "solar" | "lunar" | "fiery" | "mystic" | "earthen";
type Voice = "elder" | "best_friend" | "poetic_mystic" | "stern" | "storyteller" | "encourager";

function pickMood(transits: TransitPlanet[], tithi: string): Mood {
  // Sandhi tithis (boundary) → mystic
  if (["Amavasya","Purnima","Chaturdashi"].includes(tithi)) return "mystic";
  const moon = transits.find(t => t.name === "Moon");
  const sun = transits.find(t => t.name === "Sun");
  const mars = transits.find(t => t.name === "Mars");
  const merc = transits.find(t => t.name === "Mercury");
  const venus = transits.find(t => t.name === "Venus");
  const rahu = transits.find(t => t.name === "Rahu");
  // Mars in fire signs or angular to Sun → fiery
  if (mars && ["Aries","Leo","Scorpio"].includes(mars.sign)) return "fiery";
  // Rahu/Ketu nakshatra emphasis or Moon void-ish → mystic
  if (rahu && moon && ((SIGNS.indexOf(rahu.sign) - SIGNS.indexOf(moon.sign) + 12) % 12) <= 1) return "mystic";
  // Mercury+Venus easy signs → earthen
  if (merc && venus && ["Taurus","Virgo","Libra","Capricorn"].includes(merc.sign)) return "earthen";
  // Moon-emphasis: in Cancer/Pisces → lunar
  if (moon && ["Cancer","Pisces","Scorpio"].includes(moon.sign)) return "lunar";
  // Default solar
  return "solar";
}

function pickVoice(dateStr: string, userIdSeed: string): Voice {
  const voices: Voice[] = ["elder","best_friend","poetic_mystic","stern","storyteller","encourager"];
  const day = new Date(dateStr + "T00:00:00Z");
  const dayOfYear = Math.floor((day.getTime() - new Date(Date.UTC(day.getUTCFullYear(),0,1)).getTime()) / 86400000);
  let seed = dayOfYear;
  for (const ch of (userIdSeed || "").slice(0, 6)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return voices[seed % voices.length];
}

const VOICE_PROMPTS: Record<Voice, { label: string; instruction: string }> = {
  elder: {
    label: "The Wise Elder",
    instruction: "Write like a warm, wise grandmother. Encouraging, grounded, never clinical. Reassuring rhythm."
  },
  best_friend: {
    label: "The Cosmic Best Friend",
    instruction: "Write like a casual, playful best friend who happens to know astrology. Use phrases like 'okay so listen…', 'real talk', 'here's the thing'. Warm, slightly funny, never silly. Sentence fragments allowed."
  },
  poetic_mystic: {
    label: "The Poetic Mystic",
    instruction: "Write in short, lyrical sentences. Heavy on imagery, light on explanation. Each line should land like a small bell. Almost like prose-poetry. Use natural metaphors (river, smoke, stars, river-stones)."
  },
  stern: {
    label: "The Stern Astrologer",
    instruction: "Write direct, no-fluff sentences. Use imperatives: 'do this', 'avoid that', 'wait until evening'. Authoritative but never harsh. Short paragraphs."
  },
  storyteller: {
    label: "The Storyteller",
    instruction: "Open every section with a tiny vignette or scene ('Imagine you're standing at a river…', 'Picture a door, half-open…'). Then connect that scene to the day's energy. Cinematic, sensory, warm."
  },
  encourager: {
    label: "The Encourager",
    instruction: "Pep-talk energy. Lead with what's working in their favour. Frame challenges as opportunities. Use words like 'momentum', 'edge', 'win', 'leaning in'. Never cheesy — confident."
  }
};

// ─── Period Helpers ───

type Period = "daily" | "tomorrow" | "weekly" | "monthly" | "yearly";

function computeValidDate(today: string, period: Period): string {
  const d = new Date(today + "T00:00:00Z");
  if (period === "daily") return today;
  if (period === "tomorrow") {
    const tmrw = new Date(d);
    tmrw.setUTCDate(tmrw.getUTCDate() + 1);
    return tmrw.toISOString().slice(0, 10);
  }
  if (period === "weekly") {
    const day = d.getUTCDay();
    const diff = day === 0 ? 6 : day - 1; // Monday
    d.setUTCDate(d.getUTCDate() - diff);
    return d.toISOString().slice(0, 10);
  }
  if (period === "monthly") {
    return `${today.slice(0, 7)}-01`;
  }
  return `${today.slice(0, 4)}-01-01`;
}

function buildNatalContext(chartData: any): string {
  if (!chartData) return "";
  // Prefer the citation-grade ASCII summary baked into the chart at compute time.
  if (typeof chartData.llm_summary === "string" && chartData.llm_summary.length > 0) {
    return chartData.llm_summary;
  }
  const parts: string[] = [];
  if (chartData.planets?.length) {
    parts.push("NATAL CHART POSITIONS:");
    for (const p of chartData.planets) {
      parts.push(`- ${p.name}: ${p.sign} ${p.dms || (p.degree?.toFixed?.(1) + "°") || "?"} in House ${p.house || "?"}${p.is_retrograde ? " (R)" : ""}${p.is_combust ? " [combust]" : ""}`);
    }
  }
  if (chartData.ascendant?.sign || chartData.ascendant_sign) {
    const a = chartData.ascendant || {};
    parts.push(`\nAscendant (Lagna): ${a.sign || chartData.ascendant_sign} ${a.dms || (a.degree?.toFixed?.(1) + "°") || ""}`);
  }
  if (chartData.active_yogas?.length || chartData.yogas?.length) {
    const ys = chartData.active_yogas || chartData.yogas;
    parts.push(`\nACTIVE YOGAS: ${ys.map((y: any) => y.name || y).join(", ")}`);
  }
  if (chartData.dasha) {
    parts.push(`\nDASHA: ${chartData.dasha.maha_dasha} MD / ${chartData.dasha.antar_dasha} AD / ${chartData.dasha.pratyantar_dasha || "?"} PD${chartData.dasha.balance_str ? ` (birth balance ${chartData.dasha.balance_str})` : ""}`);
  }
  return parts.join("\n");
}

function getPeriodPromptConfig(period: Period) {
  const configs: Record<Period, { model: string; depthInstruction: string; jsonFormat: string }> = {
    daily: {
      model: "claude-haiku-4-5-20251001",
      depthInstruction: "Write a 5-6 sentence flowing narrative telling the story of their day from morning to evening.",
      jsonFormat: `Format as JSON:
{
  "period_theme": "One sentence overarching theme for today",
  "greeting": "A warm, personalized opening line referencing today's cosmic energy",
  "watch_for": "The ONE most important thing to watch for today",
  "guidance": "5-6 sentence flowing narrative telling the story of their day",
  "planetary_story": "2-3 sentence narrative about what the planets are doing today",
  "emotional_forecast": "1-2 sentence emotional/mental energy forecast",
  "energy_level": "high" | "moderate" | "low",
  "best_hours": ["HH:MM-HH:MM"],
  "caution_hours": ["HH:MM-HH:MM"],
  "action_items": ["advice 1", "advice 2", "advice 3"],
  "mantra_of_the_day": "Sanskrit mantra with brief meaning",
  "remedial_tip": "One practical Vedic remedy",
  "lucky_color": "...",
  "lucky_number": N,
  "direction": "...",
  "risk_alerts": ["short risk warning"],
  "opportunity_flags": ["short opportunity"],
  "cosmic_advice": "Closing inspirational line"
}`,
    },
    tomorrow: {
      model: "claude-haiku-4-5-20251001",
      depthInstruction: "Write a 5-6 sentence flowing narrative telling the story of what awaits them TOMORROW, from morning to evening. Use future tense — this is a preview of the next day. Focus on preparation and what to expect.",
      jsonFormat: `Format as JSON:
{
  "period_theme": "One sentence overarching theme for tomorrow",
  "greeting": "A warm, personalized opening line about what tomorrow holds",
  "watch_for": "The ONE most important thing to watch for tomorrow",
  "guidance": "5-6 sentence flowing narrative previewing tomorrow's energy and events",
  "planetary_story": "2-3 sentence narrative about what the planets will be doing tomorrow",
  "emotional_forecast": "1-2 sentence emotional/mental energy forecast for tomorrow",
  "energy_level": "high" | "moderate" | "low",
  "best_hours": ["HH:MM-HH:MM"],
  "caution_hours": ["HH:MM-HH:MM"],
  "action_items": ["preparation advice 1", "advice 2", "advice 3"],
  "mantra_of_the_day": "Sanskrit mantra with brief meaning to prepare with tonight",
  "remedial_tip": "One practical Vedic remedy to do tonight or tomorrow morning",
  "lucky_color": "...",
  "lucky_number": N,
  "direction": "...",
  "risk_alerts": ["short risk warning for tomorrow"],
  "opportunity_flags": ["short opportunity for tomorrow"],
  "cosmic_advice": "Closing inspirational line about tomorrow"
}`,
    },
    weekly: {
      model: "claude-haiku-4-5-20251001",
      depthInstruction: "Write 2-3 detailed paragraphs covering the 7-day arc. Mention key transit ingresses during the week. Highlight the best and most challenging days. Discuss how dasha period interacts with this week's transits.",
      jsonFormat: `Format as JSON:
{
  "period_theme": "The overarching theme for this week in one powerful sentence",
  "greeting": "A warm opening referencing this week's cosmic energy",
  "watch_for": "The single most important thing to watch for this week",
  "guidance": "2-3 detailed paragraphs covering the full 7-day arc from Monday to Sunday, weaving transits and dasha naturally",
  "planetary_story": "3-4 sentence narrative about what the planets are doing this week and key shifts",
  "emotional_forecast": "2-3 sentence emotional/mental arc for the week",
  "energy_level": "high" | "moderate" | "low",
  "best_hours": ["Best day(s): Monday, Thursday"],
  "caution_hours": ["Challenging day(s): Wednesday"],
  "key_dates": [{"date": "YYYY-MM-DD", "description": "What happens and why it matters"}],
  "action_items": ["weekly advice 1", "weekly advice 2", "weekly advice 3"],
  "mantra_of_the_day": "Sanskrit mantra for the week with meaning",
  "remedial_tip": "One practical weekly Vedic remedy or ritual",
  "lucky_color": "...",
  "lucky_number": N,
  "direction": "...",
  "risk_alerts": ["risk for the week"],
  "opportunity_flags": ["opportunity for the week"],
  "cosmic_advice": "Closing wisdom for the week"
}`,
    },
    monthly: {
      model: "claude-sonnet-5",
      depthInstruction: "Write 4-5 detailed paragraphs. Include dasha sub-period context, major transit shifts during the month, key dates for career/love/health. Discuss how each major transit (Saturn, Jupiter, Rahu/Ketu) affects them this month based on their natal positions. Provide a monthly mantra and detailed remedial guidance.",
      jsonFormat: `Format as JSON:
{
  "period_theme": "The overarching theme for this month in one powerful sentence",
  "greeting": "A warm opening referencing this month's cosmic landscape",
  "watch_for": "The single most important thing to watch for this month",
  "guidance": "4-5 detailed paragraphs covering the month's trajectory, weaving transits, dasha, and natal positions into a narrative arc",
  "planetary_story": "4-5 sentence narrative about major planetary movements this month",
  "emotional_forecast": "2-3 sentence emotional/mental arc for the month",
  "energy_level": "high" | "moderate" | "low",
  "key_dates": [{"date": "YYYY-MM-DD", "description": "What happens and why it matters"}],
  "action_items": ["monthly advice 1", "monthly advice 2", "monthly advice 3", "monthly advice 4"],
  "mantra_of_the_day": "Sanskrit mantra for the month with detailed meaning",
  "remedial_tip": "Detailed monthly Vedic remedy: gemstone, ritual, mantra, or practice",
  "lucky_color": "...",
  "lucky_number": N,
  "direction": "...",
  "risk_alerts": ["risk for the month"],
  "opportunity_flags": ["opportunity for the month"],
  "cosmic_advice": "Closing wisdom for the month"
}`,
    },
    yearly: {
      model: "claude-sonnet-5",
      depthInstruction: "Write 6-8 detailed paragraphs. Cover the full dasha trajectory for the year. Discuss major Saturn, Jupiter, and Rahu/Ketu transits and their impact on each life area (career, relationships, health, finances, spirituality). Provide a quarterly breakdown. Include annual themes, turning points, and detailed remedial guidance for the year.",
      jsonFormat: `Format as JSON:
{
  "period_theme": "The overarching theme for this year in one powerful sentence",
  "greeting": "A warm opening referencing this year's cosmic landscape",
  "watch_for": "The single most important thing to watch for this year",
  "guidance": "6-8 detailed paragraphs covering the full year trajectory, dasha periods, major transits, and their impact on all life areas",
  "planetary_story": "5-6 sentence overview of all major planetary movements this year",
  "emotional_forecast": "3-4 sentence emotional/spiritual growth arc for the year",
  "energy_level": "high" | "moderate" | "low",
  "key_dates": [{"date": "YYYY-MM-DD", "description": "What happens and why it matters"}],
  "quarterly_overview": [
    {"quarter": "Q1 (Jan-Mar)", "theme": "Quarter theme", "guidance": "2-3 sentence guidance for this quarter"},
    {"quarter": "Q2 (Apr-Jun)", "theme": "Quarter theme", "guidance": "2-3 sentence guidance"},
    {"quarter": "Q3 (Jul-Sep)", "theme": "Quarter theme", "guidance": "2-3 sentence guidance"},
    {"quarter": "Q4 (Oct-Dec)", "theme": "Quarter theme", "guidance": "2-3 sentence guidance"}
  ],
  "action_items": ["yearly advice 1", "yearly advice 2", "yearly advice 3", "yearly advice 4", "yearly advice 5"],
  "mantra_of_the_day": "Primary Sanskrit mantra for the year with detailed meaning and practice instructions",
  "remedial_tip": "Comprehensive yearly Vedic remedial plan: gemstones, rituals, mantras, lifestyle adjustments",
  "lucky_color": "...",
  "lucky_number": N,
  "direction": "...",
  "risk_alerts": ["major risk for the year"],
  "opportunity_flags": ["major opportunity for the year"],
  "cosmic_advice": "Closing wisdom and blessing for the year"
}`,
    },
  };
  return configs[period];
}

// ─── Main Handler ───

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    let localDate: string | undefined;
    let period: Period = "daily";
    let chartIdFromBody: string | null = null;
    let language: string = "en";
    try {
      const body = await req.json();
      localDate = body?.local_date;
      if (["daily","tomorrow","weekly","monthly","yearly"].includes(body?.period)) {
        period = body.period as Period;
      }
      if (body?.chart_id) chartIdFromBody = body.chart_id as string;
      language = normalizeLanguage(body?.language);
    } catch { /* no body */ }
    const today = localDate || new Date().toISOString().slice(0, 10);
    const validDate = computeValidDate(today, period);

    // Resolve chart: explicit chart_id > primary > most recent
    const profileResP = supabase.from("profiles").select("onboarding_preferences, rishi_guru_enabled").eq("user_id", userId).maybeSingle();

    let chartData: any = null;
    if (chartIdFromBody) {
      const { data } = await supabase
        .from("birth_charts").select("chart_data")
        .eq("id", chartIdFromBody).eq("user_id", userId).maybeSingle();
      chartData = data?.chart_data || null;
    }
    if (!chartData) {
      const { data } = await supabase
        .from("birth_charts").select("chart_data")
        .eq("user_id", userId).eq("is_primary", true).maybeSingle();
      chartData = data?.chart_data || null;
    }
    if (!chartData) {
      const { data } = await supabase
        .from("birth_charts").select("chart_data")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      chartData = data?.chart_data || null;
    }

    const profileRes = await profileResP;
    const preferences = profileRes.data?.onboarding_preferences as any;
    const guruOn = profileRes.data?.rishi_guru_enabled === true;
    const mode: "guru" | "standard" = guruOn ? "guru" : "standard";
    const moonSign = chartData?.moon_sign || null;
    // Per-user cache key when we have both a userId AND a personal chart — this
    // prevents every "Cancer moon" user from sharing one cached row.
    const isPersonalized = !!(userId && chartData);
    const signName = isPersonalized
      ? `u:${userId}:${moonSign || "General"}`
      : (moonSign || "General");
    const guidanceStyle = preferences?.guidance_style || "balanced";
    const lifePriorities = preferences?.life_priorities || [];

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Compute astronomical context EARLY (used by both cache + AI prompt + meta payload) ───
    const transitDate = period === "tomorrow" ? validDate : today;
    const transits = computeTransits(transitDate);
    const tithiInfo = computeTithiAndPaksha(transits);
    const nakOfDay = computeNakshatraOfDay(transits);
    const mood: Mood = pickMood(transits, tithiInfo.tithi);
    // In Guru mode, the voice is canonical (Rishi Guru), not the playful 6-voice rotation.
    const voice: Voice = guruOn
      ? "elder"
      : (period === "daily" || period === "tomorrow")
      ? pickVoice(validDate, userId)
      : "elder"; // longer periods stay in the consistent elder voice

    // Compute real days remaining in current Maha Dasha
    let dashaDaysRemaining: number | null = null;
    if (chartData?.dasha?.maha_dasha_end) {
      const end = new Date(chartData.dasha.maha_dasha_end);
      const now = new Date(today + "T00:00:00Z");
      dashaDaysRemaining = Math.max(0, Math.round((end.getTime() - now.getTime()) / 86400000));
    }

    // Yesterday-thread (only meaningful for daily)
    let previousDayThread = "";
    if (period === "daily") {
      const yest = new Date(today + "T00:00:00Z");
      yest.setUTCDate(yest.getUTCDate() - 1);
      const yestStr = yest.toISOString().slice(0, 10);
      const { data: yestRow } = await adminClient
        .from("daily_horoscopes")
        .select("content")
        .eq("sign_name", signName)
        .eq("valid_date", yestStr)
        .eq("period", "daily")
        .eq("language", language)
        .maybeSingle();
      if (yestRow?.content) {
        try {
          const y = typeof yestRow.content === "string" ? JSON.parse(yestRow.content) : yestRow.content;
          if (y?.period_theme) previousDayThread = y.period_theme;
        } catch { /* ignore */ }
      }
    }

    const baseMeta = {
      transits,
      tithi: tithiInfo.tithi,
      paksha: tithiInfo.paksha,
      tithi_meaning: tithiInfo.meaning,
      nakshatra_of_day: nakOfDay,
      mood,
      voice,
      voice_label: VOICE_PROMPTS[voice].label,
      mode,
      dasha: chartData?.dasha || null,
      dasha_days_remaining: dashaDaysRemaining,
    };

    const { data: existing } = await adminClient
      .from("daily_horoscopes")
      .select("content, status, generated_at")
      .eq("sign_name", signName)
      .eq("valid_date", validDate)
      .eq("period", period)
      .eq("mode", mode)
      .eq("language", language)
      .eq("voice", guruOn ? "rishi_guru" : "default")
      .maybeSingle();

    const displaySign = moonSign || "General";

    // ── Fast path: ready row ──
    if (existing && existing.status === "ready" && existing.content) {
      return new Response(
        JSON.stringify({ horoscope: existing.content, sign: displaySign, sign_key: signName, valid_date: validDate, period, meta: baseMeta, status: "ready" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── If a job is already in flight (started <90s ago), tell client to poll ──
    if (existing && existing.status === "processing") {
      const startedAt = existing.generated_at ? new Date(existing.generated_at).getTime() : 0;
      const ageMs = Date.now() - startedAt;
      if (ageMs < 90_000) {
        return new Response(
          JSON.stringify({ status: "processing", sign: displaySign, sign_key: signName, valid_date: validDate, period, meta: baseMeta }),
          { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // else: stale processing row — fall through and re-trigger
    }


    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    // Stamp a processing placeholder so concurrent callers see the in-flight job
    await adminClient.from("daily_horoscopes").upsert({
      sign_name: signName,
      sign_type: moonSign ? "moon" : "general",
      valid_date: validDate,
      period,
      mode,
      language,
      voice: guruOn ? "rishi_guru" : "default",
      content: JSON.stringify({ status: "processing" }),
      status: "processing",
      error: null,
      generated_at: new Date().toISOString(),
    }, { onConflict: "sign_type,sign_name,period,valid_date,mode,language,voice" });


    let transitContext = "";
    let sadeSatiInfo = { active: false, phase: "" };

    if (chartData && moonSign) {
      const result = computeTransitAspects(transits, moonSign, chartData.planets || []);
      transitContext = result.transitContext;
      sadeSatiInfo = result.sadeSati;
    } else {
      transitContext = `Current planetary transits (Swiss Ephemeris, sidereal/Lahiri):\n` +
        transits.map(t => `- ${t.name}: ${t.sign} ${t.degree.toFixed(1)}°${t.is_retrograde ? " (R)" : ""}`).join("\n");
    }

    // Build deeper natal context for longer periods
    // Always inject natal context — stripping it for daily/tomorrow was the
    // single biggest reason daily readings felt generic and repetitive.
    const natalContext = buildNatalContext(chartData);

    const styleMap: Record<string, string> = {
      practical: "Lean more practical — give clear actionable steps.",
      balanced: "Balance practical advice with reflective wisdom.",
      philosophical: "Be deeper and more philosophical — focus on meaning and growth.",
      gentle: "Be extra gentle and reassuring — use a soft, nurturing tone.",
    };

    const priorityContext = lifePriorities.length > 0
      ? `Their current life priorities are: ${lifePriorities.join(", ")}.`
      : "";

    const dashaContext = chartData?.dasha
      ? `The native is currently in ${chartData.dasha.maha_dasha} Maha Dasha / ${chartData.dasha.antar_dasha} Antar Dasha / ${chartData.dasha.pratyantar_dasha || "?"} Pratyantar Dasha${chartData.dasha.sookshma_dasha ? ` / ${chartData.dasha.sookshma_dasha} Sookshma / ${chartData.dasha.prana_dasha} Prana` : ""} (Maha Dasha ends: ${chartData.dasha.maha_dasha_end}).`
      : "";

    const sadeSatiContext = sadeSatiInfo.active
      ? `\n\nIMPORTANT: The native is currently undergoing SADE SATI (${sadeSatiInfo.phase}). Address this significant transit period in your guidance.`
      : "";

    // ─── Tarabala (auspiciousness of today's Nakshatra vs natal Janma Nakshatra) ───
    const TARA_NAMES = ["Janma","Sampat","Vipat","Kshema","Pratyak","Sadhaka","Vadha","Mitra","Ati Mitra"];
    const TARA_QUALITY = ["neutral","auspicious","inauspicious","auspicious","inauspicious","auspicious","inauspicious","auspicious","auspicious"];
    // NAK_NAMES_27 is hoisted at module top
    let tarabalaContext = "";
    const natalNakName = chartData?.birth_nakshatra?.name;
    const transitMoon = transits.find(t => t.name === "Moon");
    if (natalNakName && transitMoon) {
      const todayNakIdx = Math.floor(((transitMoon.degree + signToIndex(transitMoon.sign) * 30) % 360) / (360 / 27));
      const todayNakName = NAK_NAMES_27[todayNakIdx];
      const natalIdx = NAK_NAMES_27.indexOf(natalNakName);
      if (natalIdx >= 0) {
        const taraNum = ((todayNakIdx - natalIdx + 27) % 27) % 9; // 0..8
        const taraName = TARA_NAMES[taraNum];
        const taraQuality = TARA_QUALITY[taraNum];
        tarabalaContext = `\n\nTARABALA (today's auspiciousness from natal Janma Nakshatra ${natalNakName}): Today is ${todayNakName} → ${taraName} Tara (${taraQuality}). Weave this into the day's tone.`;
      }
    }

    // ─── Ashtakavarga bindu strength of houses where transits are landing ───
    let ashtakavargaContext = "";
    const av = chartData?.ashtakavarga;
    const ascSign = chartData?.ascendant?.sign;
    if (av?.bindus_in_house && ascSign) {
      const lagnaIdx = signToIndex(ascSign);
      const keyTransitNotes: string[] = [];
      for (const tp of transits) {
        if (!["Jupiter","Saturn","Rahu","Ketu","Mars"].includes(tp.name)) continue;
        const transitSignIdx = signToIndex(tp.sign);
        const houseFromLagna = ((transitSignIdx - lagnaIdx + 12) % 12) + 1;
        const bindus = av.bindus_in_house[houseFromLagna - 1] ?? 0;
        const verdict = bindus >= 30 ? "very strong" : bindus >= 25 ? "strong" : bindus >= 18 ? "moderate" : "weak";
        // Kakshya: 8 sub-arcs of 3°45' per sign, ruled in Parashari order
        const KAKSHYA_LORDS_HC = ["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon","Lagna"];
        const kakshyaIdx = Math.min(7, Math.floor(tp.degree / 3.75));
        const kakshyaLord = KAKSHYA_LORDS_HC[kakshyaIdx];
        const lordBindu = (kakshyaLord !== "Lagna" && av.bav?.[kakshyaLord])
          ? av.bav[kakshyaLord][((signToIndex(tp.sign)) % 12)] ?? 0
          : null;
        const kakshyaPhrase = lordBindu != null
          ? `kakshya ${kakshyaIdx + 1}/8 (lord ${kakshyaLord}, ${lordBindu}/8 bindus)`
          : `kakshya ${kakshyaIdx + 1}/8 (lord ${kakshyaLord})`;
        keyTransitNotes.push(`${tp.name} transits house ${houseFromLagna} with ${bindus}/56 bindus (${verdict}), ${kakshyaPhrase}`);
      }
      if (keyTransitNotes.length) {
        ashtakavargaContext = `\n\nASHTAKAVARGA TRANSIT STRENGTH: ${keyTransitNotes.join("; ")}. Use this to make predictions specific — high SAV bindus = the transit's effects manifest favourably; low bindus = expect friction. The kakshya lord's own bindu count refines whether THIS sub-period within the transit is supportive.`;
      }
    }

    // ─── Vedha: blocking houses for Saturn / Jupiter transits from Moon ───
    let vedhaContext = "";
    if (moonSign && chartData?.planets?.length) {
      const SATURN_VEDHA: Record<number, number> = { 3:12, 6:9, 11:5, 1:7, 4:10, 7:1, 10:4, 12:3, 9:6, 5:11, 2:8, 8:2 };
      const JUPITER_VEDHA: Record<number, number> = { 2:12, 5:4, 7:3, 9:8, 11:10, 12:2, 4:5, 3:7, 8:9, 10:11, 1:6, 6:1 };
      const moonIdx = signToIndex(moonSign);
      const saturn = transits.find(t => t.name === "Saturn");
      const jupiter = transits.find(t => t.name === "Jupiter");
      const vedhaNotes: string[] = [];
      for (const [planet, t, table] of [["Saturn", saturn, SATURN_VEDHA], ["Jupiter", jupiter, JUPITER_VEDHA]] as const) {
        if (!t) continue;
        const houseFromMoon = ((signToIndex(t.sign) - moonIdx + 12) % 12) + 1;
        const vHouse = table[houseFromMoon];
        if (!vHouse) continue;
        const vSign = SIGNS[(moonIdx + vHouse - 1) % 12];
        const blocker = (chartData.planets || []).find((p: any) =>
          p.sign === vSign && !["Sun","Moon",planet].includes(p.name),
        );
        if (blocker) {
          vedhaNotes.push(`${planet} transit house ${houseFromMoon} from Moon is BLOCKED by natal ${blocker.name} in ${vSign} (vedha house ${vHouse})`);
        } else {
          vedhaNotes.push(`${planet} transit house ${houseFromMoon} from Moon — no vedha (effect manifests freely)`);
        }
      }
      if (vedhaNotes.length) {
        vedhaContext = `\n\nVEDHA (transit blocking): ${vedhaNotes.join("; ")}. When blocked, soften the prediction; when unblocked, deliver it directly.`;
      }
    }



    const periodConfig = getPeriodPromptConfig(period);

    const periodLabel: Record<Period, string> = {
      daily: "daily", tomorrow: "tomorrow (next day preview)", weekly: "weekly (7-day)", monthly: "monthly", yearly: "yearly (full year)",
    };

    // ── Load Rishi Guru bundle when the toggle is on ──
    let guruBundle: Awaited<ReturnType<typeof loadGuruBundle>> | null = null;
    if (guruOn) {
      try { guruBundle = await loadGuruBundle(adminClient); } catch (e) { console.error("loadGuruBundle failed", e); }
    }

    // ── Default writing style rules (used when Guru is OFF) ──
    const defaultWritingRules = `
WRITING STYLE — MANDATORY:
You write like a warm, wise elder — like a knowledgeable grandmother who happens to know the stars. Encouraging, grounded, never clinical.

NEVER use technical jargon without explaining it in plain words. Specifically:
- "transit" → say "planet moving through your sky"
- "opposition" → say "two planets pulling in opposite directions"
- "dasha" → say "your current life chapter"
- "nakshatra" → say "star cluster"
- "lagna/ascendant" → say "your rising sign (how the world sees you)"
- "antardasha" → say "the sub-chapter within your life chapter"
- "atmakaraka" → say "your soul's primary planet"
- "trine" → say "two planets in a helpful, flowing relationship"
- "square" → say "two planets creating productive tension"
- "conjunction" → say "two planets sitting together, amplifying each other"

STRUCTURE every section like this:

"period_theme": One sentence. Feel-first. Example: "Today is about slowing down to hear what you actually need." NOT: "Moon in Bharani nakshatra creates introspective tendencies."

"guidance" paragraphs: Sentence 1 = what you will FEEL. Sentence 2 = the simple planetary reason WHY. Sentence 3 = what this MEANS practically. Sentence 4 (optional) = what to DO about it.

BAD example (never write like this): "Transit Moon at 22° Aries forms a square to natal Moon-Ketu axis activating the 6th/12th house polarity during Rahu Pratyantar."
GOOD example (write like this): "You might feel more restless than usual this morning — almost like your mind is running ahead of your body. That's because the Moon moving through Aries today is bumping up against your own Moon's position, creating a kind of internal tug-of-war. It will ease by afternoon. What to do: don't make big decisions before noon — journal instead."

"action_items": Always start with a verb. Max 15 words each. Include a specific time if possible ("before noon", "after 6 PM").

"remedial_tip": Explain WHY in one simple sentence before giving the action. Example: "Saturn is a bit heavy on you today, so cooling rituals help. Offer a small cup of water to any plant before breakfast."

"mantra_of_the_day": Always include the English meaning immediately after the Sanskrit. Include how long to chant and what time of day.

"energy_level": Describe with a human metaphor, not just a word. Example: "Moderate — like a cloudy day with occasional sunshine breaking through"

"emotional_forecast": Lead with the feeling, then explain the planetary reason.
`;

    const writingRules = guruBundle
      ? assembleGuruWritingRules(guruBundle.layers)
      : defaultWritingRules;

    const dayFlavorContext = `
DAY FLAVOUR (use these to colour your reading naturally — do not just list them):
- Tithi: ${tithiInfo.paksha} ${tithiInfo.tithi} — ${tithiInfo.meaning}
- Nakshatra of the day (current Moon): ${nakOfDay.name}, deity ${nakOfDay.deity}, symbol ${nakOfDay.symbol}
- Mood of the day: ${mood} (use this as the underlying tonal colour of the reading)`;

    const previousThreadContext = previousDayThread
      ? `\n\nYESTERDAY'S THREAD (only for daily): yesterday's theme was: "${previousDayThread}". In TODAY's reading, briefly reference how today either continues, resolves, or shifts that thread. One short callback sentence inside the guidance, no more.`
      : "";

    // In Guru mode the canonical voice replaces the playful rotation entirely.
    const voiceInstruction = guruOn
      ? `\n\nVOICE — RISHI GURU (canonical): classical Vedic master, warm Elder register, cited never hedging. Apply to every narrative field including cosmic_headline.`
      : (period === "daily" || period === "tomorrow")
        ? `\n\nTODAY'S VOICE — "${VOICE_PROMPTS[voice].label}":\n${VOICE_PROMPTS[voice].instruction}\nApply this voice to greeting, period_theme, guidance, watch_for, planetary_story, emotional_forecast, action_items, cosmic_advice and the new cosmic_headline. The plain-language no-jargon rule still applies regardless of voice.`
        : "";

    const headlineRule = `\n\nALSO RETURN a "cosmic_headline": one bold, magazine-style sentence of 7–14 words. Punchy, surprising, written in today's voice. Examples of the SHAPE (not content): "Mercury whispers: speak less, listen more." / "A small yes today opens a door on Thursday." / "The moon is restless tonight — guard your sleep."

ALSO RETURN a "narrative" field: 220–340 words of flowing prose (NOT bullet points). This is what the reader will actually read for depth. It MUST cite at least TWO specific items from the astronomical context above — name the actual transit, dasha lord, nakshatra, or natal placement you are drawing from. No vague "the planets suggest" filler. Write like a letter to this one person on this one day, in today's voice. Do NOT repeat the other JSON fields verbatim — go DEEPER than them.`;

    // Extra JSON fields: common (daily/tomorrow only) + guru-only.
    const commonExtras = (period === "daily" || period === "tomorrow") ? COMMON_EXTRA_JSON : "";
    const guruExtras   = guruOn ? GURU_EXTRA_JSON : "";

    const prompt = moonSign
      ? `You are giving a personal ${periodLabel[period]} Vedic astrology consultation to someone with Moon in ${moonSign}. ${priorityContext} ${dashaContext} Today's date is ${today}. This reading covers the ${period} period starting ${validDate}.

${transitContext}
${natalContext ? `\n${natalContext}` : ""}
${sadeSatiContext}${tarabalaContext}${ashtakavargaContext}${vedhaContext}
${dayFlavorContext}${previousThreadContext}${voiceInstruction}${headlineRule}

All transit positions above are computed by Swiss Ephemeris (arc-second accuracy). Do NOT modify or recalculate them.

${writingRules}

${periodConfig.depthInstruction}

${styleMap[guidanceStyle] || styleMap.balanced}

${periodConfig.jsonFormat}${commonExtras}${guruExtras}`
      : `You are giving a general ${periodLabel[period]} Vedic astrology consultation. ${priorityContext} Today's date is ${today}. This reading covers the ${period} period starting ${validDate}.

${transitContext}
${dayFlavorContext}${voiceInstruction}${headlineRule}

${writingRules}

${periodConfig.depthInstruction}

${styleMap[guidanceStyle] || styleMap.balanced}

${periodConfig.jsonFormat}${commonExtras}${guruExtras}`;

    const periodNote =
      period === "tomorrow" ? "This is a TOMORROW preview — use future tense throughout."
      : (period === "monthly" || period === "yearly") ? `For this ${period} reading, go DEEP — analyze how major transits interact with the natal chart, dasha period, and active yogas.`
      : "";

    const languageInstruction = buildLanguageInstruction(language);

    const systemPrompt = (guruBundle
      ? assembleGuruSystemPrompt(guruBundle.layers, guruBundle.rules, periodNote)
      : `You are a warm, wise Vedic astrologer giving a personal consultation — never a lecture.

CORE RULES:
- Address the person as "you" — this is a one-on-one consultation
- Lead with FEELINGS and EXPERIENCES, then explain the cosmic reason in simple words
- NEVER use bare jargon — always translate technical terms into plain language
- Be specific and personal, not generic
- All transit data provided is astronomically precise (Swiss Ephemeris) — do NOT recalculate
- Return ONLY valid JSON, no markdown wrapping
- Always include a "cosmic_headline" field as the first key — one bold magazine-style sentence
${period === "tomorrow" ? "- This is a TOMORROW preview — use future tense throughout. Frame everything as preparation." : ""}
${(period === "monthly" || period === "yearly") ? `- For this ${period} reading, go DEEP — analyze how major transits interact with their natal chart, dasha period, and active yogas. Reference specific houses and life areas.` : ""}`) + languageInstruction;

    // ── Background generation ── return 202 immediately, write result asynchronously
    const generationTask = (async () => {
      try {
        const callModel = async (model: string) => fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            temperature: 0.9,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        let aiRes = await callModel(periodConfig.model);
        // Fallback to a faster model on transient failures (timeouts, 5xx)
        if (!aiRes.ok && aiRes.status >= 500) {
          console.warn(`Primary model ${periodConfig.model} failed (${aiRes.status}); falling back to claude-haiku-4-5-20251001`);
          aiRes = await callModel("claude-haiku-4-5-20251001");
        }

        if (!aiRes.ok) {
          throw new Error(`AI gateway error: ${aiRes.status}`);
        }

        const aiData = await aiRes.json();
        const rawContent = aiData.content?.[0]?.text || "";

        let parsed: any;
        try {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
        } catch {
          parsed = {
            guidance: rawContent.slice(0, 500),
            lucky_color: "Gold",
            lucky_number: 7,
            direction: "East",
            cosmic_advice: "Trust the cosmic flow.",
          };
        }

        parsed.transits = transits;
        parsed.tithi = tithiInfo.tithi;
        parsed.paksha = tithiInfo.paksha;
        parsed.tithi_meaning = tithiInfo.meaning;
        parsed.nakshatra_of_day = nakOfDay;
        parsed.mood = mood;
        parsed.voice = voice;
        parsed.voice_label = VOICE_PROMPTS[voice].label;
        parsed.mode = mode;
        const fullContent = JSON.stringify(parsed);

        const { error: cacheError } = await adminClient.from("daily_horoscopes").upsert({
          sign_name: signName,
          sign_type: moonSign ? "moon" : "general",
          valid_date: validDate,
          period,
          mode,
          language,
          voice: guruOn ? "rishi_guru" : "default",
          content: fullContent,
          status: "ready",
          error: null,
          generated_at: new Date().toISOString(),
        }, { onConflict: "sign_type,sign_name,period,valid_date,mode,language,voice" });

        if (cacheError) console.error("Failed to cache horoscope:", cacheError);
      } catch (err) {
        console.error("Background horoscope generation failed:", err);
        await adminClient.from("daily_horoscopes").upsert({
          sign_name: signName,
          sign_type: moonSign ? "moon" : "general",
          valid_date: validDate,
          period,
          mode,
          language,
          voice: guruOn ? "rishi_guru" : "default",
          content: JSON.stringify({ status: "failed" }),
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          generated_at: new Date().toISOString(),
        }, { onConflict: "sign_type,sign_name,period,valid_date,mode,language,voice" });
      }
    })();

    // Keep edge runtime alive until background task finishes (or runtime times out)
    // @ts-ignore - EdgeRuntime is provided by Supabase Edge runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(generationTask);
    }

    return new Response(
      JSON.stringify({ status: "processing", sign: displaySign, sign_key: signName, valid_date: validDate, period, meta: baseMeta }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("generate-horoscope error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
