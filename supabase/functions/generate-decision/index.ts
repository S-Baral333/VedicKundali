import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Body, EclipticLongitude, MakeTime, GeoVector, Ecliptic } from "https://esm.sh/astronomy-engine@2.1.19";
import { normalizeLanguage, buildLanguageInstruction } from "../_shared/languages.ts";
import { resolveGuruContext, type GuruContext } from "../_shared/guru.ts";
import { resolveAccess } from "../_shared/access.ts";
import { modelForTier, type Tier } from "../_shared/tiers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_LORDS: Record<string, string> = {
  Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon", Leo:"Sun", Virgo:"Mercury",
  Libra:"Venus", Scorpio:"Mars", Sagittarius:"Jupiter", Capricorn:"Saturn", Aquarius:"Saturn", Pisces:"Jupiter",
};

// ─── Transit math (unchanged) ───
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
function getCurrentTransits(): Record<string, { sign: string; degree: number }> {
  const now = new Date();
  const year = now.getUTCFullYear(), month = now.getUTCMonth() + 1, day = now.getUTCDate();
  const jd = julianDay(year, month, day, 12.0);
  const ayanamsa = lahiriAyanamsa(jd);
  const time = MakeTime(new Date(Date.UTC(year, month - 1, day, 12)));
  const planets: { name: string; body: any }[] = [
    { name: "Sun", body: Body.Sun }, { name: "Moon", body: Body.Moon }, { name: "Mars", body: Body.Mars },
    { name: "Mercury", body: Body.Mercury }, { name: "Jupiter", body: Body.Jupiter },
    { name: "Venus", body: Body.Venus }, { name: "Saturn", body: Body.Saturn },
  ];
  const transits: Record<string, { sign: string; degree: number }> = {};
  for (const pl of planets) {
    let tropLng: number;
    if (pl.body === Body.Sun) {
      const geo = GeoVector(Body.Sun, time, true);
      const ecl = Ecliptic(geo);
      tropLng = ecl.elon;
    } else {
      tropLng = EclipticLongitude(pl.body, time);
    }
    const sidLng = ((tropLng - ayanamsa) % 360 + 360) % 360;
    transits[pl.name] = { sign: SIGNS[Math.floor(sidLng / 30)], degree: sidLng };
  }
  const rahuTrop = meanLunarNode(jd);
  const rahuSid = ((rahuTrop - ayanamsa) % 360 + 360) % 360;
  transits["Rahu"] = { sign: SIGNS[Math.floor(rahuSid / 30)], degree: rahuSid };
  const ketuSid = (rahuSid + 180) % 360;
  transits["Ketu"] = { sign: SIGNS[Math.floor(ketuSid / 30)], degree: ketuSid };
  return transits;
}

// ─── Helpers ───
function buildPlanetMap(chartData: any): Record<string, any> {
  const planetsArray = Array.isArray(chartData.planets) ? chartData.planets : [];
  const map: Record<string, any> = {};
  for (const p of planetsArray) if (p.name) map[p.name] = p;
  return map;
}
function houseSignAt(ascSign: string, num: number): string {
  const ascIdx = SIGNS.indexOf(ascSign);
  if (ascIdx < 0) return "unknown";
  return SIGNS[(ascIdx + num - 1) % 12];
}
function signIdx(s: string) { return SIGNS.indexOf(s); }

// ─── Category → relevant houses, karakas, vargas ───
const CATEGORY_RULES: Record<string, {
  focus: string;
  houses: number[];           // primary houses
  karakas: string[];          // significator planets
  vargas: string[];           // relevant divisional charts
}> = {
  career:        { focus: "Career, profession, public image", houses: [10, 6, 2], karakas: ["Saturn","Sun","Jupiter","Mercury"], vargas: ["d10","d9"] },
  relationships: { focus: "Love, marriage, partnerships",     houses: [7, 5, 2],  karakas: ["Venus","Moon","Jupiter"],            vargas: ["d9","d7"] },
  finance:       { focus: "Wealth, income, investments",      houses: [2, 11, 9], karakas: ["Jupiter","Venus","Mercury"],         vargas: ["d2","d9"] },
  health:        { focus: "Physical health, vitality",        houses: [1, 6, 8],  karakas: ["Sun","Mars","Saturn"],               vargas: ["d30","d9"] },
  spiritual:     { focus: "Spiritual growth, dharma",         houses: [9, 12, 5], karakas: ["Jupiter","Ketu","Moon"],             vargas: ["d20","d9"] },
  general:       { focus: "Overall life direction",           houses: [1, 9, 10], karakas: ["Moon","Sun","Jupiter"],              vargas: ["d9"] },
};

// ─── Question Type Classifier ───
type QuestionType = "superlative" | "binary_factual" | "temporal" | "directional";

