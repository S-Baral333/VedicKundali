// Varshaphal — Tajik Annual Solar Return chart.
// Phase 3 (Elite). Given an existing natal chart (chart_id) + target year,
// compute the moment Sun returns to its natal sidereal longitude in that year,
// then build the annual chart frame: Varsha Lagna, Muntha, Year Lord (Varshesh),
// 12-month Munda dasha sequence.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Body, EclipticLongitude, MakeTime, GeoVector, Ecliptic } from "https://esm.sh/astronomy-engine@2.1.19";
import { normalizeLanguage, buildLanguageInstruction } from "../_shared/languages.ts";
import { resolveGuruContext, applyGuru } from "../_shared/guru.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_LORD: Record<string, string> = {
  Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon", Leo:"Sun",
  Virgo:"Mercury", Libra:"Venus", Scorpio:"Mars", Sagittarius:"Jupiter",
  Capricorn:"Saturn", Aquarius:"Saturn", Pisces:"Jupiter",
};
const VARA_LORDS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
// Munda Dasha months per sign (12-sign cycle, 1 month each — standard simplification).
const MUNDA_ORDER = SIGNS;

function lahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  return 23.8531 + 0.01396663 * T * 100 + 0.000308 * T * T;
}

function julianDay(year: number, month: number, day: number, utHour: number): number {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + utHour / 24 + B - 1524.5;
}

function siderealSunAt(d: Date): number {
  const t = MakeTime(d);
  const trop = Ecliptic(GeoVector(Body.Sun, t, true)).elon;
  const jd = julianDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours() + d.getUTCMinutes() / 60);
  const ay = lahiriAyanamsa(jd);
  return ((trop - ay) % 360 + 360) % 360;
}

// Binary search the moment Sun crosses natal sidereal longitude within ±36h of birthday in target year.
function findSolarReturn(natalSunLng: number, year: number, birthMonth: number, birthDay: number, birthUtHour: number): Date {
  // Start from the birthday in target year ± 1.5 days.
  const center = new Date(Date.UTC(year, birthMonth - 1, birthDay, Math.floor(birthUtHour), 0));
  let lo = new Date(center.getTime() - 36 * 3600 * 1000);
  let hi = new Date(center.getTime() + 36 * 3600 * 1000);
  const norm = (a: number, b: number) => {
    let d = a - b;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  };
  let dLo = norm(siderealSunAt(lo), natalSunLng);
  // Walk hi forward in 12h chunks until sign change in (sun - natal) crossing zero
  let dHi = norm(siderealSunAt(hi), natalSunLng);
  let safety = 0;
  while (dLo * dHi > 0 && safety < 60) {
    hi = new Date(hi.getTime() + 12 * 3600 * 1000);
    dHi = norm(siderealSunAt(hi), natalSunLng);
    safety++;
  }
  // Bisect to ~1 minute accuracy.
  for (let i = 0; i < 32; i++) {
    const mid = new Date(Math.floor((lo.getTime() + hi.getTime()) / 2));
    const dM = norm(siderealSunAt(mid), natalSunLng);
    if (dLo * dM <= 0) {
      hi = mid; dHi = dM;
    } else {
      lo = mid; dLo = dM;
    }
    if (Math.abs(hi.getTime() - lo.getTime()) < 60 * 1000) break;
  }
  return new Date(Math.floor((lo.getTime() + hi.getTime()) / 2));
}

// Approximate Lahiri-sidereal Ascendant for a UTC moment + lat/lng (degrees).
// Uses standard Equal-house first-house computation — sufficient for Varsha Lagna sign.
function siderealAscendant(d: Date, lat: number, lng: number): number {
  const jd = julianDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600);
  // GMST in degrees
  const T = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
  gmst = ((gmst % 360) + 360) % 360;
  const lst = (gmst + lng) % 360;
  // Tropical ascendant
  const ε = 23.4392911 * Math.PI / 180;
  const ramc = lst * Math.PI / 180;
  const φ = lat * Math.PI / 180;
  const tropAsc = Math.atan2(
    -Math.cos(ramc),
    Math.sin(ramc) * Math.cos(ε) + Math.tan(φ) * Math.sin(ε)
  ) * 180 / Math.PI;
  let asc = ((tropAsc % 360) + 360) % 360;
  // Quadrant correction
  if (asc < 180) asc += 180;
  if (asc >= 360) asc -= 360;
  const ay = lahiriAyanamsa(jd);
  return ((asc - ay) % 360 + 360) % 360;
}

