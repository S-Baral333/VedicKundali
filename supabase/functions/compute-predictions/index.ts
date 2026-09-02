// Layer 1+2 of the prediction engine. Deterministic.
// Reads the user's primary birth chart, synthesizes ranked PredictedEvents,
// upserts into public.predicted_events. No AI calls here.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { synthesizeEvents } from "../_shared/prediction-engine/synthesize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    let chartId: string | undefined = body?.chart_id;

    if (!chartId) {
      const { data: primary } = await admin
        .from("birth_charts")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .maybeSingle();
      chartId = primary?.id;
    }
    if (!chartId) {
      return new Response(JSON.stringify({ error: "No birth chart found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: chart, error: cerr } = await admin
      .from("birth_charts")
      .select("id, user_id, chart_data")
      .eq("id", chartId)
      .single();
    if (cerr || !chart || chart.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Chart not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const events = synthesizeEvents(chart.chart_data);

    // Replace cache for this chart
    await admin.from("predicted_events").delete().eq("chart_id", chartId);

    if (events.length > 0) {
      const rows = events.map(e => ({
        user_id: user.id,
        chart_id: chartId,
        event_type: e.event_type,
        life_area: e.life_area,
        headline: e.headline,
        window_start: e.window_start,
        window_end: e.window_end,
        confidence: e.confidence,
        triggers: e.triggers,
      }));
      const { error: ierr } = await admin.from("predicted_events").insert(rows);
      if (ierr) {
        console.error("compute-predictions insert error", ierr);
        throw ierr;
      }
    }

    return new Response(JSON.stringify({
      chart_id: chartId,
      count: events.length,
      events,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("compute-predictions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
