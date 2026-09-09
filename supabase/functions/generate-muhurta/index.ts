import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Body, EclipticLongitude, MakeTime, GeoVector, Ecliptic } from "https://esm.sh/astronomy-engine@2.1.19";
import { normalizeLanguage, buildLanguageInstruction } from "../_shared/languages.ts";
import { resolveGuruContext, applyGuru } from "../_shared/guru.ts";
import { resolveAccess } from "../_shared/access.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const NAKSHATRAS = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha",
  "Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
  "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"
];
const TITHIS = [
  "Shukla Pratipada","Shukla Dwitiya","Shukla Tritiya","Shukla Chaturthi","Shukla Panchami",
  "Shukla Shashthi","Shukla Saptami","Shukla Ashtami","Shukla Navami","Shukla Dashami",
  "Shukla Ekadashi","Shukla Dwadashi","Shukla Trayodashi","Shukla Chaturdashi","Purnima",
  "Krishna Pratipada","Krishna Dwitiya","Krishna Tritiya","Krishna Chaturthi","Krishna Panchami",
  "Krishna Shashthi","Krishna Saptami","Krishna Ashtami","Krishna Navami","Krishna Dashami",
  "Krishna Ekadashi","Krishna Dwadashi","Krishna Trayodashi","Krishna Chaturdashi","Amavasya"
];
const VARAS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// Rikta tithis (4th, 9th, 14th of each paksha) — generally inauspicious
const RIKTA_TITHIS = new Set([3, 8, 13, 18, 23, 28]); // 0-indexed

// Activity-specific favorable nakshatras
const ACTIVITY_NAKSHATRAS: Record<string, Set<number>> = {
  marriage: new Set([3,4,9,11,12,14,16,20,25,26]), // Rohini, Mrigashira, Magha, Uttara Phalguni, Hasta, Swati, Anuradha, Uttara Ashadha, Uttara Bhadrapada, Revati
  business: new Set([0,3,4,7,12,13,14,16,21,22,26]), // Ashwini, Rohini, Mrigashira, Pushya, Hasta, Chitra, Swati, Anuradha, Shravana, Dhanishta, Revati
  travel: new Set([0,4,7,12,16,21,26]), // Ashwini, Mrigashira, Pushya, Hasta, Anuradha, Shravana, Revati
  medical: new Set([0,3,7,12,21,26]), // Ashwini, Rohini, Pushya, Hasta, Shravana, Revati
  education: new Set([0,3,6,7,12,14,16,21,26]), // Ashwini, Rohini, Punarvasu, Pushya, Hasta, Swati, Anuradha, Shravana, Revati
  property: new Set([3,11,12,20,25,26]), // Rohini, Uttara Phalguni, Hasta, Uttara Ashadha, Uttara Bhadrapada, Revati
  religious: new Set([0,3,6,7,9,12,14,16,21,25,26]), // Ashwini, Rohini, Punarvasu, Pushya, Magha, Hasta, Swati, Anuradha, Shravana, Uttara Bhadrapada, Revati
  general: new Set([0,3,4,6,7,12,14,16,21,26]), // Generally auspicious set
};

// Activity-specific favorable varas (day indices 0=Sun..6=Sat)
const ACTIVITY_VARAS: Record<string, Set<number>> = {
  marriage: new Set([1,3,4,5]),   // Mon, Wed, Thu, Fri
  business: new Set([1,3,4,5]),   // Mon, Wed, Thu, Fri
  travel: new Set([1,3,5]),       // Mon, Wed, Fri
  medical: new Set([1,3,6]),      // Mon, Wed, Sat
  education: new Set([1,3,4,5]),  // Mon, Wed, Thu, Fri
  property: new Set([1,4,5]),     // Mon, Thu, Fri
  religious: new Set([0,1,4]),    // Sun, Mon, Thu
  general: new Set([1,3,4,5]),
};

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

function getSiderealLongitude(body: any, time: any, ayanamsa: number): number {
  let tropLng: number;
  if (body === Body.Sun) {
    const geo = GeoVector(Body.Sun, time, true);
    const ecl = Ecliptic(geo);
    tropLng = ecl.elon;
  } else {
    tropLng = EclipticLongitude(body, time);
  }
  return ((tropLng - ayanamsa) % 360 + 360) % 360;
}

