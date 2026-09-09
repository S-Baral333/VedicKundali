import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Body, EclipticLongitude, MakeTime, GeoVector, Ecliptic } from "https://esm.sh/astronomy-engine@2.1.19";
import { resolveGuruContext, applyGuru } from "../_shared/guru.ts";
import { normalizeLanguage, buildLanguageInstruction } from "../_shared/languages.ts";
import { resolveAccess } from "../_shared/access.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

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

// ─── Vimshottari Dasha ───
const DASHA_ORDER = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
const DASHA_YEARS: Record<string, number> = {
  Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17,
};
const TOTAL_DASHA_CYCLE = 120;

const NAKSHATRA_DATA = [
  { name:"Ashwini", ruler:"Ketu", start:0 },
  { name:"Bharani", ruler:"Venus", start:13.333 },
  { name:"Krittika", ruler:"Sun", start:26.667 },
  { name:"Rohini", ruler:"Moon", start:40 },
  { name:"Mrigashira", ruler:"Mars", start:53.333 },
  { name:"Ardra", ruler:"Rahu", start:66.667 },
  { name:"Punarvasu", ruler:"Jupiter", start:80 },
  { name:"Pushya", ruler:"Saturn", start:93.333 },
  { name:"Ashlesha", ruler:"Mercury", start:106.667 },
  { name:"Magha", ruler:"Ketu", start:120 },
  { name:"Purva Phalguni", ruler:"Venus", start:133.333 },
  { name:"Uttara Phalguni", ruler:"Sun", start:146.667 },
  { name:"Hasta", ruler:"Moon", start:160 },
  { name:"Chitra", ruler:"Mars", start:173.333 },
  { name:"Swati", ruler:"Rahu", start:186.667 },
  { name:"Vishakha", ruler:"Jupiter", start:200 },
  { name:"Anuradha", ruler:"Saturn", start:213.333 },
  { name:"Jyeshtha", ruler:"Mercury", start:226.667 },
  { name:"Mula", ruler:"Ketu", start:240 },
  { name:"Purva Ashadha", ruler:"Venus", start:253.333 },
  { name:"Uttara Ashadha", ruler:"Sun", start:266.667 },
  { name:"Shravana", ruler:"Moon", start:280 },
  { name:"Dhanishta", ruler:"Mars", start:293.333 },
  { name:"Shatabhisha", ruler:"Rahu", start:306.667 },
  { name:"Purva Bhadrapada", ruler:"Jupiter", start:320 },
  { name:"Uttara Bhadrapada", ruler:"Saturn", start:333.333 },
  { name:"Revati", ruler:"Mercury", start:346.667 },
];

function getNakshatraRuler(moonTotalDegree: number): string {
  const deg = ((moonTotalDegree % 360) + 360) % 360;
  for (let i = NAKSHATRA_DATA.length - 1; i >= 0; i--) {
    if (deg >= NAKSHATRA_DATA[i].start) return NAKSHATRA_DATA[i].ruler;
  }
  return NAKSHATRA_DATA[0].ruler;
}

interface TimelineEvent {
  date: string;
  type: "dasha_change" | "transit" | "turning_point";
  category: "opportunity" | "caution" | "challenge" | "spiritual";
  title: string;
  description: string;
  planet: string;
  duration_days?: number;
}

