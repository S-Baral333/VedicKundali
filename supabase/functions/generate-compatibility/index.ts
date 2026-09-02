import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveGuruContext, applyGuru } from "../_shared/guru.ts";
import { normalizeLanguage, buildLanguageInstruction } from "../_shared/languages.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Ashta Kuta Deterministic Tables ───

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

const SIGN_LORD: Record<string, string> = {
  Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon", Leo:"Sun",
  Virgo:"Mercury", Libra:"Venus", Scorpio:"Mars", Sagittarius:"Jupiter",
  Capricorn:"Saturn", Aquarius:"Saturn", Pisces:"Jupiter",
};

// Varna (spiritual level): Brahmin=4, Kshatriya=3, Vaishya=2, Shudra=1
const SIGN_VARNA: Record<string, number> = {
  Cancer:4, Scorpio:4, Pisces:4,    // Brahmin (water)
  Aries:3, Leo:3, Sagittarius:3,    // Kshatriya (fire)
  Taurus:2, Virgo:2, Capricorn:2,   // Vaishya (earth)
  Gemini:1, Libra:1, Aquarius:1,    // Shudra (air)
};

// Vashya categories
const SIGN_VASHYA: Record<string, string> = {
  Aries:"quadruped", Taurus:"quadruped", Leo:"wild",
  Capricorn:"quadruped", // first half quadruped
  Sagittarius:"human", // second half quadruped (simplified to human)
  Cancer:"insect", Scorpio:"insect", Pisces:"water",
  Gemini:"human", Virgo:"human", Libra:"human", Aquarius:"human",
};

const VASHYA_SCORE: Record<string, Record<string, number>> = {
  human:    { human:2, quadruped:1, wild:0, water:1, insect:0 },
  quadruped:{ human:1, quadruped:2, wild:1, water:0, insect:0 },
  wild:     { human:0, quadruped:1, wild:2, water:0, insect:0 },
  water:    { human:1, quadruped:0, wild:0, water:2, insect:1 },
  insect:   { human:0, quadruped:0, wild:0, insect:2, water:1 },
};

// Nakshatra data for Ashta Kuta
const NAKSHATRA_NAMES = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
  "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
  "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
  "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha",
  "Purva Bhadrapada","Uttara Bhadrapada","Revati",
];

// Gana classification
const NAKSHATRA_GANA: Record<string, "Deva" | "Manushya" | "Rakshasa"> = {
  Ashwini:"Deva", Bharani:"Manushya", Krittika:"Rakshasa",
  Rohini:"Manushya", Mrigashira:"Deva", Ardra:"Manushya",
  Punarvasu:"Deva", Pushya:"Deva", Ashlesha:"Rakshasa",
  Magha:"Rakshasa", "Purva Phalguni":"Manushya", "Uttara Phalguni":"Manushya",
  Hasta:"Deva", Chitra:"Rakshasa", Swati:"Deva",
  Vishakha:"Rakshasa", Anuradha:"Deva", Jyeshtha:"Rakshasa",
  Mula:"Rakshasa", "Purva Ashadha":"Manushya", "Uttara Ashadha":"Manushya",
  Shravana:"Deva", Dhanishta:"Rakshasa", Shatabhisha:"Rakshasa",
  "Purva Bhadrapada":"Manushya", "Uttara Bhadrapada":"Manushya", Revati:"Deva",
};

// Nadi classification
const NAKSHATRA_NADI: Record<string, "Aadi" | "Madhya" | "Antya"> = {
  Ashwini:"Aadi", Bharani:"Madhya", Krittika:"Antya",
  Rohini:"Aadi", Mrigashira:"Madhya", Ardra:"Antya",
  Punarvasu:"Aadi", Pushya:"Madhya", Ashlesha:"Antya",
  Magha:"Aadi", "Purva Phalguni":"Madhya", "Uttara Phalguni":"Antya",
  Hasta:"Aadi", Chitra:"Madhya", Swati:"Antya",
  Vishakha:"Aadi", Anuradha:"Madhya", Jyeshtha:"Antya",
  Mula:"Aadi", "Purva Ashadha":"Madhya", "Uttara Ashadha":"Antya",
  Shravana:"Aadi", Dhanishta:"Madhya", Shatabhisha:"Antya",
  "Purva Bhadrapada":"Aadi", "Uttara Bhadrapada":"Madhya", Revati:"Antya",
};