function computeDayPanchang(date: Date) {
  const year = date.getUTCFullYear(), month = date.getUTCMonth() + 1, day = date.getUTCDate();
  const jd = julianDay(year, month, day, 12.0);
  const ayanamsa = lahiriAyanamsa(jd);
  const time = MakeTime(new Date(Date.UTC(year, month - 1, day, 12)));

  const moonSid = getSiderealLongitude(Body.Moon, time, ayanamsa);
  const sunSid = getSiderealLongitude(Body.Sun, time, ayanamsa);

  // Tithi: angular difference Moon - Sun
  const moonTrop = EclipticLongitude(Body.Moon, time);
  const sunGeo = GeoVector(Body.Sun, time, true);
  const sunTrop = Ecliptic(sunGeo).elon;
  const diff = ((moonTrop - sunTrop) % 360 + 360) % 360;
  const tithiIndex = Math.floor(diff / 12);

  // Nakshatra from sidereal Moon
  const nakshatraIndex = Math.floor(moonSid / (360 / 27));

  // Vara
  const varaIndex = date.getUTCDay();

  // Moon sign index for transit compatibility
  const moonSignIndex = Math.floor(moonSid / 30);

  return {
    tithiIndex,
    tithi: TITHIS[tithiIndex] || TITHIS[0],
    nakshatraIndex,
    nakshatra: NAKSHATRAS[nakshatraIndex] || NAKSHATRAS[0],
    varaIndex,
    vara: VARAS[varaIndex],
    moonSignIndex,
    moonSign: SIGNS[moonSignIndex],
    moonSidDegree: moonSid,
  };
}