// Compute upcoming Antar Dasha transitions from current Maha Dasha
function computeDashaTransitions(chartData: any, birthDate: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const dasha = chartData?.dasha;
  if (!dasha?.maha_dasha || !dasha?.maha_dasha_start || !dasha?.maha_dasha_end) return events;

  const mahaDashaLord = dasha.maha_dasha;
  const mahaStart = new Date(dasha.maha_dasha_start);
  const mahaEnd = new Date(dasha.maha_dasha_end);
  const mahaTotalMs = mahaEnd.getTime() - mahaStart.getTime();
  const mahaIndex = DASHA_ORDER.indexOf(mahaDashaLord);
  if (mahaIndex < 0) return events;

  const now = new Date();
  const oneYearLater = new Date(now.getTime() + 365.25 * 24 * 60 * 60 * 1000);

  // Compute all Antar Dasha boundaries within this Maha Dasha
  let antarStart = mahaStart;
  for (let i = 0; i < 9; i++) {
    const antarLord = DASHA_ORDER[(mahaIndex + i) % 9];
    const antarFraction = DASHA_YEARS[antarLord] / TOTAL_DASHA_CYCLE;
    const antarDurationMs = mahaTotalMs * antarFraction;
    const antarEnd = new Date(antarStart.getTime() + antarDurationMs);

    // If this transition falls in the next 12 months and is in the future
    if (antarStart > now && antarStart <= oneYearLater) {
      const categoryMap: Record<string, "opportunity" | "caution" | "challenge" | "spiritual"> = {
        Jupiter: "opportunity", Venus: "opportunity", Moon: "opportunity",
        Sun: "opportunity", Mercury: "opportunity",
        Mars: "challenge", Saturn: "challenge",
        Rahu: "caution", Ketu: "spiritual",
      };
      events.push({
        date: antarStart.toISOString().slice(0, 10),
        type: "dasha_change",
        category: categoryMap[antarLord] || "caution",
        title: `Antar Dasha shifts to ${antarLord}`,
        description: "",
        planet: antarLord,
        duration_days: Math.round(antarDurationMs / (24 * 60 * 60 * 1000)),
      });
    }

    antarStart = antarEnd;
    if (antarStart > oneYearLater) break;
  }

  // Also check if Maha Dasha itself ends within 12 months
  if (mahaEnd > now && mahaEnd <= oneYearLater) {
    const nextMahaLord = DASHA_ORDER[(mahaIndex + 1) % 9];
    events.push({
      date: mahaEnd.toISOString().slice(0, 10),
      type: "dasha_change",
      category: "turning_point" as any,
      title: `Maha Dasha changes: ${mahaDashaLord} → ${nextMahaLord}`,
      description: "",
      planet: nextMahaLord,
      duration_days: Math.round(DASHA_YEARS[nextMahaLord] * 365.25),
    });
  }

  return events;
}

