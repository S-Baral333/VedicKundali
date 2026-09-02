// Layer 3 of the prediction engine: AI NARRATOR.
// Reads cached predicted_events (auto-computes if empty/stale), then asks the AI
// to translate the verified trigger list into Warm-Elder narration.
// The AI MUST NOT invent events, dates, or confidences.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { synthesizeEvents } from "../_shared/prediction-engine/synthesize.ts";
import { resolveGuruContext, applyGuru } from "../_shared/guru.ts";
import { normalizeLanguage, buildLanguageInstruction } from "../_shared/languages.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: uerr } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (uerr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    let chartId: string | undefined = body?.chart_id;
    const language = normalizeLanguage(body?.language);

    if (!chartId) {
      const { data: primary } = await admin.from("birth_charts")
        .select("id").eq("user_id", user.id).eq("is_primary", true).maybeSingle();
      chartId = primary?.id;
    }
    if (!chartId) {
      return new Response(JSON.stringify({ error: "No birth chart found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: chart } = await admin.from("birth_charts")
      .select("id, user_id, full_name, date_of_birth, birth_time, birthplace, chart_data")
      .eq("id", chartId).single();
    if (!chart || chart.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Chart not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load cached events scoped to this language. Recompute if missing or stale.
    let { data: events } = await admin
      .from("predicted_events")
      .select("*")
      .eq("chart_id", chartId)
      .eq("language", language)
      .gte("window_end", new Date().toISOString().slice(0,10))
      .order("window_start", { ascending: true });

    const newestGen = events?.[0]?.generated_at ? new Date(events[0].generated_at).getTime() : 0;
    const stale = !events || events.length === 0 || (Date.now() - newestGen) > STALE_MS;

    if (stale) {
      const fresh = synthesizeEvents(chart.chart_data);
      // Delete only the rows for this language so other languages' caches survive.
      await admin.from("predicted_events").delete().eq("chart_id", chartId).eq("language", language);
      if (fresh.length) {
        const rows = fresh.map(e => ({
          user_id: user.id, chart_id: chartId,
          event_type: e.event_type, life_area: e.life_area, headline: e.headline,
          window_start: e.window_start, window_end: e.window_end,
          confidence: e.confidence, triggers: e.triggers,
          language,
        }));
        await admin.from("predicted_events").insert(rows);
      }
      const refetch = await admin
        .from("predicted_events")
        .select("*")
        .eq("chart_id", chartId)
        .eq("language", language)
        .gte("window_end", new Date().toISOString().slice(0,10))
        .order("window_start", { ascending: true });
      events = refetch.data ?? [];
    }

    // Take top events for narration: highest-confidence per life_area, max 8
    const topByArea = new Map<string, any>();
    for (const ev of events ?? []) {
      const cur = topByArea.get(ev.life_area);
      if (!cur || cur.confidence < ev.confidence) topByArea.set(ev.life_area, ev);
    }
    const topEvents = Array.from(topByArea.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const triggerJson = topEvents.map(e => ({
      id: e.id,
      type: e.event_type,
      area: e.life_area,
      window: `${e.window_start} → ${e.window_end}`,
      confidence: e.confidence,
      headline: e.headline,
      triggers: e.triggers,
    }));

    const systemPrompt = `You are the WARM ELDER — a senior Vedic astrologer narrating verified predictions.

ABSOLUTE RULES:
1. You MUST NOT invent events, dates, planets, or confidence levels. You may only narrate events listed in VERIFIED_EVENTS.
2. Every narrated paragraph must cite the event's id and its triggers' specific astrological detail (e.g. "Pratyantar of Jupiter (natal H10 Leo)" — quote verbatim from triggers[].detail).
3. Avoid hedge words ("might", "could", "perhaps"). The events are deterministically computed — speak with calm certainty about the WINDOW, while keeping outcomes guidance-oriented (not fatalistic).
4. No generic horoscope filler. If VERIFIED_EVENTS is short, the report is short.
5. Ethical guardrail: never predict death, disease diagnosis, accident dates, or guaranteed lottery wins.`;

    const userPrompt = `Subject: ${chart.full_name}
Born: ${chart.date_of_birth} ${chart.birth_time} — ${chart.birthplace}
Today: ${new Date().toISOString().slice(0,10)}

VERIFIED_EVENTS (the ONLY events you may narrate):
${JSON.stringify(triggerJson, null, 2)}

For EACH event above, write 2-4 sentences in Warm-Elder voice that:
  • Open with the WINDOW (month range) and life area
  • Reference at least one trigger detail verbatim in parentheses
  • Close with one practical action the seeker can take inside the window

Format your response as JSON:
{
  "narrations": [
    { "event_id": "<uuid>", "text": "..." }
  ],
  "overview": "2-3 sentence overview of the next 12 months synthesized from these events only."
}`;

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        temperature: 0.6,
        system: applyGuru(systemPrompt, await resolveGuruContext(admin, user.id)) + buildLanguageInstruction(language),
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResp.status}`);
    }
    const aiJson = await aiResp.json();
    const content = aiJson.content?.[0]?.text ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { narrations: [], overview: content }; }

    // Write narrations back to events
    if (Array.isArray(parsed.narrations)) {
      for (const n of parsed.narrations) {
        if (n?.event_id && n?.text) {
          await admin.from("predicted_events")
            .update({ narration: n.text })
            .eq("id", n.event_id)
            .eq("user_id", user.id);
        }
      }
    }

    // Final list with narrations merged
    const narrationMap = new Map<string, string>(
      (parsed.narrations ?? []).filter((n: any) => n?.event_id).map((n: any) => [n.event_id, n.text])
    );
    const enriched = (events ?? []).map((e: any) => ({
      ...e,
      narration: narrationMap.get(e.id) ?? e.narration ?? null,
    }));

    return new Response(JSON.stringify({
      chart_id: chartId,
      overview: parsed.overview ?? "",
      events: enriched,
      generated_date: new Date().toISOString().slice(0,10),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-predictions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