// Compute Varshesh (Year Lord) per Tajik rules — choose strongest among:
// Lord of Varsha Lagna, Lord of Muntha sign, Lord of Sun's sign, Lord of weekday.
// Phase-3 lite: pick Lord of Varsha Lagna by default; tie-broken by weekday lord match.
function computeVarshesh(varshaLagnaSign: string, muntaSign: string, sunSign: string, weekdayLord: string): { lord: string; reason: string } {
  const candidates = [
    { lord: SIGN_LORD[varshaLagnaSign], src: "Varsha Lagna" },
    { lord: SIGN_LORD[muntaSign], src: "Muntha sign" },
    { lord: SIGN_LORD[sunSign], src: "Sun sign" },
    { lord: weekdayLord, src: "Day Lord" },
  ];
  // Score by frequency.
  const tally = new Map<string, { count: number; sources: string[] }>();
  for (const c of candidates) {
    const t = tally.get(c.lord) || { count: 0, sources: [] };
    t.count += 1;
    t.sources.push(c.src);
    tally.set(c.lord, t);
  }
  let best: { lord: string; sources: string[] } | null = null;
  for (const [lord, info] of tally.entries()) {
    if (!best || info.count > tally.get(best.lord)!.count) {
      best = { lord, sources: info.sources };
    }
  }
  return { lord: best!.lord, reason: best!.sources.join(" + ") };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const chart_id = String(body.chart_id || "");
    const year = Number(body.year);
    const language = normalizeLanguage(body?.language);
    if (!chart_id || !Number.isFinite(year) || year < 1900 || year > 2100) {
      return new Response(JSON.stringify({ error: "chart_id and valid year (1900-2100) required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: chart, error: chartErr } = await supabase
      .from("birth_charts")
      .select("id, user_id, full_name, date_of_birth, birth_time, birthplace, latitude, longitude, chart_data")
      .eq("id", chart_id)
      .maybeSingle();
    if (chartErr || !chart) {
      return new Response(JSON.stringify({ error: "Chart not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (chart.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cd: any = chart.chart_data || {};
    const natalSunPlanet = (cd.planets || []).find((p: any) => p.name === "Sun");
    if (!natalSunPlanet) {
      return new Response(JSON.stringify({ error: "Natal Sun missing — please regenerate chart first" }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const natalSunLng = Number(natalSunPlanet.totalDegree ?? 0);
    const natalAscSign = String(cd.ascendant?.sign || "Aries");

    // Birth date → month/day for solar-return search anchor
    const [byStr, bmStr, bdStr] = String(chart.date_of_birth).split("-");
    const bMonth = Number(bmStr);
    const bDay = Number(bdStr);
    const bTimeParts = String(chart.birth_time || "12:00").split(":");
    const bHour = Number(bTimeParts[0]) + (Number(bTimeParts[1] || "0") / 60);

    const srMoment = findSolarReturn(natalSunLng, year, bMonth, bDay, bHour);

    // Varsha Lagna (sidereal ascendant at SR moment, natal location)
    const varshaLagnaLng = siderealAscendant(srMoment, Number(chart.latitude), Number(chart.longitude));
    const varshaLagnaSign = SIGNS[Math.floor(varshaLagnaLng / 30)];

    // Muntha — progresses 1 sign/year from natal Lagna, starting at age 0 = natal Lagna sign.
    const ageThisYear = year - Number(byStr);
    const natalAscIdx = SIGNS.indexOf(natalAscSign);
    const muntaSign = SIGNS[((natalAscIdx + Math.max(0, ageThisYear)) % 12 + 12) % 12];

    // Sun sign at SR (sidereal — lives in same sign as natal Sun by definition, but compute to confirm).
    const srSunLng = siderealSunAt(srMoment);
    const srSunSign = SIGNS[Math.floor(srSunLng / 30)];

    // Weekday lord
    const weekdayLord = VARA_LORDS[srMoment.getUTCDay()];
    const varshesh = computeVarshesh(varshaLagnaSign, muntaSign, srSunSign, weekdayLord);

    // Munda Dasha — 12-month sequence, 1 sign per month starting from Varsha Lagna.
    const munda: { month: number; sign: string; lord: string; start: string; end: string }[] = [];
    const totalMs = 365.25 * 24 * 3600 * 1000;
    const perMonth = totalMs / 12;
    for (let i = 0; i < 12; i++) {
      const start = new Date(srMoment.getTime() + i * perMonth);
      const end = new Date(srMoment.getTime() + (i + 1) * perMonth);
      const sign = MUNDA_ORDER[(SIGNS.indexOf(varshaLagnaSign) + i) % 12];
      munda.push({
        month: i + 1,
        sign,
        lord: SIGN_LORD[sign],
        start: start.toISOString(),
        end: end.toISOString(),
      });
    }

    // Optional AI narrative (fail-soft)
    let summary = "";
    let ai_skipped = false;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      console.warn("generate-varshaphal: ANTHROPIC_API_KEY not set — AI narrative skipped");
      ai_skipped = true;
    } else {
      try {
        const mundaHighlights = munda.slice(0, 4).map(m => `Month ${m.month}: ${m.sign} (${m.lord})`).join(", ");
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 200,
            temperature: 0.7,
            system: applyGuru(
              "You are a Vedic astrologer explaining a Varshaphal (Tajik annual solar-return) chart. Write 3-4 sentences describing the year's energy: the Varsha Lagna's quality, what the Muntha position means, why this Year Lord shapes the year, and one highlight from the Munda Dasha opening months. Be specific and avoid hedging words.",
              await resolveGuruContext(supabase, user.id)
            ) + buildLanguageInstruction(language),
            messages: [
              {
                role: "user",
                content: `Varshaphal ${year} for ${chart.full_name}:
- Varsha Lagna: ${varshaLagnaSign}
- Muntha: ${muntaSign} (age ${ageThisYear})
- Year Lord (Varshesh): ${varshesh.lord} (${varshesh.reason})
- Sun returns to: ${srSunSign}
- Munda Dasha opening months: ${mundaHighlights}

Natal chart summary: ${cd.llm_summary || `Ascendant ${cd.ascendant?.sign || "unknown"}, Moon ${cd.moon_sign || "unknown"}`}`,
              },
            ],
          }),
        });
        if (aiRes.ok) {
          const j = await aiRes.json();
          summary = j?.content?.[0]?.text?.trim() || "";
        }
      } catch (e) {
        console.warn("Varshaphal AI narrative failed (non-fatal):", e);
      }
    }

    const result = {
      chart_id,
      year,
      solar_return_moment_utc: srMoment.toISOString(),
      varsha_lagna: { sign: varshaLagnaSign, longitude: Math.round(varshaLagnaLng * 100) / 100 },
      muntha: { sign: muntaSign, age_years: ageThisYear },
      year_lord: { planet: varshesh.lord, reason: varshesh.reason },
      sun_sign_at_return: srSunSign,
      munda_dasha: munda,
      summary,
      ai_skipped,
      generated_at: new Date().toISOString(),
    };

    // Cache inside chart_data.varshaphal_cache[year]
    const cache = (cd.varshaphal_cache && typeof cd.varshaphal_cache === "object") ? { ...cd.varshaphal_cache } : {};
    cache[String(year)] = result;
    await supabase
      .from("birth_charts")
      .update({ chart_data: { ...cd, varshaphal_cache: cache } })
      .eq("id", chart_id);

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-varshaphal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