// Compute when slow planets change signs in next 12 months
function computeTransitEvents(chartData: any): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const now = new Date();
  const SLOW_PLANETS = [
    { name: "Jupiter", body: Body.Jupiter },
    { name: "Saturn", body: Body.Saturn },
  ];

  // Sample every 7 days for 12 months to detect sign changes
  for (const pl of SLOW_PLANETS) {
    let prevSign = "";
    for (let dayOffset = 0; dayOffset <= 370; dayOffset += 7) {
      const date = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const year = date.getUTCFullYear(), month = date.getUTCMonth() + 1, day = date.getUTCDate();
      const jd = julianDay(year, month, day, 12.0);
      const ayanamsa = lahiriAyanamsa(jd);
      const time = MakeTime(new Date(Date.UTC(year, month - 1, day, 12)));
      const tropLng = EclipticLongitude(pl.body, time);
      const sidLng = ((tropLng - ayanamsa) % 360 + 360) % 360;
      const sign = SIGNS[Math.floor(sidLng / 30)];

      if (prevSign && sign !== prevSign) {
        // Refine to exact day by scanning daily around this week
        let exactDate = date.toISOString().slice(0, 10);
        for (let d = -7; d <= 0; d++) {
          const refine = new Date(date.getTime() + d * 24 * 60 * 60 * 1000);
          const ry = refine.getUTCFullYear(), rm = refine.getUTCMonth() + 1, rd = refine.getUTCDate();
          const rjd = julianDay(ry, rm, rd, 12.0);
          const ray = lahiriAyanamsa(rjd);
          const rt = MakeTime(new Date(Date.UTC(ry, rm - 1, rd, 12)));
          const rLng = EclipticLongitude(pl.body, rt);
          const rSid = ((rLng - ray) % 360 + 360) % 360;
          const rSign = SIGNS[Math.floor(rSid / 30)];
          if (rSign === sign && d > -7) {
            exactDate = refine.toISOString().slice(0, 10);
            break;
          }
        }

        const category = pl.name === "Jupiter" ? "opportunity" : "challenge";
        events.push({
          date: exactDate,
          type: "transit",
          category,
          title: `${pl.name} enters ${sign}`,
          description: "",
          planet: pl.name,
        });
      }
      prevSign = sign;
    }
  }

  // Rahu/Ketu sign changes (sample monthly — they move very slowly)
  let prevRahuSign = "";
  for (let dayOffset = 0; dayOffset <= 370; dayOffset += 14) {
    const date = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const year = date.getUTCFullYear(), month = date.getUTCMonth() + 1, day = date.getUTCDate();
    const jd = julianDay(year, month, day, 12.0);
    const ayanamsa = lahiriAyanamsa(jd);
    const rahuTrop = meanLunarNode(jd);
    const rahuSid = ((rahuTrop - ayanamsa) % 360 + 360) % 360;
    const rahuSign = SIGNS[Math.floor(rahuSid / 30)];
    
    if (prevRahuSign && rahuSign !== prevRahuSign) {
      const ketuSign = SIGNS[(SIGNS.indexOf(rahuSign) + 6) % 12];
      events.push({
        date: date.toISOString().slice(0, 10),
        type: "transit",
        category: "spiritual",
        title: `Rahu enters ${rahuSign}, Ketu enters ${ketuSign}`,
        description: "",
        planet: "Rahu",
      });
    }
    prevRahuSign = rahuSign;
  }

  return events;
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
    if (!access.can("destiny_timeline")) {
      return access.denyFeature("destiny_timeline", "Timeline predictions require a Sadhaka subscription.");
    }

    // Parse optional chart_id + language from body
    let chartIdFromBody: string | null = null;
    let language = "en";
    try {
      const body = await req.json();
      if (body?.chart_id) chartIdFromBody = body.chart_id as string;
      language = normalizeLanguage(body?.language);
    } catch { /* no body */ }

    // Resolve chart: explicit chart_id > primary > most recent
    let chart: any = null;
    if (chartIdFromBody) {
      const { data } = await supabase
        .from("birth_charts")
        .select("id, chart_data, date_of_birth")
        .eq("id", chartIdFromBody)
        .eq("user_id", userId)
        .maybeSingle();
      chart = data;
    }
    if (!chart) {
      const { data: primary } = await supabase
        .from("birth_charts")
        .select("id, chart_data, date_of_birth")
        .eq("user_id", userId)
        .eq("is_primary", true)
        .maybeSingle();
      chart = primary;
    }
    if (!chart) {
      const { data: charts } = await supabase
        .from("birth_charts")
        .select("id, chart_data, date_of_birth")
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

    // 1. Compute Dasha transitions
    const dashaEvents = computeDashaTransitions(chartData, chart.date_of_birth);

    // 2. Compute major transit events
    const transitEvents = computeTransitEvents(chartData);

    // Merge and sort by date
    const allEvents = [...dashaEvents, ...transitEvents].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (allEvents.length === 0) {
      return new Response(JSON.stringify({ events: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. AI interpretation for each event
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const moonSign = chartData.moon_sign || "unknown";
    const ascSign = chartData.ascendant_sign || "unknown";
    const currentDasha = chartData.dasha?.maha_dasha || "unknown";

    const eventSummary = allEvents.map((e, i) =>
      `${i + 1}. [${e.date}] ${e.title} (type: ${e.type}, planet: ${e.planet}${e.duration_days ? `, duration: ${e.duration_days} days` : ""})`
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
        max_tokens: 4096,
        temperature: 0.85,
        system: applyGuru("You are a Vedic astrology expert. Return ONLY valid JSON array, no markdown.", await resolveGuruContext(supabase, userId)) + buildLanguageInstruction(language),
        messages: [
          {
            role: "user",
            content: `Native chart context:
${chartData.llm_summary || `Moon ${moonSign}, Lagna ${ascSign}, current MD ${currentDasha}`}

Upcoming events to interpret:
${eventSummary}

Return a JSON array with one object per event, in order:
[
  {
    "description": "2-3 sentence Vedic interpretation citing specific natal placements (e.g. \\"Saturn transits H10 from natal Jupiter at Scorpio 9°08'\\")",
    "category": "opportunity" | "caution" | "challenge" | "spiritual"
  }
]

Cite specific planet positions/strengths from the CHART DATA above. Avoid hedging words like "suggests" or "likely".`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      // Fallback: return events without AI descriptions
      console.error("AI error:", aiRes.status);
      return new Response(JSON.stringify({ events: allEvents }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const rawContent = aiData.content?.[0]?.text || "";

    try {
      const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
      const interpretations = JSON.parse(jsonMatch ? jsonMatch[0] : "[]");

      for (let i = 0; i < allEvents.length && i < interpretations.length; i++) {
        allEvents[i].description = interpretations[i].description || "";
        if (interpretations[i].category) {
          allEvents[i].category = interpretations[i].category;
        }
      }
    } catch {
      console.error("Failed to parse AI interpretations");
    }

    // 4. Insert notifications for upcoming events (using service role)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const notifications = allEvents
      .filter(e => {
        const eventDate = new Date(e.date);
        const daysAway = (eventDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
        return daysAway > 0 && daysAway <= 30; // Notify for events within 30 days
      })
      .map(e => ({
        user_id: userId,
        title: e.title,
        message: e.description || `${e.title} is approaching on ${e.date}.`,
        category: e.type,
        scheduled_for: new Date(new Date(e.date).getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days before
      }));

    if (notifications.length > 0) {
      // Delete old timeline notifications for this user before inserting new ones
      await adminClient
        .from("user_notifications")
        .delete()
        .eq("user_id", userId)
        .in("category", ["dasha_change", "transit", "turning_point"]);

      await adminClient.from("user_notifications").insert(notifications);
    }

    return new Response(JSON.stringify({ events: allEvents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-timeline error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