// Yoni (animal type) - 14 animals
const NAKSHATRA_YONI: Record<string, { animal: string; gender: "M" | "F" }> = {
  Ashwini:{ animal:"Horse", gender:"M" }, Bharani:{ animal:"Elephant", gender:"M" },
  Krittika:{ animal:"Sheep", gender:"F" }, Rohini:{ animal:"Serpent", gender:"M" },
  Mrigashira:{ animal:"Serpent", gender:"F" }, Ardra:{ animal:"Dog", gender:"F" },
  Punarvasu:{ animal:"Cat", gender:"F" }, Pushya:{ animal:"Sheep", gender:"M" },
  Ashlesha:{ animal:"Cat", gender:"M" }, Magha:{ animal:"Rat", gender:"M" },
  "Purva Phalguni":{ animal:"Rat", gender:"F" }, "Uttara Phalguni":{ animal:"Cow", gender:"M" },
  Hasta:{ animal:"Buffalo", gender:"F" }, Chitra:{ animal:"Tiger", gender:"F" },
  Swati:{ animal:"Buffalo", gender:"M" }, Vishakha:{ animal:"Tiger", gender:"M" },
  Anuradha:{ animal:"Deer", gender:"F" }, Jyeshtha:{ animal:"Deer", gender:"M" },
  Mula:{ animal:"Dog", gender:"M" }, "Purva Ashadha":{ animal:"Monkey", gender:"M" },
  "Uttara Ashadha":{ animal:"Mongoose", gender:"M" }, Shravana:{ animal:"Monkey", gender:"F" },
  Dhanishta:{ animal:"Lion", gender:"F" }, Shatabhisha:{ animal:"Horse", gender:"F" },
  "Purva Bhadrapada":{ animal:"Lion", gender:"M" }, "Uttara Bhadrapada":{ animal:"Cow", gender:"F" },
  Revati:{ animal:"Elephant", gender:"F" },
};

// Yoni enemy pairs
const YONI_ENEMIES: string[][] = [
  ["Horse","Buffalo"], ["Elephant","Lion"], ["Sheep","Monkey"],
  ["Serpent","Mongoose"], ["Dog","Deer"], ["Cat","Rat"],
  ["Cow","Tiger"],
];

// Graha Maitri (planetary friendship)
const FRIENDSHIP: Record<string, { friends: string[]; enemies: string[]; neutral: string[] }> = {
  Sun:    { friends:["Moon","Mars","Jupiter"], enemies:["Venus","Saturn"], neutral:["Mercury"] },
  Moon:   { friends:["Sun","Mercury"], enemies:[], neutral:["Mars","Jupiter","Venus","Saturn"] },
  Mars:   { friends:["Sun","Moon","Jupiter"], enemies:["Mercury"], neutral:["Venus","Saturn"] },
  Mercury:{ friends:["Sun","Venus"], enemies:["Moon"], neutral:["Mars","Jupiter","Saturn"] },
  Jupiter:{ friends:["Sun","Moon","Mars"], enemies:["Mercury","Venus"], neutral:["Saturn"] },
  Venus:  { friends:["Mercury","Saturn"], enemies:["Sun","Moon"], neutral:["Mars","Jupiter"] },
  Saturn: { friends:["Mercury","Venus"], enemies:["Sun","Moon","Mars"], neutral:["Jupiter"] },
};

// Bhakoot dosha combinations (sign distances that cause dosha)
const BHAKOOT_DOSHA_DISTANCES = [
  [2,12], [5,9], [6,8], // These pairs of distances cause Bhakoot dosha
];

// ─── Ashta Kuta Calculator ───