function classifyQuestion(q: string): { type: QuestionType; reason: string } {
  const text = q.toLowerCase();
  const superlativeRe = /\b(richest|wealthiest|most famous|most powerful|best in the world|world'?s|number one|the greatest|the top|nobel|billionaire status|trillionaire)\b/;
  if (superlativeRe.test(text)) {
    return { type: "superlative", reason: "Superlative/world-ranking question — astrology measures patterns, not singular global rankings." };
  }
  const binaryFactualRe = /\b(am i (currently|right now|already)|do i (currently )?have|am i a |is my (wife|husband|partner|spouse))\b/;
  if (binaryFactualRe.test(text)) {
    return { type: "binary_factual", reason: "Binary current-fact question — chart shows tendencies, not literal current status." };
  }
  const temporalRe = /\b(when will|by what year|by when|what date|what month|in which year|how soon|how long until)\b/;
  if (temporalRe.test(text)) {
    return { type: "temporal", reason: "Temporal question — answer constrained by Dasha and transit windows." };
  }
  return { type: "directional", reason: "Directional/trend question — standard chart-based reading." };
}

// ─── Evidence Scorer (deterministic) ───
interface EvidenceItem { factor: string; value: string | number | null; weight: number; }

function evaluateQuestion(args: {
  category: string;
  questionType: QuestionType;
  chartData: any;
  transits: Record<string, { sign: string; degree: number }>;
}) {
  const { category, questionType, chartData, transits } = args;
  const planetMap = buildPlanetMap(chartData);
  const ascSign = chartData.ascendant?.sign || "Aries";
  const rules = CATEGORY_RULES[category] || CATEGORY_RULES.general;
  const evidence: EvidenceItem[] = [];

  // Helper: get planet strength (Shadbala-lite, 0-100 in our engine; treat as % strength)
  const strengthOf = (name: string): number => {
    const p = planetMap[name];
    return Number(p?.strength ?? 50);
  };
  const houseOf = (name: string): number | null => {
    const p = planetMap[name];
    return p?.house ?? null;
  };
  const dignityOf = (name: string): string => String(planetMap[name]?.dignity || "").toLowerCase();

  // 1. House strength via Ashtakavarga BAV (out of 8 per sign / SAV out of 56)
  const sav: number[] = chartData.ashtakavarga?.bindus_in_house || [];
  for (const h of rules.houses) {
    const bindus = sav[h - 1];
    if (bindus != null) {
      // BAV interpretation: <25 weak, 25-30 average, 30-40 strong, >40 exceptional (per house, SAV style)
      const w = bindus >= 32 ? 10 : bindus >= 28 ? 5 : bindus >= 22 ? 0 : -6;
      evidence.push({ factor: `House ${h} bindus (Ashtakavarga SAV)`, value: `${bindus}/56`, weight: w });
    }
  }

  // 2. House lord strength
  for (const h of rules.houses) {
    const sign = houseSignAt(ascSign, h);
    const lord = SIGN_LORDS[sign];
    if (!lord) continue;
    const s = strengthOf(lord);
    const w = s >= 70 ? 10 : s >= 55 ? 5 : s >= 40 ? 0 : -6;
    const dig = dignityOf(lord);
    const dignBoost = /exalt|own/.test(dig) ? 4 : /debilit/.test(dig) ? -5 : 0;
    evidence.push({
      factor: `${h}th lord ${lord} strength${dig ? ` (${dig})` : ""}`,
      value: `${Math.round(s)}/100`,
      weight: w + dignBoost,
    });
  }

  // 3. Karaka strength
  for (const k of rules.karakas) {
    const s = strengthOf(k);
    const w = s >= 70 ? 8 : s >= 55 ? 4 : s >= 40 ? 0 : -5;
    const dig = dignityOf(k);
    const dignBoost = /exalt|own/.test(dig) ? 3 : /debilit/.test(dig) ? -4 : 0;
    evidence.push({
      factor: `Karaka ${k}${dig ? ` (${dig})` : ""}`,
      value: `${Math.round(s)}/100`,
      weight: w + dignBoost,
    });
  }

  // 4. Active yogas relevant to category
  const yogas: any[] = Array.isArray(chartData.active_yogas) ? chartData.active_yogas : [];
  const yogaKeywordsByCat: Record<string, RegExp> = {
    finance: /Dhana|Lakshmi|Kubera|Chandra-Mangala/i,
    career: /Raj|Hamsa|Ruchaka|Bhadra|Shasha|Malavya|Amala/i,
    relationships: /Malavya|Gajakesari/i,
    health: /Hamsa|Ruchaka/i,
    spiritual: /Hamsa|Sanyasa|Pravrajya/i,
    general: /Raj|Dhana|Gajakesari/i,
  };
  const yogaRe = yogaKeywordsByCat[category] || yogaKeywordsByCat.general;
  for (const y of yogas) {
    const name = y?.name || (typeof y === "string" ? y : "");
    if (yogaRe.test(name)) {
      evidence.push({
        factor: `Active yoga: ${name}`,
        value: y?.description || null,
        weight: 8,
      });
    }
  }

  // 5. Current Mahadasha lord relation to relevant houses
  const dasha = chartData.dasha || {};
  const mahaLord = dasha.maha_dasha;
  const antarLord = dasha.antar_dasha;
  if (mahaLord && planetMap[mahaLord]) {
    const mahaHouse = houseOf(mahaLord);
    const isRelevant = mahaHouse != null && rules.houses.includes(mahaHouse);
    const mahaStr = strengthOf(mahaLord);
    evidence.push({
      factor: `Mahadasha lord ${mahaLord} in house ${mahaHouse ?? "?"}`,
      value: `${Math.round(mahaStr)}/100`,
      weight: isRelevant ? (mahaStr >= 55 ? 10 : 4) : (mahaStr >= 55 ? 3 : -2),
    });
  }
  if (antarLord && planetMap[antarLord] && antarLord !== mahaLord) {
    const antarHouse = houseOf(antarLord);
    const isRelevant = antarHouse != null && rules.houses.includes(antarHouse);
    const antarStr = strengthOf(antarLord);
    evidence.push({
      factor: `Antardasha lord ${antarLord} in house ${antarHouse ?? "?"}`,
      value: `${Math.round(antarStr)}/100`,
      weight: isRelevant ? 6 : (antarStr >= 55 ? 2 : -1),
    });
  }

  // 6. Transit Jupiter / Saturn to relevant houses from natal Moon
  const moonSign = chartData.moon_sign || planetMap["Moon"]?.sign;
  if (moonSign) {
    const moonIdx = signIdx(moonSign);
    const tJup = transits["Jupiter"];
    const tSat = transits["Saturn"];
    if (tJup) {
      const houseFromMoon = ((signIdx(tJup.sign) - moonIdx + 12) % 12) + 1;
      if (rules.houses.includes(houseFromMoon)) {
        evidence.push({ factor: `Transit Jupiter in ${houseFromMoon}H from natal Moon`, value: tJup.sign, weight: 6 });
      }
    }
    if (tSat) {
      const houseFromMoon = ((signIdx(tSat.sign) - moonIdx + 12) % 12) + 1;
      if ([1, 12, 2].includes(houseFromMoon)) {
        evidence.push({ factor: `Transit Saturn in ${houseFromMoon}H from natal Moon (Sade Sati zone)`, value: tSat.sign, weight: -5 });
      } else if (rules.houses.includes(houseFromMoon)) {
        evidence.push({ factor: `Transit Saturn in ${houseFromMoon}H from natal Moon`, value: tSat.sign, weight: -3 });
      }
    }
  }

  // 7. Vimshopaka of karakas (multi-varga confirmation)
  const vimsArr: any[] = Array.isArray(chartData.vimshopaka) ? chartData.vimshopaka : [];
  const vimsMap: Record<string, any> = {};
  for (const v of vimsArr) vimsMap[v.name] = v;
  for (const k of rules.karakas) {
    const v = vimsMap[k];
    if (v && v.score != null) {
      const pct = (v.score / (v.max || 20)) * 100;
      const w = pct >= 75 ? 5 : pct >= 55 ? 2 : pct >= 35 ? 0 : -3;
      if (w !== 0) {
        evidence.push({ factor: `${k} Vimshopaka Bala (multi-varga)`, value: `${v.score}/${v.max || 20}`, weight: w });
      }
    }
  }

  // 8. Combustion / debilitation penalties on karakas
  const combustionArr: any[] = Array.isArray(chartData.combustion) ? chartData.combustion : [];
  for (const k of rules.karakas) {
    if (combustionArr.some(c => c.name === k)) {
      evidence.push({ factor: `${k} is combust (weakened)`, value: null, weight: -5 });
    }
  }

  // ─── Compute strength score ───
  const totalWeight = evidence.reduce((acc, e) => acc + e.weight, 0);
  // Normalize: roughly -60..+90 range -> 0..100
  const rawScore = ((totalWeight + 60) / 150) * 100;
  const strengthScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Verdict from strength + question type
  let verdict: "favorable" | "nuanced" | "neutral" | "unfavorable";
  if (questionType === "superlative") {
    // Superlative questions are NEVER literally "favorable" — reframe as nuanced
    verdict = strengthScore >= 65 ? "nuanced" : strengthScore >= 45 ? "neutral" : "unfavorable";
  } else {
    verdict = strengthScore >= 70 ? "favorable" : strengthScore >= 50 ? "neutral" : strengthScore >= 30 ? "neutral" : "unfavorable";
    if (strengthScore >= 50 && strengthScore < 65) verdict = "neutral";
    if (strengthScore < 30) verdict = "unfavorable";
  }

  // ─── Confidence (data quality, not prediction strength) ───
  let confidence = 75;
  let confidenceCappedReason: string | null = null;
  const caps: Record<QuestionType, number> = {
    superlative: 45,
    binary_factual: 40,
    temporal: 70,
    directional: 85,
  };
  if (confidence > caps[questionType]) {
    confidence = caps[questionType];
    confidenceCappedReason = `Capped at ${caps[questionType]}% — ${questionType.replace("_", " ")} questions cannot be answered with higher certainty.`;
  }
  // Boost slightly if many corroborating evidence points
  const strongFactors = evidence.filter(e => Math.abs(e.weight) >= 6).length;
  confidence = Math.min(caps[questionType], confidence + Math.min(10, strongFactors));

  // Sort evidence by absolute weight, take top 8
  const topEvidence = [...evidence].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight)).slice(0, 8);

  return { verdict, confidence, strengthScore, questionType, evidence: topEvidence, confidenceCappedReason, allEvidenceCount: evidence.length };
}

