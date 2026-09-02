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

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optional language from body
    const reqBody = await req.json().catch(() => ({}));
    // Fetch user profile (includes language)
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, date_of_birth, birth_time, birthplace, onboarding_preferences, language")
      .eq("user_id", user.id)
      .single();
    const language = normalizeLanguage((reqBody as any)?.language || (profile as any)?.language);

    if (!profile) {
      return new Response(JSON.stringify({ insight: "Your sacred journey begins now. Explore your dashboard to discover cosmic guidance tailored for you." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prefs = profile.onboarding_preferences as any;
    const hasBirthData = profile.date_of_birth && profile.birth_time;

    // If no birth data, return a template insight
    if (!hasBirthData) {
      const priorities = prefs?.life_priorities || [];
      const state = prefs?.current_state || "";
      
      const priorityMap: Record<string, string> = {
        career: "professional growth and success",
        relationships: "meaningful connections",
        money: "financial stability",
        health: "vitality and wellness",
        emotional_clarity: "inner peace and clarity",
        major_decision: "navigating important life choices",
        spiritual_growth: "spiritual awakening",
        life_direction: "finding your true path",
      };

      const focusAreas = priorities.map((p: string) => priorityMap[p] || p).slice(0, 2);
      const focusText = focusAreas.length > 0
        ? `Your focus on ${focusAreas.join(" and ")} reveals a soul seeking purposeful transformation.`
        : "Your journey of self-discovery is about to unfold.";

      const stateMap: Record<string, string> = {
        calm: "Your inner calm is a powerful foundation — the cosmos rewards those who move with intention.",
        stressed: "The pressure you feel is often the universe preparing you for a breakthrough. Guidance awaits.",
        uncertain: "Uncertainty is the threshold of new possibilities. Your path is about to become clearer.",
        motivated: "Your momentum aligns beautifully with cosmic currents. Channel this energy wisely.",
        emotionally_heavy: "What weighs on you is ready to be understood. Healing begins with awareness.",
      };

      const stateText = stateMap[state] || "Your dashboard will continue adapting as you explore.";

      return new Response(JSON.stringify({ insight: `${focusText} ${stateText}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // With birth data — use AI for a personalized cosmic insight
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const priorities = prefs?.life_priorities || [];
    const state = prefs?.current_state || "unknown";
    const style = prefs?.guidance_style || "balanced";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: applyGuru(`You are a warm, wise Vedic astrologer welcoming a new seeker. Generate a 2-3 sentence personalized cosmic insight based on their profile. Tone: ${style}. Be encouraging, specific, and mystical but grounded. Do NOT use generic horoscope language. Reference their specific details subtly.`, await resolveGuruContext(supabase, user.id)) + buildLanguageInstruction(language),
        messages: [
          {
            role: "user",
            content: `New seeker profile:
- Name: ${profile.full_name || "Seeker"}
- Birth date: ${profile.date_of_birth}
- Birth time: ${profile.birth_time}
- Birthplace: ${profile.birthplace || "Unknown"}
- Life priorities: ${priorities.join(", ") || "general guidance"}
- Current emotional state: ${state}
- Preferred guidance style: ${style}

Generate a brief, personalized welcome insight (2-3 sentences). Make it feel like the cosmos recognizes them.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
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
      const errorText = await response.text();
      console.error("AI error:", response.status, errorText);
      // Fallback to template
      return new Response(JSON.stringify({ insight: "The stars have noted your arrival. Your cosmic blueprint is being prepared — explore your dashboard to begin receiving personalized guidance." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const insight = aiResult.content?.[0]?.text || "Your cosmic journey begins. The stars are aligning to guide you.";

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-onboarding-insight error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
