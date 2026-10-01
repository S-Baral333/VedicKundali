import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveGuruContext, applyGuru } from "../_shared/guru.ts";
import { normalizeLanguage, buildLanguageInstruction } from "../_shared/languages.ts";
import { persistOrLog } from "../_shared/persist.ts";
import { resolveAccess } from "../_shared/access.ts";
import { readUsageCount, recordUsageEvent, usageUnavailable } from "../_shared/usage.ts";

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
    // One source of truth for "this is a continuation", so the prompt branch and
    // the write that persists its result cannot disagree about which it is.
    const isContinuation = Boolean(continuation && existing_reading);
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

    // ─── Monthly reading allowance ───
    //
    // This function had no tier or quota check of any kind, so the one reading a
    // month the free tier is sold was in practice unlimited, and every call is a
    // paid model run. Gate before the reference-data loads and the model call,
    // so a denial costs nothing.
    //
    // Metering reads and writes on the service-role client, like the other
    // generators: the gate is a server-side decision and must not depend on the
    // caller's own RLS grants.
    const access = await resolveAccess(supabase, userId, corsHeaders);
    let readingsUsed: number;
    try {
      readingsUsed = await readUsageCount(supabase, userId, "ai_reading");
    } catch (e) {
      return usageUnavailable(corsHeaders, "ai_reading", e);
    }

    if (!access.withinQuota("ai_reading", readingsUsed)) {
      return access.denyQuota(
        "ai_reading",
        readingsUsed,
        access.tier === "darshana"
          ? `You've used your free reading for this month (${access.limit("ai_reading")}/month). Upgrade for unlimited readings.`
          : "You've reached your reading limit for this month.",
      );
    }

    const chartData = chart.chart_data as any;

    // What this reading is allowed to state as fact.
    //
    // When the user named a part of the day instead of a clock time, the chart
    // was cast from that period's midpoint. The Moon barely moves in six hours,
    // but the ascendant crosses about three signs — so the lagna, the houses,
    // the divisional charts and the dasha *dates* are estimates dressed as
    // precision. Left unsaid, the model cites them to the decimal, which is
    // exactly the false confidence the Terms promise we avoid.
    const timeAccuracy: string = chart.birth_time_accuracy ?? "exact";
    const precisionBlock =
      timeAccuracy === "exact"
        ? ""
        : timeAccuracy === "period"
        ? `\nBIRTH TIME PRECISION — READ BEFORE WRITING:
The birth time is approximate. ${chart.full_name} gave a part of the day, not a clock time, and this chart was cast from the middle of that window (${chart.birth_time}).
- TREAT AS RELIABLE: Moon sign, nakshatra, the dasha sequence and its order, planetary sign placements, and all transit-based guidance.
- TREAT AS ESTIMATE, never as fact: the Lagna and every house placement, the divisional charts (D9 and beyond), the nakshatra pada, and all dasha start and end DATES.
- Do NOT quote a degree for the Lagna or any house cusp. Do NOT give a dasha date as certain — say "around" or name the year only.
- Say once, plainly and without apology, that an exact birth time would sharpen the house-based part of this reading. Do not repeat it.\n`
        : `\nBIRTH TIME PRECISION — READ BEFORE WRITING:
No birth time is on file; this chart was cast from midday and the house structure is unreliable.
- TREAT AS RELIABLE: the Moon sign only, and transit-based guidance.
- Do NOT cite the Lagna, houses, divisional charts, nakshatra pada or any dasha date.
- Lead the reading from the Moon and the grahas' sign placements, and say once that a birth time is needed for the rest.\n`;


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

    // ─── What a continuation is allowed to go deeper on ───
    //
    // This branch had never run: the client sent `continue` while this function
    // read `continuation`, so pressing "continue reading" re-ran the normal
    // prompt and the client appended a second full reading to the first. Its
    // focus list was therefore never checked against either the reading prompt
    // below it or the chart data it runs on, and two of its seven items asked
    // for data that does not exist in a natal cast:
    //
    //   1. "Specific transit predictions for the coming months" — chart_data
    //      holds no transit positions at all. generate-horoscope computes those
    //      per request; nothing here does. The model could only invent them.
    //   2. "Remedial rituals with specific timing (tithis, nakshatras)" —
    //      `panchanga` is the panchanga of the birth moment, not a forward
    //      calendar, so ritual dates had nothing to come from either.
    //
    // Both would have produced exactly the fabrication citationRules forbids.
    // Three more items repeated the reading prompt below rather than extending
    // it: Pratyantar Dasha is its section 11, D9 Navamsa its section 7,
    // remedies its section 12 — asked for alongside "every sentence must be NEW
    // information", which the model can only resolve by repeating itself.
    //
    // So the list is rebuilt from what the reading below genuinely leaves on the
    // table, and only for data this particular chart actually holds:
    // ashtakavarga, vargas_full and vimshopaka exist only on charts cast or
    // recomputed by the current engine — that is what the recompute banner is
    // for — and an older chart must not be sent hunting for them.
    //
    // Gated on birth-time accuracy for the same reason precisionBlock exists.
    // With no birth time the lagna, the houses, the divisional charts, the padas
    // and every dasha date are off the table, and the original list led with
    // four of those five. A continuation that asks for them while the precision
    // block forbids citing them is a contradiction in a single prompt.
    const housesUsable = timeAccuracy === "exact" || timeAccuracy === "period";
    const deepDives: string[] = [];

    if (chartData.dasha?.sookshma_dasha && housesUsable) {
      deepDives.push(
        "- Sookshma and Prana Dasha: the two levels below the Pratyantar the reading already covered. Name the lords and what the sub-period sharpens.",
      );
    }
    if (chartData.ashtottari_dasha) {
      deepDives.push(
        "- Ashtottari Dasha, and where its sequence agrees or disagrees with the Vimshottari the reading used. Disagreement between the two systems is itself the insight.",
      );
    }
    if (chartData.chara_dasha && housesUsable) {
      deepDives.push("- Chara Dasha (Jaimini rashi periods) as a second opinion on timing.");
    }
    if (chartData.ashtakavarga?.sav && housesUsable) {
      deepDives.push(
        "- Ashtakavarga house strength (SAV bindus out of 56, BAV out of 8): which houses carry real support and which do not. The reading did not use this data at all — this is the largest gap in it.",
      );
    }
    if (chartData.vimshopaka && housesUsable) {
      deepDives.push(
        "- Vimshopaka Bala: how each planet's strength holds up or collapses across the divisional charts, which a single rashi placement hides.",
      );
    }
    if (chartData.vargas_full?.d60 && housesUsable) {
      deepDives.push(
        "- D60 (Shashtiamsha) and the other divisionals beyond D7/D9/D10/D12, which the reading covered only at D7, D9, D10 and D12.",
      );
    }
    if (chartData.graha_yuddha?.length > 0 && housesUsable) {
      deepDives.push(
        "- Graha Yuddha (planetary war): which planet wins, and what the loser's defeat costs in the areas it rules.",
      );
    }
    if (housesUsable) {
      deepDives.push(
        "- Nakshatra pada sub-divisions, for the Lagna and for the planets, beyond the birth nakshatra the reading treated on its own.",
      );
    }
    // Safe at every accuracy level: sign- and Moon-based, no house or lagna
    // dependency, and the reading below touches them only in passing.
    deepDives.push(
      "- The Rahu-Ketu axis in depth: the karmic pattern it sets by sign and by nakshatra, and the planets conjunct or aspecting it.",
    );
    deepDives.push(
      "- Graha drishti: the aspect pattern between planets, and which of the reading's conclusions it reinforces or undercuts.",
    );

    if (isContinuation) {
      systemPrompt = `You are a renowned Vedic astrologer providing an advanced continuation of a Janam Kundali reading.
${engineNote}

The user has already received a detailed reading of this chart. Your task is to go DEEPER, using techniques that reading did not use. Cover these, in this order, and nothing else:
${deepDives.join("\n")}

CRITICAL: do not restate a conclusion the previous reading already reached. The material above was chosen because that reading did not draw on it, so every point you make should rest on data it left unused. Where you revisit a placement it already discussed, the new technique must be what changes the picture — if it does not change the picture, say so briefly and move on rather than restating it.

Do NOT discuss planetary transits, current sky positions, or future dates for rituals, muhurtas or tithis. This chart is a natal cast: it contains no transit data and no forward calendar, so any such claim would be invented. Timing comes only from the dasha periods given below.

Use traditional Vedic terminology (with English explanations).
${citationRules}`;

      userPrompt = `Continue the Vedic astrology reading for ${chart.full_name} with deeper, more specific insights.

Birth Details:
- Date: ${chart.date_of_birth}
- Time: ${chart.birth_time}${timeAccuracy !== "exact" ? " (approximate — see precision note below)" : ""}
- Place: ${chart.birthplace}
${precisionBlock}${citationBlock}
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

Work through the deeper material listed in your instructions, in that order. Ground every point in the chart data above, and leave out any point the data does not support.`;
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
- Time: ${chart.birth_time}${timeAccuracy !== "exact" ? " (approximate — see precision note below)" : ""}
- Place: ${chart.birthplace}
${precisionBlock}${citationBlock}
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
            // The reading has already streamed to the client, so this cannot
            // abort anything — but it was also never observed: `.then(() => {})`
            // discarded the error result and swallowed rejections alike, so a
            // chart whose reading was never saved looked identical to one that
            // was, and the user re-ran a paid generation to find out.
            // Save the reading and meter it together. Both helpers log their own
            // failures and neither throws, so this cannot reject — and metering
            // only a reading that actually produced text means a model call that
            // streamed nothing is not charged against the allowance.
            //
            // A continuation streams only the new tail, so the reading of record
            // is the existing text plus that tail. Saving fullContent alone would
            // cut the stored reading down to its own continuation — and since the
            // client writes the joined text at this same moment, which of the two
            // landed last was a coin toss. Joining here makes both writes produce
            // the same string, with the same "\n\n" the client uses, so the order
            // stops mattering.
            const readingOfRecord = isContinuation
              ? `${existing_reading}\n\n${fullContent}`
              : fullContent;
            const finish = Promise.all([
              persistOrLog(
                supabase.from("birth_charts").update({ reading: readingOfRecord }).eq("id", chart_id),
                {
                  fn: "generate-reading",
                  table: "birth_charts",
                  detail: `${isContinuation ? "continued reading" : "reading"} for chart ${chart_id} (${readingOfRecord.length} chars)`,
                },
              ),
              recordUsageEvent(supabase, userId, "ai_reading"),
            ]);
            // The client stream is closed, so nothing is holding this isolate
            // open; without waitUntil the update can be torn down in flight and
            // not even the log line survives.
            // @ts-ignore - EdgeRuntime is provided by Supabase Edge runtime
            if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
              // @ts-ignore
              EdgeRuntime.waitUntil(finish);
            } else {
              await finish;
            }
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