// ─── Build Evidence Context for AI ───
function buildEvidenceContext(args: {
  chartData: any;
  category: string;
  evaluation: ReturnType<typeof evaluateQuestion>;
  transits: Record<string, { sign: string; degree: number }>;
}): string {
  const { chartData, category, evaluation, transits } = args;
  const planetMap = buildPlanetMap(chartData);
  const ascSign = chartData.ascendant?.sign || "unknown";
  const rules = CATEGORY_RULES[category] || CATEGORY_RULES.general;

  const lines: string[] = [];

  // Citation-grade chart summary (DMS, retro-aware combustion, Parashari aspects)
  if (chartData.llm_summary) {
    lines.push(chartData.llm_summary);
    lines.push("");
  }

  lines.push(`═══ ASCENDANT & LUMINARIES ═══`);
  lines.push(`Ascendant: ${ascSign} ${chartData.ascendant?.dms || (chartData.ascendant?.degree?.toFixed(2) + "°") || "?"} (${chartData.ascendant?.nakshatra || "?"})`);
  lines.push(`Moon sign: ${chartData.moon_sign || "?"}  |  Sun sign: ${chartData.sun_sign || "?"}`);
  lines.push(`Birth nakshatra: ${chartData.birth_nakshatra?.name || "?"} (pada ${chartData.birth_nakshatra?.pada || "?"}, ruler ${chartData.birth_nakshatra?.ruling_planet || "?"})`);

  lines.push(`\n═══ NATAL PLANETS (with Shadbala-lite strength /100) ═══`);
  for (const pname of ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"]) {
    const p = planetMap[pname];
    if (!p) continue;
    const tags = [
      `${p.sign || "?"} ${typeof p.degree === "number" ? p.degree.toFixed(2) : "?"}°`,
      `H${p.house ?? "?"}`,
      p.nakshatra ? `nak:${p.nakshatra}` : "",
      p.dignity ? p.dignity : "",
      p.is_combust ? "COMBUST" : "",
      p.isRetrograde || p.is_retrograde ? "(R)" : "",
      `str:${Math.round(p.strength ?? 50)}`,
    ].filter(Boolean).join(" · ");
    lines.push(`${pname.padEnd(8)}: ${tags}`);
  }

  // Ashtakavarga
  const sav: number[] = chartData.ashtakavarga?.bindus_in_house || [];
  if (sav.length === 12) {
    lines.push(`\n═══ HOUSE STRENGTH (Ashtakavarga SAV /56) ═══`);
    lines.push(sav.map((b, i) => `H${i + 1}:${b}`).join("  "));
  }

  // Dasha — full 5 levels if present
  const dasha = chartData.dasha || {};
  if (dasha.maha_dasha) {
    lines.push(`\n═══ CURRENT VIMSHOTTARI DASHA ═══`);
    lines.push(`Maha:     ${dasha.maha_dasha}${dasha.maha_dasha_end ? ` (ends ${dasha.maha_dasha_end})` : ""}`);
    if (dasha.antar_dasha) lines.push(`Antar:    ${dasha.antar_dasha}${dasha.antar_dasha_end ? ` (ends ${dasha.antar_dasha_end})` : ""}`);
    if (dasha.pratyantar_dasha) lines.push(`Pratyantar: ${dasha.pratyantar_dasha}${dasha.pratyantar_dasha_end ? ` (ends ${dasha.pratyantar_dasha_end})` : ""}`);
    if (dasha.sookshma_dasha) lines.push(`Sookshma: ${dasha.sookshma_dasha}`);
  }

  // Yogas (all, with descriptions)
  const yogas: any[] = Array.isArray(chartData.active_yogas) ? chartData.active_yogas : [];
  if (yogas.length) {
    lines.push(`\n═══ ACTIVE YOGAS ═══`);
    for (const y of yogas.slice(0, 12)) {
      const name = y?.name || y;
      const desc = y?.description ? ` — ${y.description}` : "";
      lines.push(`• ${name}${desc}`);
    }
  }

  // Mangal Dosha
  if (chartData.mangal_dosha != null) lines.push(`\nMangal Dosha: ${chartData.mangal_dosha}`);

  // Divisional charts (relevant to category)
  const vargas = chartData.vargas_full || chartData.vargas || {};
  const wantVargas = rules.vargas;
  const vargaLines: string[] = [];
  for (const v of wantVargas) {
    const arr = vargas[v];
    if (!Array.isArray(arr)) continue;
    const summary = arr.filter((x: any) => rules.karakas.includes(x.name) || ["Sun","Moon","Jupiter"].includes(x.name))
      .map((x: any) => `${x.name}:${x.sign}${x.is_vargottama ? "*" : ""}`).join(", ");
    if (summary) vargaLines.push(`${v.toUpperCase()} (${v === "d2" ? "wealth" : v === "d9" ? "navamsa" : v === "d10" ? "career" : v === "d20" ? "spiritual" : v === "d30" ? "health" : v}): ${summary}`);
  }
  if (vargaLines.length) {
    lines.push(`\n═══ DIVISIONAL CHARTS (${category}) — * = vargottama ═══`);
    lines.push(...vargaLines);
  }

  // Life scores
  const ls = chartData.life_scores;
  if (ls) {
    lines.push(`\n═══ LIFE STRENGTH SCORES (engine-computed /100) ═══`);
    lines.push(Object.entries(ls).map(([k, v]) => `${k}:${v}`).join("  "));
  }

  // Current transits
  lines.push(`\n═══ CURRENT TRANSITS (sidereal, today) ═══`);
  lines.push(Object.entries(transits).map(([p, v]) => `${p}:${v.sign}(${v.degree.toFixed(1)}°)`).join("  "));

  // ─── COMPUTED EVIDENCE ───
  lines.push(`\n═══ ⚖ COMPUTED EVIDENCE FOR THIS QUESTION ═══`);
  lines.push(`Category: ${category} (${rules.focus})`);
  lines.push(`Question type: ${evaluation.questionType}`);
  lines.push(`Strength score: ${evaluation.strengthScore}/100`);
  lines.push(`Verdict: ${evaluation.verdict.toUpperCase()}`);
  lines.push(`Confidence: ${evaluation.confidence}%${evaluation.confidenceCappedReason ? ` (${evaluation.confidenceCappedReason})` : ""}`);
  lines.push(`\nTop weighted factors (you MUST cite these by exact value):`);
  for (const e of evaluation.evidence) {
    const sign = e.weight >= 0 ? "+" : "";
    const val = e.value != null ? ` = ${e.value}` : "";
    lines.push(`  ${sign}${e.weight}  ${e.factor}${val}`);
  }

  return lines.join("\n");
}

