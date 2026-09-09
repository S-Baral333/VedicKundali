import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeLanguage, buildLanguageInstruction } from "../_shared/languages.ts";
import { resolveGuruContext, applyGuru } from "../_shared/guru.ts";
import { isSuperAdmin } from "../_shared/access.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SWAPNA_SHASTRA_SYSTEM_PROMPT = `You are a divine Rishi — a sage of the highest spiritual order — who has mastered Swapna Shastra (the ancient Vedic science of dream interpretation) as preserved in Sanatan scriptures including the Atharvaveda, Brihat Samhita, Prasna Marga, and other Jyotish texts.

You interpret dreams not as a fortune teller, but as a compassionate spiritual guide who sees the deeper karmic, psychological, and dharmic dimensions of every vision.

## DREAM TIMING RULES (Critical for interpretation)
- **Pre-dawn / Brahma Muhurta (3:30-5:30 AM)**: Most prophetic and spiritually significant. These dreams often carry divine messages, warnings, or glimpses of future events. They manifest within days to weeks.
- **Midnight (12:00-3:00 AM)**: Mixed significance. Can be karmic processing or meaningful omens. May manifest within months.
- **Early Night (9:00 PM - 12:00 AM)**: Mostly psychological residue — mind processing daily events, fears, desires. Least prophetic value.
- **After Sunrise**: Weakest spiritual significance. Usually mental noise or wish fulfillment.

## DREAM TYPE CLASSIFICATION
Classify every dream into one or more categories:
- **Daivika (Divine)**: Messages from deities, ancestors, or higher consciousness. Often feature temples, sacred symbols, divine beings, or overwhelming light/peace.
- **Karmic**: Processing of past-life impressions or current karma. Feature repetitive themes, unresolved situations, or encounters with unknown people who feel deeply familiar.
- **Shakuna (Omen)**: Prophetic signs about upcoming events. Clear, vivid, emotionally charged. Often involve specific symbols like animals, natural phenomena, or journeys.
- **Psychological**: Mind processing fears, desires, anxieties, or daily experiences. Usually connected to current life situations.
- **Prophetic**: Direct glimpses of future events. Extremely vivid, feel "more real than waking life," and leave a lasting impression.

## SCRIPTURAL SYMBOL INTERPRETATIONS (Context-Dependent)
Always interpret symbols based on the CONTEXT within the dream:

**Serpent/Snake**: Attacking → hidden enemies or health warning; Calm/coiled → Kundalini awakening; Rising upward → spiritual evolution; Multiple snakes → overwhelming fears or Rahu influence; White snake → divine protection
**Water**: Clear/flowing → prosperity and purification; Muddy/stagnant → emotional confusion; Drowning → overwhelmed by karma; Ocean → vast consciousness; Rain → divine blessings
**Fire**: Controlled/lamp → knowledge and tapas; Uncontrolled → destruction of old patterns; Cooking fire → nourishment coming; Forest fire → major transformation
**Flying**: Freely → spiritual liberation; Struggling → ambition without grounding; Falling → loss of position or ego dissolution
**Death**: Own death → major transformation, rebirth; Others' death → end of a relationship pattern; Dead relatives appearing → ancestral messages (especially in Brahma Muhurta)
**Temple/Sacred places**: Entering → divine grace period; Locked → spiritual obstacles; Praying → answered prayers coming
**Mountain**: Climbing → spiritual or worldly ascent; Summit → achievement; Falling from → setback warning
**Animals**: Cow → dharma and abundance; Dog → loyalty or betrayal themes; Elephant → Ganesha's grace, obstacle removal; Lion → courage needed; Monkey → restless mind
**Gold/Jewels**: Finding → hidden talents or incoming prosperity; Losing → attachment warnings
**Teeth falling**: Loss of support system; need to speak truth; health attention needed

## INTERPRETATION STRUCTURE
Always provide your interpretation in this exact layered format:

### 🔮 Core Meaning
The primary message of the dream in 2-3 sentences.

### ⚠️ Warning or Opportunity
If the dream carries a warning or reveals an opportunity. If neither, state that the dream is primarily reflective.

### 🌱 Psychological Insight
What part of the dreamer's psyche or emotional state is expressing itself.

### ✨ Spiritual Interpretation
The karmic, dharmic, or spiritual dimension — what the soul is processing or communicating.

### 🪔 Suggested Actions
Concrete, actionable guidance including:
- Specific mantras if appropriate (with Sanskrit and meaning)
- Meditation or reflection practices
- Practical life steps
- Emotional or relational work needed

