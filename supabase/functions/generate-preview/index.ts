import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { normalizeLanguage, buildLanguageInstruction } from "../_shared/languages.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiting by IP (resets on cold start)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

// Deterministic Vedic Sun sign from date of birth
function getVedicSunSign(dob: string): { sign: string; element: string; rulingPlanet: string; nakshatra: string; quality: string } {
  const date = new Date(dob);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Vedic (sidereal) Sun signs — approximate tropical-to-sidereal shift (~23 days)
  const signs = [
    { sign: "Mesha (Aries)", start: [4, 14], end: [5, 14], element: "Fire", rulingPlanet: "Mars", quality: "Cardinal" },
    { sign: "Vrishabha (Taurus)", start: [5, 15], end: [6, 14], element: "Earth", rulingPlanet: "Venus", quality: "Fixed" },
    { sign: "Mithuna (Gemini)", start: [6, 15], end: [7, 15], element: "Air", rulingPlanet: "Mercury", quality: "Mutable" },
    { sign: "Karka (Cancer)", start: [7, 16], end: [8, 16], element: "Water", rulingPlanet: "Moon", quality: "Cardinal" },
    { sign: "Simha (Leo)", start: [8, 17], end: [9, 16], element: "Fire", rulingPlanet: "Sun", quality: "Fixed" },
    { sign: "Kanya (Virgo)", start: [9, 17], end: [10, 16], element: "Earth", rulingPlanet: "Mercury", quality: "Mutable" },
    { sign: "Tula (Libra)", start: [10, 17], end: [11, 15], element: "Air", rulingPlanet: "Venus", quality: "Cardinal" },
    { sign: "Vrishchika (Scorpio)", start: [11, 16], end: [12, 15], element: "Water", rulingPlanet: "Mars", quality: "Fixed" },
    { sign: "Dhanu (Sagittarius)", start: [12, 16], end: [1, 13], element: "Fire", rulingPlanet: "Jupiter", quality: "Mutable" },
    { sign: "Makara (Capricorn)", start: [1, 14], end: [2, 12], element: "Earth", rulingPlanet: "Saturn", quality: "Cardinal" },
    { sign: "Kumbha (Aquarius)", start: [2, 13], end: [3, 13], element: "Air", rulingPlanet: "Saturn", quality: "Fixed" },
    { sign: "Meena (Pisces)", start: [3, 14], end: [4, 13], element: "Water", rulingPlanet: "Jupiter", quality: "Mutable" },
  ];

  // Nakshatras (simplified — based on approximate lunar mansion from solar position)
  const nakshatras = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta",
    "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
  ];

  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const nakshatraIndex = Math.floor((dayOfYear / 365) * 27) % 27;

  for (const s of signs) {
    const [sm, sd] = s.start;
    const [em, ed] = s.end;
    // Handle Sagittarius wrapping around year boundary
    if (sm > em) {
      if ((month === sm && day >= sd) || (month === em && day <= ed) || month === 12 && month > sm) {
        return { sign: s.sign, element: s.element, rulingPlanet: s.rulingPlanet, nakshatra: nakshatras[nakshatraIndex], quality: s.quality };
      }
    } else if ((month === sm && day >= sd) || (month === em && day <= ed) || (month > sm && month < em)) {
      return { sign: s.sign, element: s.element, rulingPlanet: s.rulingPlanet, nakshatra: nakshatras[nakshatraIndex], quality: s.quality };
    }
  }

  return { sign: "Meena (Pisces)", element: "Water", rulingPlanet: "Jupiter", nakshatra: nakshatras[nakshatraIndex], quality: "Mutable" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    
    const { type, language: langInput, ...payload } = await req.json();
    const language = normalizeLanguage(langInput);

    // Chart preview is deterministic — no rate limit needed
    if (type === "chart") {
      const { date_of_birth } = payload;
      if (!date_of_birth) throw new Error("date_of_birth is required");
      const result = getVedicSunSign(date_of_birth);
      return new Response(JSON.stringify({ type: "chart", result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI-powered previews — rate limit
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: "Daily preview limit reached. Sign up for unlimited readings!" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "horoscope") {
      const { sign } = payload;
      if (!sign) throw new Error("sign is required");
      systemPrompt = `You are a Vedic astrologer. Give a brief, uplifting 2-3 sentence daily horoscope preview for the given Vedic sun sign. Be specific and insightful. Do NOT use generic platitudes. End with a teaser that makes them want to read more.`;
      userPrompt = `Today's brief Vedic horoscope preview for ${sign}:`;
    } else if (type === "dream") {
      const { dream_text } = payload;
      if (!dream_text) throw new Error("dream_text is required");
      const truncated = dream_text.slice(0, 150);
      systemPrompt = `You are a Swapna Shastra (Vedic dream interpretation) expert. Give a brief 2-3 sentence teaser interpretation of the dream. Be mystical and insightful. End with a hint that there's deeper meaning to uncover, making them want the full analysis.`;
      userPrompt = `Brief dream interpretation preview for: "${truncated}"`;
    } else {
      throw new Error("Invalid type. Use 'horoscope', 'dream', or 'chart'.");
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
        max_tokens: 256,
        system: systemPrompt + buildLanguageInstruction(language),
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Service busy. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service temporarily unavailable");
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "The stars are aligning... Sign up for your full reading.";

    return new Response(JSON.stringify({ type, result: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-preview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
