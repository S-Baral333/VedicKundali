import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveGuruContext, applyGuru } from "../_shared/guru.ts";
import { normalizeLanguage, buildLanguageInstruction } from "../_shared/languages.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { chart_id, continuation, existing_reading, language: langInput } = await req.json();
    const language = normalizeLanguage(langInput);
    if (!chart_id) {
      return new Response(JSON.stringify({ error: "chart_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load chart
    const { data: chart, error: chartError } = await supabase
      .from("birth_charts")
      .select("*")
      .eq("id", chart_id)
      .single();

    if (chartError || !chart) {
      return new Response(JSON.stringify({ error: "Chart not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    if (chart.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chartData = chart.chart_data as any;

    // Load relevant interpretations
    const planetNames = chartData.planets?.map((p: any) => p.name) || [];

    const { data: interpretations } = await supabase
      .from("planet_interpretations")
      .select("*")
      .in("planet", planetNames);

    const { data: nakshatras } = await supabase
      .from("nakshatras")
      .select("*")
      .eq("name", chartData.birth_nakshatra?.name || "");

    const { data: yogas } = await supabase
      .from("yogas")
      .select("*");

    const { data: remedies } = await supabase
      .from("remedies")
      .select("*");

    // Filter interpretations to matching sign/house
    const relevantInterps = interpretations?.filter((interp) => {
      const matchingPlanet = chartData.planets?.find((p: any) => p.name === interp.planet);
      if (!matchingPlanet) return false;
      if (interp.sign && interp.sign !== matchingPlanet.sign) return false;
      if (interp.house && interp.house !== matchingPlanet.house) return false;
      return true;
    }) || [];

    const activeYogaNames = chartData.active_yogas?.map((y: any) => y.name) || [];
    const relevantYogas = yogas?.filter(y => activeYogaNames.includes(y.name)) || [];

    // Find relevant remedies based on planets with challenges
    const weakPlanets = chartData.planets?.filter((p: any) =>
      p.dignity === "debilitated" || p.dignity === "enemy"
    ).map((p: any) => p.name) || [];
    const relevantRemedies = remedies?.filter(r => weakPlanets.includes(r.planet)) || [];

    // Build Mangal Dosha context
    const mangalDoshaContext = chartData.mangal_dosha?.present
      ? `\nMangal Dosha: ${chartData.mangal_dosha.cancelled ? "Present but CANCELLED" : "ACTIVE"}${chartData.mangal_dosha.cancellation_reason ? ` (${chartData.mangal_dosha.cancellation_reason})` : ""}`
      : "\nMangal Dosha: Not present";

    // Build Navamsa context
    const vargottamaPlanets = chartData.planets?.filter((p: any) => p.is_vargottama)?.map((p: any) => p.name) || [];
    const navamsaContext = vargottamaPlanets.length > 0
      ? `\nVargottama planets (same sign in Rashi & Navamsa — very strong): ${vargottamaPlanets.join(", ")}`
      : "";

    // Build strength context
    const strengthContext = chartData.planets?.map((p: any) =>
      `${p.name}: strength ${p.strength ?? "N/A"}/100`
    ).join(", ") || "";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Build life scores context
    const lifeScoresContext = chartData.life_scores
      ? `\nLife Area Scores (deterministic, 0-100):\n- Career: ${chartData.life_scores.career}\n- Marriage: ${chartData.life_scores.marriage}\n- Wealth: ${chartData.life_scores.wealth}\n- Health: ${chartData.life_scores.health}\n- Spiritual: ${chartData.life_scores.spiritual}`
      : "";

    // Build combustion context
    const combustionContext = chartData.combustion?.length > 0
      ? `\nCombust planets (within Sun's orb): ${chartData.combustion.map((c: any) => `${c.name} (${c.angularDist}°)`).join(", ")}`
      : "";

    // Build Yogini Dasha context
    const yoginiContext = chartData.yogini_dasha
      ? `\nYogini Dasha: Currently in ${chartData.yogini_dasha.yogini} (planet: ${chartData.yogini_dasha.planet}, ${chartData.yogini_dasha.years}-year period)`
      : "";

    // Build varga context
    const vargaContext = chartData.vargas
      ? `\nAdditional Divisional Charts:\n- D7 (Children): ${chartData.vargas.d7?.map((p: any) => `${p.name}→${p.sign}`).join(", ") || "N/A"}\n- D10 (Career): ${chartData.vargas.d10?.map((p: any) => `${p.name}→${p.sign}`).join(", ") || "N/A"}\n- D12 (Parents): ${chartData.vargas.d12?.map((p: any) => `${p.name}→${p.sign}`).join(", ") || "N/A"}`
      : "";

    const engineNote = chartData.engine === "swiss_ephemeris"
      ? "All astronomical data below is computed by Swiss Ephemeris (arc-second precision). Do NOT modify any positions, scores, or calculations. Your role is to explain their meaning."
      : "";

    // Citation-Grade Chart Summary block (parity with other AI consumers)
    const llmSummary = chartData.llm_summary || "";
    const citationBlock = llmSummary
      ? `\n=== CITATION-GRADE CHART SUMMARY (authoritative) ===\n${llmSummary}\n=== END SUMMARY ===\n`
      : "";

    const citationRules = `\nCITATION RULES (MANDATORY):
- Cite specific values from the Citation-Grade Chart Summary above (e.g., "Jupiter at Scorpio 9°08' in H5", "Moon in Rohini pada 2", "Saturn Mahadasha until 2031-04-12").
- NEVER use hedging language: "suggests", "likely", "may", "might", "perhaps", "could indicate", "tends to". Speak with confident specificity grounded in the cited values.
- Do NOT invent positions, degrees, dashas, or nakshatras. If a value is not in the summary or chart data, omit that point rather than guess.
- When discussing a placement, name the planet, sign, exact degree (DMS), house, and nakshatra/pada where available.\n`;

    let systemPrompt: string;
    let userPrompt: string;

    if (continuation && existing_reading) {
      systemPrompt = `You are a renowned Vedic astrologer providing an advanced continuation of a Janam Kundali reading.
${engineNote}

The user has already received a detailed reading. Your task is to go DEEPER with NEW insights not covered in the existing reading. Focus on:
- Specific transit predictions for the coming months
- Detailed nakshatra pada analysis and its sub-influences
- Ashtakavarga-style house strength interpretations
- Pratyantar Dasha sub-period effects
- Remedial rituals with specific timing (tithis, nakshatras)
- Karmic patterns from nodal axis (Rahu-Ketu) in depth
- Relationship dynamics from D9 Navamsa in detail

CRITICAL: Do NOT repeat ANY content from the previous reading. Every sentence must be NEW information. Use traditional Vedic terminology (with English explanations).
${citationRules}`;

      userPrompt = `Continue the Vedic astrology reading for ${chart.full_name} with deeper, more specific insights.

Birth Details:
- Date: ${chart.date_of_birth}
- Time: ${chart.birth_time}
- Place: ${chart.birthplace}
${citationBlock}
Chart Data:
${JSON.stringify(chartData, null, 2)}

Planetary Strength Scores (Shadbala-lite, 0-100): ${strengthContext}
${navamsaContext}
${mangalDoshaContext}
${lifeScoresContext}
${combustionContext}
${yoginiContext}
${vargaContext}

=== PREVIOUS READING (DO NOT REPEAT) ===
${existing_reading}
=== END PREVIOUS READING ===

Provide NEW deeper insights not covered above. Go into specific predictions, timing, and advanced techniques.`;
    } else {
      systemPrompt = `You are a renowned Vedic astrologer providing a comprehensive Janam Kundali reading.
${engineNote}

Write a detailed, personalized reading in a warm, insightful tone. Structure it with these sections:
1. **Overview & Ascendant Analysis** - Personality traits from the Lagna (include Navamsa Lagna: ${chartData.ascendant?.navamsa_sign || "N/A"})
2. **Planetary Positions & Strength** - Key influences of each planet, their Shadbala strength scores, combustion status, and Vargottama status
3. **Birth Nakshatra** - Character traits, life path based on the birth star
4. **Active Yogas** - Significance of any special planetary combinations
5. **Life Area Scores** - Interpret the deterministic career, marriage, wealth, health, and spiritual scores
6. **Career & Finances** - Professional inclinations, D10 (Dashamsha) chart insights, and wealth indicators
7. **Relationships & Marriage** - Partnership compatibility, Mangal Dosha status, and D9 (Navamsa) chart insights
8. **Children & Family** - D7 (Saptamsha) insights, family dynamics
9. **Health & Wellbeing** - Physical constitution and health considerations
10. **Spiritual Path** - Dharma, past life indicators, spiritual growth
11. **Current Dasha Period** - Maha Dasha, Antar Dasha, Pratyantar Dasha, AND Yogini Dasha analysis
12. **Remedies & Recommendations** - Practical remedies for challenging placements

Use traditional Vedic terminology (with English explanations) and be specific to this person's chart.
${citationRules}`;

      userPrompt = `Generate a complete Vedic astrology reading for ${chart.full_name}.

Birth Details:
- Date: ${chart.date_of_birth}
- Time: ${chart.birth_time}
- Place: ${chart.birthplace}
${citationBlock}
Chart Data:
${JSON.stringify(chartData, null, 2)}

Planetary Strength Scores (Shadbala-lite, 0-100): ${strengthContext}
${navamsaContext}
${mangalDoshaContext}
${lifeScoresContext}
${combustionContext}
${yoginiContext}
${vargaContext}

Matching Planet Interpretations from our knowledge base:
${JSON.stringify(relevantInterps.map(i => ({ planet: i.planet, sign: i.sign, house: i.house, interpretation: i.interpretation, keywords: i.keywords })), null, 2)}

Birth Nakshatra Details:
${JSON.stringify(nakshatras || [], null, 2)}

Active Yogas Details:
${JSON.stringify(relevantYogas.map(y => ({ name: y.name, description: y.description, effects: y.effects })), null, 2)}

Recommended Remedies for weak planets:
${JSON.stringify(relevantRemedies.map(r => ({ title: r.title, planet: r.planet, description: r.description, gemstone: r.gemstone, mantra: r.mantra, ritual: r.ritual })), null, 2)}

Please weave all this information into a cohesive, personalized reading.`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8192,
        temperature: 0.9,
        stream: true,
        system: applyGuru(systemPrompt, await resolveGuruContext(supabase, userId)) + buildLanguageInstruction(language),
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    // Custom stream: translates Anthropic SSE → OpenAI SSE for client compatibility
    // and collects full content for DB persistence.
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const anthropicReader = response.body!.getReader();
    let fullContent = "";

    const clientStream = new ReadableStream({
      async start(controller) {
        const send = (data: string) => {
          try { controller.enqueue(encoder.encode("data: " + data + "\n\n")); } catch { /* client disconnected */ }
        };
        try {
          let buf = "";
          while (true) {
            const { done, value } = await anthropicReader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = buf.indexOf("\n")) !== -1) {
              const line = buf.slice(0, nl).trimEnd();
              buf = buf.slice(nl + 1);
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (!payload) continue;
              try {
                const parsed = JSON.parse(payload);
                if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                  const text = parsed.delta.text;
                  fullContent += text;
                  send(JSON.stringify({ choices: [{ delta: { content: text } }] }));
                } else if (parsed.type === "message_stop") {
                  send("[DONE]");
                }
              } catch { /* partial JSON */ }
            }
          }
        } finally {
          controller.close();
          if (fullContent.length > 0) {
            supabase.from("birth_charts").update({ reading: fullContent }).eq("id", chart_id).then(() => {});
          }
        }
      },
    });

    return new Response(clientStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-reading error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