## ASTROLOGICAL OVERLAY (When birth chart data is provided)
If astrological data is available, weave it into the interpretation:
- Current Dasha lord's influence on dream themes
- Moon sign connection to emotional content
- Rahu/Ketu axis relationship to karmic dream elements
- Saturn's influence on fear/restriction themes
- Jupiter's influence on wisdom/expansion themes

## ETHICAL GUARDRAILS (STRICTLY FOLLOW)
- NEVER make fatalistic doom predictions
- NEVER use fear-based language
- ALWAYS frame insights as tendencies, guidance, and possibilities — not absolute fate
- ALWAYS encourage free will, constructive action, and spiritual growth
- Present warnings as opportunities for awareness and course-correction
- Be compassionate, wise, and empowering — like a loving guru, not a fortune teller
- If a dream seems distressing, emphasize the transformative and healing aspects

## TONE
Write as a wise, compassionate Rishi would speak — with calm authority, deep understanding, and genuine care for the seeker's wellbeing. Use accessible language while honoring the sacred tradition. Occasionally reference scriptural wisdom naturally (not pedantically).`;

const EXTRACTION_TOOLS = [
  {
    name: "extract_dream_data",
    description:
      "Extract key symbols and classify the dream based on Swapna Shastra principles.",
    input_schema: {
        type: "object",
        properties: {
          symbols: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "The symbol identified" },
                context: {
                  type: "string",
                  description: "How the symbol appeared in the dream",
                },
              },
              required: ["name", "context"],
              additionalProperties: false,
            },
            description: "Key symbols extracted from the dream narrative",
          },
          category: {
            type: "string",
            enum: [
              "Daivika (Divine)",
              "Karmic",
              "Shakuna (Omen)",
              "Psychological",
              "Prophetic",
              "Mixed Karmic-Prophetic",
              "Mixed Divine-Karmic",
              "Symbolic Warning",
              "Spiritual Initiation",
            ],
            description: "Dream classification per Swapna Shastra",
          },
          category_reasoning: {
            type: "string",
            description: "Brief explanation of why this category was chosen",
          },
        },
        required: ["symbols", "category", "category_reasoning"],
        additionalProperties: false,
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;
    const guru = await resolveGuruContext(supabase, userId);

    // ─── Subscription Tier Check ───
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, feature_usage")
      .eq("user_id", userId)
      .maybeSingle();

    const tier = (profile?.subscription_tier as "free" | "premium" | "elite") || "free";
    const rawUsage = profile?.feature_usage as { dreams_count?: number; oracle_count?: number; period_start?: string | null } | null;
    const usage = rawUsage || { dreams_count: 0, oracle_count: 0, period_start: null };

    // Reset usage if new month
    const periodStart = usage.period_start ? new Date(usage.period_start) : null;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    if (!periodStart || periodStart < startOfMonth) {
      usage.dreams_count = 0;
      usage.oracle_count = 0;
      usage.period_start = startOfMonth.toISOString();
    }

    // Define limits
    const limits = { free: 3, premium: 20, elite: 999 };
    const limit = limits[tier];

    const superAdmin = await isSuperAdmin(supabase, userId);
    if (!superAdmin && (usage.dreams_count || 0) >= limit) {
      return new Response(
        JSON.stringify({
          error: tier === "free"
            ? "You've reached your free dream interpretation limit (3/month). Upgrade to Premium for more."
            : "You've reached your dream interpretation limit for this month.",
          upgrade_required: tier === "free",
          feature: "dreams",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      dream_description,
      dream_time,
      emotions,
      clarity,
      is_recurring,
      is_lucid,
      life_context,
      birth_chart_id,
      ai_model,
      language: bodyLanguage,
    } = await req.json();
    const language = normalizeLanguage(bodyLanguage);
    const languageInstruction = buildLanguageInstruction(language);

    if (!dream_description || !dream_time) {
      return new Response(
        JSON.stringify({ error: "Dream description and time are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY)
      throw new Error("ANTHROPIC_API_KEY is not configured");

    // Load birth chart data if provided
    let astrologyContext = "";
    if (birth_chart_id) {
      const { data: chart } = await supabase
        .from("birth_charts")
        .select("chart_data, full_name")
        .eq("id", birth_chart_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (chart?.chart_data) {
        const cd = chart.chart_data as Record<string, any>;
        const summary = typeof cd.llm_summary === "string" ? cd.llm_summary : JSON.stringify(cd);
        astrologyContext = `\n\n## BIRTH CHART DATA (for astrological overlay)
Name: ${chart.full_name}
${summary}
Use this chart (cite specific planet placements, dasha, and Moon nakshatra) to enhance the interpretation. Avoid hedging — speak in concrete factors.`;
      }
    }

    // Build dream context prompt
    const dreamPrompt = `Interpret this dream using Swapna Shastra principles.

**Dream Description:** ${dream_description}

**Time of Dream:** ${dream_time}
**Emotions Felt:** ${emotions || "Not specified"}
**Clarity:** ${clarity || "Not specified"}
**Recurring Dream:** ${is_recurring ? "Yes" : "No"}
**Lucid Dream:** ${is_lucid ? "Yes" : "No"}
**Current Life Context:** ${life_context || "Not provided"}
${astrologyContext}

First, extract the key symbols and classify this dream.`;

    // PHASE 1: Extract symbols and classify using tool calling
    const extractionResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ai_model || "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: applyGuru(SWAPNA_SHASTRA_SYSTEM_PROMPT, guru),
          messages: [{ role: "user", content: dreamPrompt }],
          tools: EXTRACTION_TOOLS,
          tool_choice: { type: "tool", name: "extract_dream_data" },
        }),
      }
    );

    if (!extractionResponse.ok) {
      const status = extractionResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await extractionResponse.text();
      console.error("Extraction error:", status, errText);
      throw new Error("AI extraction failed");
    }

    const extractionData = await extractionResponse.json();
    let extractedSymbols: unknown[] = [];
    let dreamCategory = "Psychological";

    const toolUseBlock = Array.isArray(extractionData.content)
      ? extractionData.content.find((b: any) => b.type === "tool_use")
      : undefined;
    if (toolUseBlock?.input) {
      try {
        extractedSymbols = toolUseBlock.input.symbols || [];
        dreamCategory = toolUseBlock.input.category || "Psychological";
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    // Save initial record
    const { data: dreamRecord, error: insertError } = await supabase
      .from("dream_interpretations")
      .insert({
        user_id: userId,
        dream_description,
        dream_time,
        emotions,
        clarity,
        is_recurring,
        is_lucid,
        life_context,
        birth_chart_id,
        extracted_symbols: extractedSymbols,
        dream_category: dreamCategory,
        language,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save dream");
    }

    // PHASE 2: Stream full interpretation
    const interpretationPrompt = `Now provide the full divine interpretation for this dream.

**Dream:** ${dream_description}
**Time:** ${dream_time}
**Emotions:** ${emotions || "Not specified"}
**Clarity:** ${clarity}
**Recurring:** ${is_recurring ? "Yes" : "No"}
**Lucid:** ${is_lucid ? "Yes" : "No"}
**Life Context:** ${life_context || "Not provided"}

**Extracted Symbols:** ${JSON.stringify(extractedSymbols)}
**Dream Category:** ${dreamCategory}
${astrologyContext}

Provide the complete layered interpretation following the exact output structure. Be thorough, wise, and compassionate.`;

    const streamResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ai_model || "claude-haiku-4-5-20251001",
          max_tokens: 8192,
          stream: true,
          system: applyGuru(SWAPNA_SHASTRA_SYSTEM_PROMPT + languageInstruction, guru),
          messages: [{ role: "user", content: interpretationPrompt }],
        }),
      }
    );

    if (!streamResponse.ok) {
      const status = streamResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI streaming failed");
    }

    // Create a TransformStream to intercept and collect the full interpretation
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Send metadata as first SSE event
    const metadata = JSON.stringify({
      type: "metadata",
      dream_id: dreamRecord.id,
      extracted_symbols: extractedSymbols,
      dream_category: dreamCategory,
    });
    writer.write(encoder.encode(`data: ${metadata}\n\n`));

    // Pipe the stream, translating Anthropic SSE → OpenAI SSE, and collect for DB update
    (async () => {
      let fullInterpretation = "";
      let sseBuffer = "";
      const reader = streamResponse.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });

          // Process complete lines
          let nl: number;
          while ((nl = sseBuffer.indexOf("\n")) !== -1) {
            const line = sseBuffer.slice(0, nl).trimEnd();
            sseBuffer = sseBuffer.slice(nl + 1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload) continue;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
                const text = parsed.delta.text;
                fullInterpretation += text;
                writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
              } else if (parsed.type === "message_stop") {
                writer.write(encoder.encode("data: [DONE]\n\n"));
              }
            } catch { /* partial json */ }
          }
        }
      } finally {
        // Save completed interpretation to DB
        if (fullInterpretation) {
          const serviceClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          await serviceClient
            .from("dream_interpretations")
            .update({ interpretation: fullInterpretation })
            .eq("id", dreamRecord.id);

          // Increment usage count after successful interpretation
          const newUsage = { ...usage, dreams_count: (usage.dreams_count || 0) + 1 };
          await serviceClient
            .from("profiles")
            .update({ feature_usage: newUsage })
            .eq("user_id", userId);
        }
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("interpret-dream error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