type OracleJobStep = {
  status: string;
  progress: number;
  current_layer: number;
  current_message: string;
  completed_at?: string | null;
};

async function updateOracleJob(serviceClient: any, jobId: string, patch: Record<string, unknown>) {
  const { error } = await serviceClient.from("oracle_jobs").update(patch).eq("id", jobId);
  if (error) console.error("oracle job update failed:", error);
}

function sanitizeJsonCandidate(candidate: string) {
  return candidate.replace(/[\u0000-\u001F]/g, " ").trim();
}

function parseDecisionPayload(rawContent: string) {
  const trimmed = rawContent.trim();
  const match = trimmed.match(/\{[\s\S]*\}/);
  const candidates = Array.from(new Set([trimmed, match?.[0]].filter(Boolean) as string[]));

  for (const candidate of candidates) {
    try {
      return JSON.parse(sanitizeJsonCandidate(candidate));
    } catch {
      continue;
    }
  }

  throw new Error("Failed to parse AI response");
}

async function runOracleDecisionJob(args: {
  serviceClient: any;
  jobId: string;
  userId: string;
  question: string;
  category: string;
  mode: string;
  previous_context?: any;
  ai_model?: string;
  chart_id?: string;
  tier: Tier;
  usage: { dreams_count?: number; oracle_count?: number; period_start?: string | null };
  language?: string;
}) {
  const { serviceClient, jobId, userId, question, category, mode, previous_context, ai_model, chart_id, tier, usage, language } = args;
  const languageInstruction = buildLanguageInstruction(language || "en");
  const guru = await resolveGuruContext(serviceClient, userId);

  // Small pacing helper so each pre-synthesis layer is actually visible
  // to the polling client (not blasted in <100ms).
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const LAYER_DWELL_MS = 650;

  await updateOracleJob(serviceClient, jobId, {
    status: "foundation",
    progress: 5,
    current_layer: 1,
    current_message: "Locking sidereal frame · Lahiri ayanāṁśa",
  });

  let chart: any = null;
  if (chart_id) {
    const { data } = await serviceClient.from("birth_charts").select("id, chart_data, date_of_birth").eq("id", chart_id).eq("user_id", userId).maybeSingle();
    chart = data;
  }
  if (!chart) {
    const { data } = await serviceClient.from("birth_charts").select("id, chart_data, date_of_birth").eq("user_id", userId).eq("is_primary", true).maybeSingle();
    chart = data;
  }
  if (!chart) {
    const { data } = await serviceClient.from("birth_charts").select("id, chart_data, date_of_birth").eq("user_id", userId).order("created_at", { ascending: false }).limit(1);
    chart = data?.[0];
  }
  if (!chart?.chart_data) throw new Error("No birth chart found. Please generate your chart first.");

  await sleep(LAYER_DWELL_MS);
  await updateOracleJob(serviceClient, jobId, {
    status: "chart_scan",
    progress: 12,
    current_layer: 2,
    current_message: "Scanning natal chart foundations and house lords",
  });

  const chartData = chart.chart_data as any;

  await sleep(LAYER_DWELL_MS);
  await updateOracleJob(serviceClient, jobId, {
    status: "transits",
    progress: 18,
    current_layer: 3,
    current_message: "Reading today's sidereal transits against your chart",
  });
  const transits = getCurrentTransits();

  await sleep(LAYER_DWELL_MS);
  await updateOracleJob(serviceClient, jobId, {
    status: "dasha",
    progress: 24,
    current_layer: 4,
    current_message: "Analyzing Vimśottarī dasha timing windows",
  });
  const classified = classifyQuestion(question);
  const evaluation = evaluateQuestion({ category, questionType: classified.type, chartData, transits });

  await sleep(LAYER_DWELL_MS);
  await updateOracleJob(serviceClient, jobId, {
    status: "doshas",
    progress: 30,
    current_layer: 5,
    current_message: "Checking doṣas, combustion, and difficult afflictions",
  });

  await sleep(LAYER_DWELL_MS);
  await updateOracleJob(serviceClient, jobId, {
    status: "yogas",
    progress: 36,
    current_layer: 6,
    current_message: "Weighing yogas, reversals, and protective signatures",
  });
  const evidenceContext = buildEvidenceContext({ chartData, category, evaluation, transits });

  await sleep(LAYER_DWELL_MS);
  await updateOracleJob(serviceClient, jobId, {
    status: "karmic_axis",
    progress: 42,
    current_layer: 7,
    current_message: "Mapping karmic axis and final evidence balance",
  });

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  const chosenModel = ai_model || modelForTier(tier);

  await sleep(LAYER_DWELL_MS);
  await updateOracleJob(serviceClient, jobId, {
    status: "synthesis",
    progress: 45,
    current_layer: 8,
    current_message: "Opening the Guru voice · streaming synthesis",
  });

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: chosenModel,
      stream: true,
      max_tokens: 4096,
      temperature: 0.85,
      system: `${guru.enabled ? guru.systemBlock + "\n\n" + guru.writingRules + "\n\n" : ""}You are a senior Vedic astrologer NARRATING a chart reading whose verdict, confidence, and weighted evidence have ALREADY been calculated by a Jyotish engine. Your only job is to translate the numbers into warm, specific, citation-rich prose.

══════════ ABSOLUTE RULES ══════════

1. NEVER invent the verdict, confidence, or strength score. They are passed to you in the COMPUTED EVIDENCE block. Use them exactly.

2. FORBIDDEN HEDGE WORDS — never use:
   "suggests", "tends to", "may", "might", "the energy of", "energy points to",
   "likely", "could indicate", "is wired for", "the universe is", "appears to".
   Replace with concrete citations to the numbers you were given.

3. EVERY paragraph in narrative_reading MUST cite at least one specific factor from the "Top weighted factors" list — by exact name and value.
4. technical_details MUST be direct quotes of factors from the evidence list.
5. For SUPERLATIVE questions, open with: "Astrology measures patterns and probabilities, not singular global rankings."
6. For BINARY_FACTUAL questions, say a chart shows tendencies, not literal current status.
7. For TEMPORAL questions, timing must use the actual Vimshottari Dasha periods given in the evidence plus current transits.
8. Output ONLY valid JSON, no markdown fences.${languageInstruction}`,
      messages: [
        {
          role: "user",
          content: `${previous_context ? `PREVIOUS QUESTION: "${previous_context.question}"
PREVIOUS DIRECT ANSWER: "${previous_context.answer?.direct_answer || ""}"
This is a follow-up. Build on the previous answer; do not repeat it.

` : ""}USER QUESTION: "${question}"
QUESTION CATEGORY: ${category}
QUESTION TYPE: ${classified.type}  (${classified.reason})
MODE: ${mode}

${evidenceContext}

══════════ YOUR OUTPUT ══════════

Return this exact JSON object. The verdict, confidence, and strength_score MUST exactly match the COMPUTED EVIDENCE values above — do not change them.

{
  "astrologer_greeting": "<1-2 warm sentences referencing 1 specific natal placement>",
  "verdict": "${evaluation.verdict}",
  "confidence": ${evaluation.confidence},
  "strength_score": ${evaluation.strengthScore},
  "confidence_note": "${evaluation.confidenceCappedReason ? evaluation.confidenceCappedReason.replace(/"/g, "'") : `Based on ${evaluation.allEvidenceCount} computed chart factors.`}",
  "direct_answer": "<${classified.type === "superlative" ? "MUST open with: 'Astrology measures patterns and probabilities, not singular global rankings.' Then 1-2 sentences stating what the chart DOES show." : classified.type === "binary_factual" ? "1-2 sentences. Open: 'A chart shows tendencies, not literal current facts.' Then state the pattern." : classified.type === "temporal" ? "1-2 sentences. Lead with a specific Dasha + transit window with dates from the evidence." : "1-2 sentences. Direct, no hedging. Cite at least one factor."}>",
  "narrative_reading": "<${mode === "guidance" ? "6-8 sentences" : mode === "prediction" ? "3-4 sentences, action-oriented" : "4-6 sentences"} — every sentence cites a specific factor from the evidence list by name and value>",
  "planetary_insight": "<1 sentence naming THE single most influential planet with its sign, house, and strength number>",
  "current_energy": "<1-2 sentences describing the active Dasha period using the exact Maha/Antar lord names and dates from evidence>",
  "timing": "<${classified.type === "temporal" ? "3-4 sentences citing Dasha sub-periods with the dates given in the evidence" : "1-2 sentences with a Dasha or transit window"}>",
  "reasoning_simple": ["<plain-language version of factor 1>", "<factor 2>", "<factor 3>"],
  "technical_details": ["<exact quote of factor 1 from evidence with its value>", "<factor 2 quote>", "<factor 3 quote>", "<factor 4 quote>"],
  "evidence_factors": [${evaluation.evidence.slice(0, 6).map(e => `{"factor": ${JSON.stringify(e.factor)}, "value": ${JSON.stringify(e.value)}, "weight": ${e.weight}}`).join(", ")}],
  "suggested_action": "<one practical action grounded in the strongest factor>",
  "remedial_suggestion": "<one specific Vedic remedy targeting the WEAKEST factor in the evidence — name the factor>",
  "caution": "<warning if any factor has weight ≤ -5, or null>"
}`
        },
      ],
    }),
  });

  if (!aiRes.ok || !aiRes.body) {
    const status = aiRes.status;
    if (status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (status === 402) throw new Error("AI credits exhausted. Please try again later.");
    console.error("AI gateway error:", status, await aiRes.text().catch(() => ""));
    throw new Error("AI analysis failed");
  }

  // ─── Stream the JSON response, push live progress + section copy ───
  const SECTION_COPY: Array<{ key: string; msg: string }> = [
    { key: "astrologer_greeting",  msg: "Composing greeting…" },
    { key: "direct_answer",        msg: "Writing the direct answer…" },
    { key: "narrative_reading",    msg: "Weaving the narrative…" },
    { key: "planetary_insight",    msg: "Naming the strongest planet…" },
    { key: "current_energy",       msg: "Reading the active Dasha…" },
    { key: "timing",               msg: "Locking the timing window…" },
    { key: "reasoning_simple",     msg: "Listing reasons in plain words…" },
    { key: "technical_details",    msg: "Citing classical factors…" },
    { key: "evidence_factors",     msg: "Stamping evidence factors…" },
    { key: "suggested_action",     msg: "Forming the guidance…" },
    { key: "remedial_suggestion",  msg: "Selecting a Vedic remedy…" },
    { key: "caution",              msg: "Checking for cautions…" },
  ];
  const EXPECTED_CHARS = mode === "guidance" ? 2400 : mode === "prediction" ? 1500 : 1800;

  const reader = aiRes.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let contentBuffer = "";
  let lastPush = 0;
  let lastReported = "";
  let lastProgress = 45;
  let lastTokenAt = Date.now();

  const detectMessage = (buf: string): string => {
    let bestIdx = -1;
    let bestKey = "";
    for (const s of SECTION_COPY) {
      const i = buf.lastIndexOf(`"${s.key}"`);
      if (i > bestIdx) { bestIdx = i; bestKey = s.msg; }
    }
    return bestKey || "Weaving your answer…";
  };

  const maybePush = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastPush < 300) return;
    const ratio = Math.min(1, contentBuffer.length / EXPECTED_CHARS);
    const progress = Math.min(96, Math.round(45 + ratio * 51));
    const msg = detectMessage(contentBuffer);
    if (!force && progress === lastProgress && msg === lastReported) return;
    lastPush = now;
    lastProgress = progress;
    lastReported = msg;
    await updateOracleJob(serviceClient, jobId, {
      progress,
      current_message: msg,
    });
  };

  // ─── Synthesis trickle: keep the loader visibly moving even when ─────
  //     no tokens have arrived yet (e.g. Gemini buffering pre-first-token).
  //     Token-driven maybePush() always wins because it can raise lastProgress
  //     past the trickle floor and replace the rotating copy with the actual
  //     detected section.
  const ETA_MS = chosenModel.includes("pro") ? 32000 : 18000;
  const SYNTH_START = Date.now();
  let cycleIdx = 0;
  let firstTokenSeen = false;

  const trickle = setInterval(async () => {
    const elapsed = Date.now() - SYNTH_START;
    // Eased curve 45 → 92 across ETA_MS
    const t = Math.min(1, elapsed / ETA_MS);
    const eased = 1 - Math.pow(1 - t, 2); // ease-out quad
    const target = Math.min(92, Math.round(45 + eased * 47));
    let nextProgress = lastProgress;
    if (target > lastProgress) {
      nextProgress = Math.min(target, lastProgress + 1);
    }

    let nextMsg = lastReported;
    if (!firstTokenSeen) {
      // Cycle rotating copy ~every ~2s so the thought-stream visibly moves.
      nextMsg = SECTION_COPY[cycleIdx % SECTION_COPY.length].msg;
      cycleIdx += 1;
    }

    if (nextProgress !== lastProgress || nextMsg !== lastReported) {
      lastProgress = nextProgress;
      lastReported = nextMsg;
      try {
        await updateOracleJob(serviceClient, jobId, {
          progress: nextProgress,
          current_message: nextMsg,
        });
      } catch { /* swallow */ }
    }
  }, 1100);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = sseBuffer.indexOf("\n")) !== -1) {
        let line = sseBuffer.slice(0, nl);
        sseBuffer = sseBuffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === "message_stop") break;
          const delta = parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta" ? parsed.delta.text : undefined;
          if (typeof delta === "string" && delta.length > 0) {
            contentBuffer += delta;
            lastTokenAt = Date.now();
            firstTokenSeen = true;
            await maybePush();
          }
        } catch {
          // partial JSON across chunks: put it back
          sseBuffer = line + "\n" + sseBuffer;
          break;
        }
      }
    }
  } finally {
    clearInterval(trickle);
  }


  await maybePush(true);
  const decision = parseDecisionPayload(contentBuffer);

  const result = {
    astrologer_greeting: decision.astrologer_greeting || "",
    verdict: evaluation.verdict,
    confidence: evaluation.confidence,
    strength_score: evaluation.strengthScore,
    question_type: evaluation.questionType,
    confidence_note: evaluation.confidenceCappedReason || decision.confidence_note || `Based on ${evaluation.allEvidenceCount} computed chart factors.`,
    direct_answer: decision.direct_answer || "",
    narrative_reading: decision.narrative_reading || "",
    planetary_insight: decision.planetary_insight || "",
    current_energy: decision.current_energy || "",
    timing: decision.timing || "",
    reasoning_simple: Array.isArray(decision.reasoning_simple) ? decision.reasoning_simple.slice(0, 5) : [],
    technical_details: Array.isArray(decision.technical_details) ? decision.technical_details.slice(0, 6) : [],
    evidence_factors: evaluation.evidence.map((e) => ({ factor: e.factor, value: e.value, weight: e.weight })),
    suggested_action: decision.suggested_action || "",
    remedial_suggestion: decision.remedial_suggestion || "",
    caution: decision.caution || null,
  };

  await updateOracleJob(serviceClient, jobId, {
    status: "sealing",
    progress: 97,
    current_layer: 8,
    current_message: "Sealing the reading and recording it in your journal",
  });

  const { data: inserted, error: readingError } = await serviceClient
    .from("oracle_readings")
    .insert({ user_id: userId, question, category, response: { ...result, voice: guru.voice }, language: language || "en" })
    .select("id, created_at")
    .single();
  if (readingError) throw readingError;

  const newUsage = { ...usage, oracle_count: (usage.oracle_count || 0) + 1 };
  await serviceClient.from("profiles").update({ feature_usage: newUsage }).eq("user_id", userId);

  await updateOracleJob(serviceClient, jobId, {
    status: "completed",
    progress: 100,
    current_layer: 8,
    current_message: "Your reading is ready",
    result,
    reading_id: inserted?.id ?? null,
    completed_at: new Date().toISOString(),
    error: null,
  });
}

