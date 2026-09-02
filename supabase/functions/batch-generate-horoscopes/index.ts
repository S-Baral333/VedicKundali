import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Body, EclipticLongitude, MakeTime, GeoVector, Ecliptic } from "https://esm.sh/astronomy-engine@2.1.19";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const diff = day === 0 ? 6 : day - 1;
    d.setUTCDate(d.getUTCDate() - diff);
    return d.toISOString().slice(0, 10);
  }
  if (period === "monthly") return `${today.slice(0, 7)}-01`;
  return `${today.slice(0, 4)}-01-01`;
}

function getPeriodPromptConfig(period: Period) {
  const configs: Record<Period, { model: string; depthInstruction: string; jsonFormat: string }> = {
    daily: {
      model: "claude-haiku-4-5-20251001",
      depthInstruction: "Write a 5-6 sentence flowing narrative telling the story of the day from morning to evening.",
      jsonFormat: `Format as JSON:
{
  "period_theme": "One sentence overarching theme for today",
  "greeting": "A warm opening line referencing today's cosmic energy",
  "watch_for": "The ONE most important thing to watch for today",
  "guidance": "5-6 sentence flowing narrative telling the story of the day",
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
      depthInstruction: "Write a 5-6 sentence flowing narrative telling the story of what awaits TOMORROW. Use future tense.",
      jsonFormat: `Format as JSON:
{
  "period_theme": "One sentence overarching theme for tomorrow",
  "greeting": "A warm opening line about what tomorrow holds",
  "watch_for": "The ONE most important thing to watch for tomorrow",
  "guidance": "5-6 sentence flowing narrative previewing tomorrow's energy",
  "planetary_story": "2-3 sentence narrative about what the planets will be doing tomorrow",
  "emotional_forecast": "1-2 sentence emotional/mental energy forecast for tomorrow",
  "energy_level": "high" | "moderate" | "low",
  "best_hours": ["HH:MM-HH:MM"],
  "caution_hours": ["HH:MM-HH:MM"],
  "action_items": ["preparation advice 1", "advice 2", "advice 3"],
  "mantra_of_the_day": "Sanskrit mantra with brief meaning",
  "remedial_tip": "One practical Vedic remedy",
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
      depthInstruction: "Write 2-3 detailed paragraphs covering the 7-day arc. Mention key transit ingresses during the week.",
      jsonFormat: `Format as JSON:
{
  "period_theme": "The overarching theme for this week",
  "greeting": "A warm opening referencing this week's cosmic energy",
  "watch_for": "The single most important thing to watch for this week",
  "guidance": "2-3 detailed paragraphs covering the full 7-day arc",
  "planetary_story": "3-4 sentence narrative about planetary movements this week",
  "emotional_forecast": "2-3 sentence emotional/mental arc for the week",
  "energy_level": "high" | "moderate" | "low",
  "best_hours": ["Best day(s): Monday, Thursday"],
  "caution_hours": ["Challenging day(s): Wednesday"],
  "key_dates": [{"date": "YYYY-MM-DD", "description": "What happens"}],
  "action_items": ["weekly advice 1", "weekly advice 2", "weekly advice 3"],
  "mantra_of_the_day": "Sanskrit mantra for the week",
  "remedial_tip": "One practical weekly Vedic remedy",
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
      depthInstruction: "Write 4-5 detailed paragraphs. Include major transit shifts during the month, key dates for career/love/health.",
      jsonFormat: `Format as JSON:
{
  "period_theme": "The overarching theme for this month",
  "greeting": "A warm opening referencing this month's cosmic landscape",
  "watch_for": "The single most important thing to watch for this month",
  "guidance": "4-5 detailed paragraphs covering the month's trajectory",
  "planetary_story": "4-5 sentence narrative about major planetary movements this month",
  "emotional_forecast": "2-3 sentence emotional/mental arc for the month",
  "energy_level": "high" | "moderate" | "low",
  "key_dates": [{"date": "YYYY-MM-DD", "description": "What happens"}],
  "action_items": ["monthly advice 1", "monthly advice 2", "monthly advice 3", "monthly advice 4"],
  "mantra_of_the_day": "Sanskrit mantra for the month",
  "remedial_tip": "Detailed monthly Vedic remedy",
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
      depthInstruction: "Write 6-8 detailed paragraphs. Cover major Saturn, Jupiter, Rahu/Ketu transits and their impact on each life area. Provide a quarterly breakdown.",
      jsonFormat: `Format as JSON:
{
  "period_theme": "The overarching theme for this year",
  "greeting": "A warm opening referencing this year's cosmic landscape",
  "watch_for": "The single most important thing to watch for this year",
  "guidance": "6-8 detailed paragraphs covering the full year trajectory",
  "planetary_story": "5-6 sentence overview of all major planetary movements this year",
  "emotional_forecast": "3-4 sentence emotional/spiritual growth arc for the year",
  "energy_level": "high" | "moderate" | "low",
  "key_dates": [{"date": "YYYY-MM-DD", "description": "What happens"}],
  "quarterly_overview": [
    {"quarter": "Q1 (Jan-Mar)", "theme": "Quarter theme", "guidance": "2-3 sentence guidance"},
    {"quarter": "Q2 (Apr-Jun)", "theme": "Quarter theme", "guidance": "2-3 sentence guidance"},
    {"quarter": "Q3 (Jul-Sep)", "theme": "Quarter theme", "guidance": "2-3 sentence guidance"},
    {"quarter": "Q4 (Oct-Dec)", "theme": "Quarter theme", "guidance": "2-3 sentence guidance"}
  ],
  "action_items": ["yearly advice 1", "yearly advice 2", "yearly advice 3", "yearly advice 4", "yearly advice 5"],
  "mantra_of_the_day": "Primary Sanskrit mantra for the year",
  "remedial_tip": "Comprehensive yearly Vedic remedial plan",
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
    // Auth: accept either service role via Authorization header or cron invocation
    const authHeader = req.headers.get("Authorization");
    const expectedAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const expectedServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Allow service role key or anon key (cron uses anon key)
    const token = authHeader?.replace("Bearer ", "") || "";
    if (token !== expectedAnonKey && token !== expectedServiceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let periods: Period[] = ["daily", "tomorrow"];
    try {
      const body = await req.json();
      if (Array.isArray(body?.periods)) {
        periods = body.periods.filter((p: string) =>
          ["daily", "tomorrow", "weekly", "monthly", "yearly"].includes(p)
        ) as Period[];
      }
    } catch { /* no body or invalid JSON from cron */ }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().slice(0, 10);
    const results: { sign: string; period: string; status: string }[] = [];

    // All 12 zodiac signs + "General"
    const allSigns = [...SIGNS, "General"];

    for (const period of periods) {
      const validDate = computeValidDate(today, period);
      const transitDate = period === "tomorrow" ? validDate : today;
      const transits = computeTransits(transitDate);
      const transitContext = `Current planetary transits (Swiss Ephemeris, sidereal/Lahiri):\n` +
        transits.map(t => `- ${t.name}: ${t.sign} ${t.degree.toFixed(1)}°${t.is_retrograde ? " (R)" : ""}`).join("\n");

      for (const signName of allSigns) {
        // Check if already exists
        const { data: existing } = await adminClient
          .from("daily_horoscopes")
          .select("id")
          .eq("sign_name", signName)
          .eq("valid_date", validDate)
          .eq("period", period)
          .eq("language", "en")
          .maybeSingle();

        if (existing) {
          results.push({ sign: signName, period, status: "already_cached" });
          continue;
        }

        const signType = signName === "General" ? "general" : "moon";
        const periodConfig = getPeriodPromptConfig(period);

        const periodLabel: Record<Period, string> = {
          daily: "daily", tomorrow: "tomorrow (next day preview)", weekly: "weekly (7-day)", monthly: "monthly", yearly: "yearly (full year)",
        };

        const prompt = signName === "General"
          ? `You are giving a general ${periodLabel[period]} Vedic astrology consultation for all signs. Today's date is ${today}. This reading covers the ${period} period starting ${validDate}.

${transitContext}

Write as a warm, experienced astrologer speaking to someone personally. Address them as "you". Include a Sanskrit mantra and practical Vedic remedies.

${periodConfig.depthInstruction}

${periodConfig.jsonFormat}`
          : `You are giving a ${periodLabel[period]} Vedic astrology consultation for someone with Moon in ${signName}. Today's date is ${today}. This reading covers the ${period} period starting ${validDate}.

${transitContext}

Focus on how these transits specifically affect ${signName} Moon sign natives. Consider Saturn's transit relative to ${signName} for Sade Sati assessment. Write as a warm, experienced astrologer. Address them as "you". Include a Sanskrit mantra and practical Vedic remedies.

${periodConfig.depthInstruction}

${periodConfig.jsonFormat}`;

        const systemPrompt = (period === "daily" || period === "tomorrow")
          ? `You are a warm, experienced Vedic astrologer giving a ${signName === "General" ? "general" : signName + " Moon sign"} consultation. Speak directly as 'you'. Weave planetary positions naturally into your narrative. Be specific, not generic.${period === "tomorrow" ? " Use future tense throughout." : ""} All transit data is computed by Swiss Ephemeris — do NOT recalculate. Return only valid JSON, no markdown.`
          : `You are a warm, experienced Vedic astrologer giving a detailed ${period} ${signName === "General" ? "general" : signName + " Moon sign"} consultation. Go DEEP — analyze major transits and their impact. Be specific and insightful. All transit data is computed by Swiss Ephemeris — do NOT recalculate. Return only valid JSON, no markdown.`;

        try {
          const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: periodConfig.model,
              max_tokens: 4096,
              temperature: 0.85,
              system: systemPrompt,
              messages: [
                { role: "user", content: prompt },
              ],
            }),
          });

          if (!aiRes.ok) {
            console.error(`AI error for ${signName}/${period}: ${aiRes.status}`);
            results.push({ sign: signName, period, status: `ai_error_${aiRes.status}` });
            // Small delay before continuing
            await new Promise(r => setTimeout(r, 2000));
            continue;
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

          const fullContent = JSON.stringify(parsed);

          const { error: insertError } = await adminClient.from("daily_horoscopes").upsert({
            sign_name: signName,
            sign_type: signType,
            valid_date: validDate,
            period,
            mode: "standard",
            language: "en",
            voice: "default",
            content: fullContent,
          }, { onConflict: "sign_type,sign_name,period,valid_date,mode,language,voice" });

          if (insertError) {
            console.error(`DB error for ${signName}/${period}:`, insertError);
            results.push({ sign: signName, period, status: "db_error" });
          } else {
            results.push({ sign: signName, period, status: "generated" });
          }
        } catch (err) {
          console.error(`Error generating ${signName}/${period}:`, err);
          results.push({ sign: signName, period, status: "error" });
        }

        // Delay between AI calls to avoid rate limiting
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    const generated = results.filter(r => r.status === "generated").length;
    const cached = results.filter(r => r.status === "already_cached").length;
    const errors = results.filter(r => r.status.includes("error")).length;

    console.log(`Batch complete: ${generated} generated, ${cached} already cached, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, generated, cached, errors, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("batch-generate-horoscopes error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