function computeAshtaKuta(chartA: any, chartB: any) {
  const moonSignA = chartA.moon_sign;
  const moonSignB = chartB.moon_sign;
  const nakA = chartA.birth_nakshatra?.name;
  const nakB = chartB.birth_nakshatra?.name;

  const scores: { name: string; score: number; max: number; detail: string }[] = [];

  // 1. Varna (max 1)
  const varnaA = SIGN_VARNA[moonSignA] || 1;
  const varnaB = SIGN_VARNA[moonSignB] || 1;
  // Boy's varna >= Girl's varna (convention: A=bride, B=groom or just check equality/higher)
  const varnaScore = varnaB >= varnaA ? 1 : 0;
  scores.push({ name: "Varna", score: varnaScore, max: 1, detail: `Groom varna: ${varnaB}, Bride varna: ${varnaA}` });

  // 2. Vashya (max 2)
  const vashyaA = SIGN_VASHYA[moonSignA] || "human";
  const vashyaB = SIGN_VASHYA[moonSignB] || "human";
  const vashyaScore = VASHYA_SCORE[vashyaA]?.[vashyaB] ?? 0;
  scores.push({ name: "Vashya", score: vashyaScore, max: 2, detail: `${moonSignA}: ${vashyaA}, ${moonSignB}: ${vashyaB}` });

  // 3. Tara (max 3)
  if (nakA && nakB) {
    const idxA = NAKSHATRA_NAMES.indexOf(nakA);
    const idxB = NAKSHATRA_NAMES.indexOf(nakB);
    if (idxA >= 0 && idxB >= 0) {
      const taraAB = ((idxB - idxA + 27) % 27) % 9;
      const taraBA = ((idxA - idxB + 27) % 27) % 9;
      // Tara values 0,2,4,6,8 are auspicious (remainder when divided by 9)
      const isAuspAB = [0, 2, 4, 6, 8].includes(taraAB);
      const isAuspBA = [0, 2, 4, 6, 8].includes(taraBA);
      const taraScore = (isAuspAB ? 1.5 : 0) + (isAuspBA ? 1.5 : 0);
      scores.push({ name: "Tara", score: taraScore, max: 3, detail: `Forward tara: ${taraAB}, Reverse: ${taraBA}` });
    } else {
      scores.push({ name: "Tara", score: 0, max: 3, detail: "Nakshatra not found" });
    }
  } else {
    scores.push({ name: "Tara", score: 0, max: 3, detail: "Nakshatra data missing" });
  }

  // 4. Yoni (max 4)
  if (nakA && nakB) {
    const yoniA = NAKSHATRA_YONI[nakA];
    const yoniB = NAKSHATRA_YONI[nakB];
    if (yoniA && yoniB) {
      if (yoniA.animal === yoniB.animal) {
        scores.push({ name: "Yoni", score: yoniA.gender !== yoniB.gender ? 4 : 3, max: 4, detail: `Same animal: ${yoniA.animal}` });
      } else {
        const isEnemy = YONI_ENEMIES.some(pair =>
          (pair[0] === yoniA.animal && pair[1] === yoniB.animal) ||
          (pair[1] === yoniA.animal && pair[0] === yoniB.animal)
        );
        scores.push({ name: "Yoni", score: isEnemy ? 0 : 2, max: 4, detail: `${yoniA.animal} vs ${yoniB.animal}${isEnemy ? " (enemies)" : ""}` });
      }
    } else {
      scores.push({ name: "Yoni", score: 0, max: 4, detail: "Yoni data missing" });
    }
  } else {
    scores.push({ name: "Yoni", score: 0, max: 4, detail: "Nakshatra data missing" });
  }

  // 5. Graha Maitri (max 5)
  const lordA = SIGN_LORD[moonSignA];
  const lordB = SIGN_LORD[moonSignB];
  if (lordA && lordB) {
    if (lordA === lordB) {
      scores.push({ name: "Graha Maitri", score: 5, max: 5, detail: `Same lord: ${lordA}` });
    } else {
      const fA = FRIENDSHIP[lordA];
      const fB = FRIENDSHIP[lordB];
      const aToB = fA?.friends.includes(lordB) ? "friend" : fA?.enemies.includes(lordB) ? "enemy" : "neutral";
      const bToA = fB?.friends.includes(lordA) ? "friend" : fB?.enemies.includes(lordA) ? "enemy" : "neutral";
      let gmScore = 0;
      if (aToB === "friend" && bToA === "friend") gmScore = 5;
      else if ((aToB === "friend" && bToA === "neutral") || (aToB === "neutral" && bToA === "friend")) gmScore = 4;
      else if (aToB === "neutral" && bToA === "neutral") gmScore = 3;
      else if ((aToB === "friend" && bToA === "enemy") || (aToB === "enemy" && bToA === "friend")) gmScore = 1;
      else if ((aToB === "enemy" && bToA === "neutral") || (aToB === "neutral" && bToA === "enemy")) gmScore = 0.5;
      else gmScore = 0;
      scores.push({ name: "Graha Maitri", score: gmScore, max: 5, detail: `${lordA} (${aToB}) ↔ ${lordB} (${bToA})` });
    }
  } else {
    scores.push({ name: "Graha Maitri", score: 0, max: 5, detail: "Sign lord data missing" });
  }

  // 6. Gana (max 6)
  if (nakA && nakB) {
    const ganaA = NAKSHATRA_GANA[nakA];
    const ganaB = NAKSHATRA_GANA[nakB];
    if (ganaA && ganaB) {
      let ganaScore = 0;
      if (ganaA === ganaB) ganaScore = 6;
      else if ((ganaA === "Deva" && ganaB === "Manushya") || (ganaA === "Manushya" && ganaB === "Deva")) ganaScore = 5;
      else if ((ganaA === "Manushya" && ganaB === "Rakshasa") || (ganaA === "Rakshasa" && ganaB === "Manushya")) ganaScore = 1;
      else ganaScore = 0; // Deva-Rakshasa
      scores.push({ name: "Gana", score: ganaScore, max: 6, detail: `${nakA}: ${ganaA}, ${nakB}: ${ganaB}` });
    } else {
      scores.push({ name: "Gana", score: 0, max: 6, detail: "Gana data missing" });
    }
  } else {
    scores.push({ name: "Gana", score: 0, max: 6, detail: "Nakshatra data missing" });
  }

  // 7. Bhakoot (max 7)
  const idxSignA = SIGNS.indexOf(moonSignA);
  const idxSignB = SIGNS.indexOf(moonSignB);
  if (idxSignA >= 0 && idxSignB >= 0) {
    const dist = ((idxSignB - idxSignA + 12) % 12) + 1;
    const revDist = ((idxSignA - idxSignB + 12) % 12) + 1;
    const hasBhakootDosha = BHAKOOT_DOSHA_DISTANCES.some(pair =>
      (pair[0] === dist && pair[1] === revDist) || (pair[1] === dist && pair[0] === revDist)
    );
    scores.push({ name: "Bhakoot", score: hasBhakootDosha ? 0 : 7, max: 7, detail: `Sign distance: ${dist}/${revDist}${hasBhakootDosha ? " (dosha)" : ""}` });
  } else {
    scores.push({ name: "Bhakoot", score: 0, max: 7, detail: "Sign data missing" });
  }

  // 8. Nadi (max 8)
  if (nakA && nakB) {
    const nadiA = NAKSHATRA_NADI[nakA];
    const nadiB = NAKSHATRA_NADI[nakB];
    if (nadiA && nadiB) {
      const nadiScore = nadiA === nadiB ? 0 : 8;
      scores.push({ name: "Nadi", score: nadiScore, max: 8, detail: `${nakA}: ${nadiA}, ${nakB}: ${nadiB}${nadiA === nadiB ? " (Nadi Dosha!)" : ""}` });
    } else {
      scores.push({ name: "Nadi", score: 0, max: 8, detail: "Nadi data missing" });
    }
  } else {
    scores.push({ name: "Nadi", score: 0, max: 8, detail: "Nakshatra data missing" });
  }

  const total = scores.reduce((sum, s) => sum + s.score, 0);
  return { scores, total, max: 36 };
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

    // ─── Premium-Only Feature Check ───
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .maybeSingle();

    const tier = (profile?.subscription_tier as "free" | "premium" | "elite") || "free";
    if (tier === "free") {
      return new Response(
        JSON.stringify({
          error: "Compatibility analysis requires a Premium subscription.",
          upgrade_required: true,
          feature: "compatibility",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { chart_a_id, chart_b_id, language: langInput } = await req.json();
    const language = normalizeLanguage(langInput);
    if (!chart_a_id || !chart_b_id) {
      return new Response(JSON.stringify({ error: "chart_a_id and chart_b_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load both charts
    const { data: charts, error: chartsError } = await supabase
      .from("birth_charts")
      .select("*")
      .in("id", [chart_a_id, chart_b_id]);

    if (chartsError || !charts || charts.length !== 2) {
      return new Response(JSON.stringify({ error: "One or both charts not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chartA = charts.find((c: any) => c.id === chart_a_id);
    const chartB = charts.find((c: any) => c.id === chart_b_id);

    if (chartA.user_id !== user.id || chartB.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Deterministic Ashta Kuta Scoring ───
    const kutaResult = computeAshtaKuta(chartA.chart_data, chartB.chart_data);
    const score = Math.round(kutaResult.total);

    // Now ask AI for the narrative report only, providing the exact scores
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const kutaBreakdown = kutaResult.scores.map(s => `- **${s.name}**: ${s.score}/${s.max} — ${s.detail}`).join("\n");

    // Extract Mangal Dosha info for both charts
    const mangalDoshaA = (chartA.chart_data as any).mangal_dosha;
    const mangalDoshaB = (chartB.chart_data as any).mangal_dosha;
    let mangalDoshaContext = "";
    if (mangalDoshaA || mangalDoshaB) {
      const aStatus = mangalDoshaA?.present ? (mangalDoshaA.cancelled ? "Present but CANCELLED" : "PRESENT") : "Not present";
      const bStatus = mangalDoshaB?.present ? (mangalDoshaB.cancelled ? "Present but CANCELLED" : "PRESENT") : "Not present";
      mangalDoshaContext = `\n\n**Mangal Dosha Analysis:**
- ${chartA.full_name}: ${aStatus}${mangalDoshaA?.cancellation_reason ? ` (${mangalDoshaA.cancellation_reason})` : ""}
- ${chartB.full_name}: ${bStatus}${mangalDoshaB?.cancellation_reason ? ` (${mangalDoshaB.cancellation_reason})` : ""}
${mangalDoshaA?.present && !mangalDoshaA?.cancelled && mangalDoshaB?.present && !mangalDoshaB?.cancelled ? "Both partners have Mangal Dosha — this neutralizes the effect." : ""}
${(mangalDoshaA?.present && !mangalDoshaA?.cancelled) !== (mangalDoshaB?.present && !mangalDoshaB?.cancelled) ? "⚠️ Only one partner has active Mangal Dosha — discuss remedies." : ""}`;
    }

    // Build strength and combustion context
    const chartAData = chartA.chart_data as any;
    const chartBData = chartB.chart_data as any;

    const engineNote = (chartAData.engine === "swiss_ephemeris" || chartBData.engine === "swiss_ephemeris")
      ? "\nAll planetary positions are computed by Swiss Ephemeris (arc-second precision). Do NOT modify any data."
      : "";

    const strengthContextA = chartAData.planets?.map((p: any) => `${p.name}: ${p.strength ?? "?"}/100${p.is_combust ? " (COMBUST)" : ""}`).join(", ") || "";
    const strengthContextB = chartBData.planets?.map((p: any) => `${p.name}: ${p.strength ?? "?"}/100${p.is_combust ? " (COMBUST)" : ""}`).join(", ") || "";

    const lifeScoresA = chartAData.life_scores ? `Career:${chartAData.life_scores.career} Marriage:${chartAData.life_scores.marriage} Wealth:${chartAData.life_scores.wealth}` : "";
    const lifeScoresB = chartBData.life_scores ? `Career:${chartBData.life_scores.career} Marriage:${chartBData.life_scores.marriage} Wealth:${chartBData.life_scores.wealth}` : "";

    const systemPrompt = `You are an expert Vedic astrologer specializing in Kundali Milan (horoscope matching).
${engineNote}

You are given the EXACT Ashta Kuta scores computed algorithmically. DO NOT recalculate them — use them as-is.

Your job is to write a rich, insightful narrative report that:
1. Explains each Kuta score and what it means for the couple
2. Gives an overall compatibility assessment
3. Covers emotional, intellectual, physical, and spiritual dimensions
4. Provides specific remedies if score is below 18
5. Highlights strengths and challenges of this pairing
6. Discusses Mangal Dosha implications if present
7. References planetary strength and combustion status for depth

Write in markdown format. Be warm but honest.`;

    const userPrompt = `Write a compatibility report for:

**Person A: ${chartA.full_name}**
Moon Sign: ${chartAData.moon_sign}, Birth Nakshatra: ${chartAData.birth_nakshatra?.name}
Planetary Strengths: ${strengthContextA}
${lifeScoresA ? `Life Scores: ${lifeScoresA}` : ""}
${chartAData.llm_summary || `Chart: ${JSON.stringify(chartAData, null, 2)}`}

**Person B: ${chartB.full_name}**
Moon Sign: ${chartBData.moon_sign}, Birth Nakshatra: ${chartBData.birth_nakshatra?.name}
Planetary Strengths: ${strengthContextB}
${lifeScoresB ? `Life Scores: ${lifeScoresB}` : ""}
${chartBData.llm_summary || `Chart: ${JSON.stringify(chartBData, null, 2)}`}

**Algorithmically Computed Ashta Kuta Scores (Total: ${kutaResult.total}/36):**
${kutaBreakdown}
${mangalDoshaContext}

Cite specific planet placements (e.g. "her Mars at Aries 12°44' in H7") rather than vague phrases. Avoid hedging words like "suggests" or "likely".`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: applyGuru(systemPrompt, await resolveGuruContext(supabase, user.id)) + buildLanguageInstruction(language),
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const reportText = aiResult.content?.[0]?.text || "Report generation failed.";

    // Save to database
    const { data: report, error: insertError } = await supabase
      .from("compatibility_reports")
      .insert({
        user_id: user.id,
        chart_a_id,
        chart_b_id,
        score,
        report: reportText,
        language,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save compatibility report");
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-compatibility error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