// ─── Shared AI body builder (used by both the legacy job path and the SSE stream) ───
function buildAiBody(args: {
  chosenModel: string;
  question: string;
  category: string;
  mode: string;
  classified: { type: QuestionType; reason: string };
  evaluation: any;
  evidenceContext: string;
  previous_context?: any;
  languageInstruction?: string;
  guru?: GuruContext;
}) {
  const { chosenModel, question, category, mode, classified, evaluation, evidenceContext, previous_context, languageInstruction = "", guru } = args;
  const guruPrefix = guru?.enabled ? guru.systemBlock + "\n\n" + guru.writingRules + "\n\n" : "";
  return {
    model: chosenModel,
    stream: true,
    max_tokens: 4096,
    temperature: 0.85,
    system: `${guruPrefix}You are a senior Vedic astrologer NARRATING a chart reading whose verdict, confidence, and weighted evidence have ALREADY been calculated by a Jyotish engine. Your only job is to translate the numbers into warm, specific, citation-rich prose.


══════════ ABSOLUTE RULES ══════════

1. NEVER invent the verdict, confidence, or strength score. They are passed to you in the COMPUTED EVIDENCE block. Use them exactly.

2. FORBIDDEN HEDGE WORDS — never use:
   "suggests", "tends to", "may", "might", "the energy of", "energy points to",
   "likely", "could indicate", "is wired for", "the universe is", "appears to".
   Replace with concrete citations to the numbers you were given.

3. EVERY paragraph in narrative_reading MUST cite at least one specific factor from the "Top weighted factors" list — by exact name and value.
4. technical_details MUST be direct quotes of factors from the evidence list.
5. For SUPERLATIVE questions, open with: "Astrology measures patterns and probabilities, not singular global rankings."
6. For BINARY_FACTUAL questions, say a chart shows tendencies, not literal current status.
7. For TEMPORAL questions, timing must use the actual Vimshottari Dasha periods given in the evidence plus current transits.
8. Output ONLY valid JSON, no markdown fences.${languageInstruction}`,
    messages: [
      {
        role: "user",
        content: `${previous_context ? `PREVIOUS QUESTION: "${previous_context.question}"
PREVIOUS DIRECT ANSWER: "${previous_context.answer?.direct_answer || ""}"
This is a follow-up. Build on the previous answer; do not repeat it.

` : ""}USER QUESTION: "${question}"
QUESTION CATEGORY: ${category}
QUESTION TYPE: ${classified.type}  (${classified.reason})
MODE: ${mode}

${evidenceContext}

══════════ YOUR OUTPUT ══════════

Return this exact JSON object. The verdict, confidence, and strength_score MUST exactly match the COMPUTED EVIDENCE values above — do not change them.

{
  "astrologer_greeting": "<1-2 warm sentences referencing 1 specific natal placement>",
  "verdict": "${evaluation.verdict}",
  "confidence": ${evaluation.confidence},
  "strength_score": ${evaluation.strengthScore},
  "confidence_note": "${evaluation.confidenceCappedReason ? evaluation.confidenceCappedReason.replace(/"/g, "'") : `Based on ${evaluation.allEvidenceCount} computed chart factors.`}",
  "direct_answer": "<${classified.type === "superlative" ? "MUST open with: 'Astrology measures patterns and probabilities, not singular global rankings.' Then 1-2 sentences stating what the chart DOES show." : classified.type === "binary_factual" ? "1-2 sentences. Open: 'A chart shows tendencies, not literal current facts.' Then state the pattern." : classified.type === "temporal" ? "1-2 sentences. Lead with a specific Dasha + transit window with dates from the evidence." : "1-2 sentences. Direct, no hedging. Cite at least one factor."}>",
  "narrative_reading": "<${mode === "guidance" ? "6-8 sentences" : mode === "prediction" ? "3-4 sentences, action-oriented" : "4-6 sentences"} — every sentence cites a specific factor from the evidence list by name and value>",
  "planetary_insight": "<1 sentence naming THE single most influential planet with its sign, house, and strength number>",
  "current_energy": "<1-2 sentences describing the active Dasha period using the exact Maha/Antar lord names and dates from evidence>",
  "timing": "<${classified.type === "temporal" ? "3-4 sentences citing Dasha sub-periods with the dates given in the evidence" : "1-2 sentences with a Dasha or transit window"}>",
  "reasoning_simple": ["<plain-language version of factor 1>", "<factor 2>", "<factor 3>"],
  "technical_details": ["<exact quote of factor 1 from evidence with its value>", "<factor 2 quote>", "<factor 3 quote>", "<factor 4 quote>"],
  "evidence_factors": [${evaluation.evidence.slice(0, 6).map((e: any) => `{"factor": ${JSON.stringify(e.factor)}, "value": ${JSON.stringify(e.value)}, "weight": ${e.weight}}`).join(", ")}],
  "suggested_action": "<one practical action grounded in the strongest factor>",
  "remedial_suggestion": "<one specific Vedic remedy targeting the WEAKEST factor in the evidence — name the factor>",
  "caution": "<warning if any factor has weight ≤ -5, or null>"
}`,
      },
    ],
  };
}