function scoreDay(panchang: ReturnType<typeof computeDayPanchang>, activity: string, natalMoonSignIndex: number) {
  const favNak = ACTIVITY_NAKSHATRAS[activity] || ACTIVITY_NAKSHATRAS.general;
  const favVara = ACTIVITY_VARAS[activity] || ACTIVITY_VARAS.general;

  // Vara score (0-10)
  const varaScore = favVara.has(panchang.varaIndex) ? 9 : 4;

  // Nakshatra score (0-10)
  const nakScore = favNak.has(panchang.nakshatraIndex) ? 9 : 4;

  // Tithi score (0-10)
  let tithiScore = 6;
  if (RIKTA_TITHIS.has(panchang.tithiIndex)) {
    tithiScore = 2; // Rikta tithis are inauspicious
  } else if (panchang.tithiIndex === 14) {
    tithiScore = 8; // Purnima
  } else if (panchang.tithiIndex === 29) {
    tithiScore = 3; // Amavasya generally avoided
  } else if (panchang.tithiIndex < 14) {
    tithiScore = 7; // Shukla paksha generally better
  }

  // Transit compatibility: Moon sign relationship to natal Moon
  const signDiff = ((panchang.moonSignIndex - natalMoonSignIndex) % 12 + 12) % 12;
  let transitScore = 5;
  if ([0, 4, 8].includes(signDiff)) transitScore = 9; // same, trine
  else if ([2, 6, 10].includes(signDiff)) transitScore = 7; // sextile-like
  else if ([5, 7].includes(signDiff)) transitScore = 3; // 6/8 relationship — bad
  else if (signDiff === 11) transitScore = 8; // 12th is ok for spiritual
  else transitScore = 5;

  // Weighted sum → 0-100
  const raw = varaScore * 0.20 + nakScore * 0.35 + tithiScore * 0.25 + transitScore * 0.20;
  const score = Math.round(raw * 10); // scale 0-10 → 0-100

  let quality: "excellent" | "good" | "average" | "poor";
  if (score >= 80) quality = "excellent";
  else if (score >= 60) quality = "good";
  else if (score >= 40) quality = "average";
  else quality = "poor";

  return {
    score,
    quality,
    factors: {
      vara: varaScore,
      nakshatra: nakScore,
      tithi: tithiScore,
      transit: transitScore,
    },
  };
}

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

    // ─── Tier gate ───
    const access = await resolveAccess(supabase, userId, corsHeaders);
    if (!access.can("muhurta_calculator")) {
      return access.denyFeature("muhurta_calculator", "Muhurta (auspicious timing) requires a Sadhaka subscription.");
    }

    const { activity = "general", startDate, endDate, chart_id, language: langInput } = await req.json();
    const language = normalizeLanguage(langInput);

    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: "Please provide start and end dates." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (daysDiff < 1 || daysDiff > 90) {
      return new Response(JSON.stringify({ error: "Date range must be 1-90 days." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve chart: explicit chart_id > primary > most recent
    let chart: any = null;
    if (chart_id) {
      const { data } = await supabase
        .from("birth_charts")
        .select("id, chart_data")
        .eq("id", chart_id)
        .eq("user_id", userId)
        .maybeSingle();
      chart = data;
    }
    if (!chart) {
      const { data: primary } = await supabase
        .from("birth_charts")
        .select("id, chart_data")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .maybeSingle();
      chart = primary;
    }
    if (!chart) {
      const { data: charts } = await supabase
        .from("birth_charts")
        .select("id, chart_data")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      chart = charts?.[0];
    }
    if (!chart?.chart_data) {
      return new Response(JSON.stringify({ error: "No birth chart found. Please generate your chart first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chartData = chart.chart_data as any;
    // Get natal Moon sign index
    const natalMoonSign = chartData.moon_sign || chartData.planets?.moon?.sign || "Aries";
    const natalMoonSignIndex = SIGNS.indexOf(natalMoonSign);

    // Compute Panchang + score for each day
    const days: any[] = [];
    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + i);

      const panchang = computeDayPanchang(date);
      const scoring = scoreDay(panchang, activity, natalMoonSignIndex >= 0 ? natalMoonSignIndex : 0);

      days.push({
        date: date.toISOString().split("T")[0],
        day: panchang.vara,
        nakshatra: panchang.nakshatra,
        tithi: panchang.tithi,
        moonSign: panchang.moonSign,
        ...scoring,
      });
    }

    // Sort by score descending
    days.sort((a, b) => b.score - a.score);

    // Send top 5 to AI for summaries
    const top = days.slice(0, 5);
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const topSummaryPrompt = top.map((d, i) =>
      `${i + 1}. ${d.date} (${d.day}) — Score: ${d.score}, Nakshatra: ${d.nakshatra}, Tithi: ${d.tithi}, Moon in ${d.moonSign}, Quality: ${d.quality}`
    ).join("\n");

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: applyGuru("You are a Vedic Muhurta expert. Given ranked auspicious days, provide a brief 1-2 sentence summary for each explaining WHY it's suitable for the activity. Return ONLY a JSON array of strings, one summary per day in the same order.", await resolveGuruContext(supabase, userId)) + buildLanguageInstruction(language),
        messages: [
          {
            role: "user",
            content: `Activity: ${activity}\nNatal Moon Sign: ${natalMoonSign}\n\nTop days:\n${topSummaryPrompt}\n\nReturn JSON array of 1-2 sentence summaries for each day above.`,
          },
        ],
      }),
    });

    let summaries: string[] = [];
    if (aiRes.ok) {
      const aiData = await aiRes.json();
      const raw = aiData.content?.[0]?.text || "";
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        try { summaries = JSON.parse(match[0]); } catch { /* ignore */ }
      }
    }

    // Attach summaries to top days, leave rest with generic summary
    for (let i = 0; i < days.length; i++) {
      if (i < summaries.length) {
        days[i].summary = summaries[i];
      } else {
        days[i].summary = days[i].quality === "excellent" || days[i].quality === "good"
          ? `${days[i].nakshatra} nakshatra on ${days[i].day} with ${days[i].tithi} provides ${days[i].quality} conditions for ${activity}.`
          : `${days[i].day} with ${days[i].tithi} and ${days[i].nakshatra} nakshatra — consider alternative dates for better results.`;
      }
    }

    return new Response(JSON.stringify({ muhurtas: days }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-muhurta error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