// ─── SSE Streaming branch: real Gemini tokens piped to the client ───
async function runOracleStream(args: {
  serviceClient: any;
  userId: string;
  question: string;
  category: string;
  mode: string;
  previous_context?: any;
  ai_model?: string;
  chart_id?: string;
  tier: Tier;
  usage: { dreams_count?: number; oracle_count?: number; period_start?: string | null };
  language?: string;
}): Promise<Response> {
  const { serviceClient, userId, question, category, mode, previous_context, ai_model, chart_id, tier, usage, language } = args;
  const languageInstruction = buildLanguageInstruction(language || "en");
  const guru = await resolveGuruContext(serviceClient, userId);

  // Resolve the chart (same lookup order as the legacy path)
  let chart: any = null;
  if (chart_id) {
    const { data } = await serviceClient.from("birth_charts").select("id, chart_data, date_of_birth").eq("id", chart_id).eq("user_id", userId).maybeSingle();
    chart = data;
  }
  if (!chart) {
    const { data } = await serviceClient.from("birth_charts").select("id, chart_data, date_of_birth").eq("user_id", userId).eq("is_primary", true).maybeSingle();
    chart = data;
  }
  if (!chart) {
    const { data } = await serviceClient.from("birth_charts").select("id, chart_data, date_of_birth").eq("user_id", userId).order("created_at", { ascending: false }).limit(1);
    chart = data?.[0];
  }
  if (!chart?.chart_data) {
    return new Response(JSON.stringify({ error: "No birth chart found. Please generate your chart first." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const chartData = chart.chart_data as any;
  const transits = getCurrentTransits();
  const classified = classifyQuestion(question);
  const evaluation = evaluateQuestion({ category, questionType: classified.type, chartData, transits });
  const evidenceContext = buildEvidenceContext({ chartData, category, evaluation, transits });

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const chosenModel = ai_model || modelForTier(tier);

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify(buildAiBody({ chosenModel, question, category, mode, classified, evaluation, evidenceContext, previous_context, languageInstruction, guru })),
  });

  if (!aiRes.ok || !aiRes.body) {
    const status = aiRes.status;
    const msg = status === 429 ? "Rate limit exceeded. Please try again in a moment."
      : status === 402 ? "AI credits exhausted. Please try again later."
      : "AI analysis failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: status === 429 || status === 402 ? status : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SECTION_KEYS = [
    "astrologer_greeting","direct_answer","narrative_reading","planetary_insight",
    "current_energy","timing","reasoning_simple","technical_details",
    "evidence_factors","suggested_action","remedial_suggestion","caution",
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try { controller.enqueue(encoder.encode("data: " + JSON.stringify(obj) + "\n\n")); }
        catch { /* client disconnected */ }
      };

      // Initial frame so the client knows the channel is alive
      send({ phase: "synthesis" });

      const reader = aiRes.body!.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let contentBuffer = "";
      let currentSection = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = sseBuffer.indexOf("\n")) !== -1) {
            let line = sseBuffer.slice(0, nl);
            sseBuffer = sseBuffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();

            try {
              const parsed = JSON.parse(payload);
              if (parsed.type === "message_stop") break;
              const delta = parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta" ? parsed.delta.text : undefined;
              if (typeof delta === "string" && delta.length > 0) {
                contentBuffer += delta;
                send({ t: delta });

                // Detect newest section key the model has started writing
                let bestIdx = -1;
                let bestKey = currentSection;
                for (const k of SECTION_KEYS) {
                  const i = contentBuffer.lastIndexOf(`"${k}"`);
                  if (i > bestIdx) { bestIdx = i; bestKey = k; }
                }
                if (bestKey && bestKey !== currentSection) {
                  currentSection = bestKey;
                  send({ section: currentSection });
                }
              }
            } catch {
              // Partial JSON across chunks — put it back and wait for more data
              sseBuffer = line + "\n" + sseBuffer;
              break;
            }
          }
        }

        // Parse final JSON and persist
        const decision = parseDecisionPayload(contentBuffer);
        const result = {
          astrologer_greeting: decision.astrologer_greeting || "",
          verdict: evaluation.verdict,
          confidence: evaluation.confidence,
          strength_score: evaluation.strengthScore,
          question_type: evaluation.questionType,
          confidence_note: evaluation.confidenceCappedReason || decision.confidence_note || `Based on ${evaluation.allEvidenceCount} computed chart factors.`,
          direct_answer: decision.direct_answer || "",
          narrative_reading: decision.narrative_reading || "",
          planetary_insight: decision.planetary_insight || "",
          current_energy: decision.current_energy || "",
          timing: decision.timing || "",
          reasoning_simple: Array.isArray(decision.reasoning_simple) ? decision.reasoning_simple.slice(0, 5) : [],
          technical_details: Array.isArray(decision.technical_details) ? decision.technical_details.slice(0, 6) : [],
          evidence_factors: evaluation.evidence.map((e: any) => ({ factor: e.factor, value: e.value, weight: e.weight })),
          suggested_action: decision.suggested_action || "",
          remedial_suggestion: decision.remedial_suggestion || "",
          caution: decision.caution || null,
        };

        const { data: inserted, error: readingError } = await serviceClient
          .from("oracle_readings")
          .insert({ user_id: userId, question, category, response: result, language: language || "en" })
          .select("id, created_at")
          .single();
        if (readingError) throw readingError;

        const newUsage = { ...usage, oracle_count: (usage.oracle_count || 0) + 1 };
        await serviceClient.from("profiles").update({ feature_usage: newUsage }).eq("user_id", userId);

        send({ done: 1, reading_id: inserted?.id ?? null, final: result, created_at: inserted?.created_at ?? null });
      } catch (e) {
        console.error("oracle stream error:", e);
        send({ error: e instanceof Error ? e.message : "Unknown error" });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
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
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const { question, category = "general", mode = "insight", previous_context, ai_model, chart_id, stream: wantStream, language: bodyLanguage } = await req.json();
    const language = normalizeLanguage(bodyLanguage);
    if (!question || question.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Please enter a meaningful question (at least 5 characters)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, feature_usage")
      .eq("user_id", userId)
      .maybeSingle();

    const access = await resolveAccess(supabase, userId, corsHeaders);
    const tier = access.tier;
    const rawUsage = profile?.feature_usage as { dreams_count?: number; oracle_count?: number; period_start?: string | null } | null;
    const usage = rawUsage || { dreams_count: 0, oracle_count: 0, period_start: null };
    const periodStart = usage.period_start ? new Date(usage.period_start) : null;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    if (!periodStart || periodStart < startOfMonth) {
      usage.dreams_count = 0;
      usage.oracle_count = 0;
      usage.period_start = startOfMonth.toISOString();
    }

    // Monthly Oracle allowance, driven by the shared tier table.
    const oracleUsed = usage.oracle_count || 0;
    if (!access.withinQuota("ai_chat", oracleUsed)) {
      return access.denyQuota(
        "ai_chat",
        oracleUsed,
        access.tier === "darshana"
          ? `You've used your free Oracle questions (${access.limit("ai_chat")}/month). Upgrade for more.`
          : "You've reached your Oracle question limit for this month.",
      );
    }

    // ─── NEW: SSE streaming path (preferred for live UI) ───
    if (wantStream === true) {
      return await runOracleStream({
        serviceClient,
        userId,
        question: question.trim(),
        category,
        mode,
        previous_context,
        ai_model,
        chart_id,
        tier,
        usage,
        language,
      });
    }

    const { data: createdJob, error: jobError } = await serviceClient
      .from("oracle_jobs")
      .insert({
        user_id: userId,
        question: question.trim(),
        category,
        mode,
        chart_id: chart_id ?? null,
        previous_context: previous_context ?? null,
        status: "queued",
        progress: 3,
        current_layer: 1,
        current_message: "Opening the Guru channel",
      })
      .select("id")
      .single();
    if (jobError || !createdJob?.id) throw jobError || new Error("Failed to create oracle job");

    const jobId = createdJob.id as string;
    const generationTask = runOracleDecisionJob({
      serviceClient,
      jobId,
      userId,
      question: question.trim(),
      category,
      mode,
      previous_context,
      ai_model,
      chart_id,
      tier,
      usage,
      language,
    }).catch(async (error) => {
      console.error("generate-decision background error:", error);
      await updateOracleJob(serviceClient, jobId, {
        status: "failed",
        progress: 100,
        current_layer: 8,
        current_message: "The Guru reading was interrupted",
        error: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      });
    });

    // @ts-ignore - EdgeRuntime is provided by the edge runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore - EdgeRuntime is provided by the edge runtime
      EdgeRuntime.waitUntil(generationTask);
    }

    return new Response(JSON.stringify({ job_id: jobId, status: "queued" }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-decision error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
