// Prescription-Grade Remedy Engine — Phase 4 (Premium / Elite only).
// Synthesizes natal placements, dignities, dasha lord, and afflictions into
// a precise classical prescription: gemstone (carats + metal + finger + day + time),
// mantra (with japa count), fasting (specific tithi/vara), daan (items + recipients).
// Cached per-chart in chart_data.remedy_prescription.

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

// ----- Classical reference tables (Brihat Parashara / Phaladeepika / Mani-Mala) -----

interface GemstoneSpec {
  primary: string;       // English name
  sanskrit: string;
  substitute: string;    // affordable upa-ratna
  metal: "Gold" | "Silver" | "Copper" | "Panchadhatu" | "Iron" | "Ashtadhatu";
  finger: "Index" | "Middle" | "Ring" | "Little";
  day: string;           // Day to first wear
  hora: string;          // Planetary hour (sunrise hora of)
  carat_min: number;
  carat_max: number;
  mantra_for_energizing: string;
  japa_count: number;    // for energizing the stone
}

const GEMSTONES: Record<string, GemstoneSpec> = {
  Sun: {
    primary: "Ruby", sanskrit: "Manikya", substitute: "Red Garnet",
    metal: "Gold", finger: "Ring", day: "Sunday at sunrise", hora: "Sun hora",
    carat_min: 3, carat_max: 6,
    mantra_for_energizing: "Om Hraam Hreem Hraum Sah Suryaya Namah",
    japa_count: 7000,
  },
  Moon: {
    primary: "Natural Pearl", sanskrit: "Moti", substitute: "Moonstone",
    metal: "Silver", finger: "Little", day: "Monday evening (after moonrise)", hora: "Moon hora",
    carat_min: 4, carat_max: 7,
    mantra_for_energizing: "Om Shraam Shreem Shraum Sah Chandraya Namah",
    japa_count: 11000,
  },
  Mars: {
    primary: "Red Coral", sanskrit: "Moonga", substitute: "Carnelian",
    metal: "Copper", finger: "Ring", day: "Tuesday at sunrise", hora: "Mars hora",
    carat_min: 6, carat_max: 9,
    mantra_for_energizing: "Om Kraam Kreem Kraum Sah Bhaumaya Namah",
    japa_count: 10000,
  },
  Mercury: {
    primary: "Emerald", sanskrit: "Panna", substitute: "Green Onyx / Peridot",
    metal: "Gold", finger: "Little", day: "Wednesday morning", hora: "Mercury hora",
    carat_min: 3, carat_max: 6,
    mantra_for_energizing: "Om Braam Breem Braum Sah Budhaya Namah",
    japa_count: 9000,
  },
  Jupiter: {
    primary: "Yellow Sapphire", sanskrit: "Pukhraj", substitute: "Yellow Topaz / Citrine",
    metal: "Gold", finger: "Index", day: "Thursday at sunrise", hora: "Jupiter hora",
    carat_min: 3, carat_max: 6,
    mantra_for_energizing: "Om Graam Greem Graum Sah Gurave Namah",
    japa_count: 19000,
  },
  Venus: {
    primary: "Diamond", sanskrit: "Heera", substitute: "White Sapphire / White Zircon",
    metal: "Gold", finger: "Middle", day: "Friday before sunrise", hora: "Venus hora",
    carat_min: 0.25, carat_max: 1,
    mantra_for_energizing: "Om Draam Dreem Draum Sah Shukraya Namah",
    japa_count: 16000,
  },
  Saturn: {
    primary: "Blue Sapphire", sanskrit: "Neelam", substitute: "Amethyst / Lapis Lazuli",
    metal: "Panchadhatu", finger: "Middle", day: "Saturday evening", hora: "Saturn hora",
    carat_min: 4, carat_max: 7,
    mantra_for_energizing: "Om Praam Preem Praum Sah Shanaye Namah",
    japa_count: 23000,
  },
  Rahu: {
    primary: "Hessonite", sanskrit: "Gomedh", substitute: "Orange Zircon",
    metal: "Panchadhatu", finger: "Middle", day: "Saturday at twilight", hora: "Rahu hora",
    carat_min: 5, carat_max: 9,
    mantra_for_energizing: "Om Bhraam Bhreem Bhraum Sah Rahave Namah",
    japa_count: 18000,
  },
  Ketu: {
    primary: "Cat's Eye", sanskrit: "Lehsuniya", substitute: "Tiger's Eye",
    metal: "Panchadhatu", finger: "Middle", day: "Tuesday at twilight", hora: "Ketu hora",
    carat_min: 5, carat_max: 9,
    mantra_for_energizing: "Om Sraam Sreem Sraum Sah Ketave Namah",
    japa_count: 17000,
  },
};

interface MantraSpec {
  name: string;
  beej: string;          // single-line beej mantra
  long: string;          // longer Vedic mantra
  japa_daily: number;    // recommended daily count
  japa_total: number;    // total for full anushthana
  best_time: string;     // brahma muhurta etc.
  mala: string;          // recommended rosary
}

const MANTRAS: Record<string, MantraSpec> = {
  Sun: {
    name: "Surya Mantra",
    beej: "Om Hraam Hreem Hraum Sah Suryaya Namah",
    long: "Japakusuma Sankasham Kashyapeyam Mahadyutim | Tamorim Sarva Papaghnam Pranatosmi Divakaram ||",
    japa_daily: 108, japa_total: 7000,
    best_time: "Sunrise, facing east",
    mala: "Ruby or Rudraksha (12 Mukhi)",
  },
  Moon: {
    name: "Chandra Mantra",
    beej: "Om Shraam Shreem Shraum Sah Chandraya Namah",
    long: "Dadhi Shankha Tushaarabham Ksheerodaarnava Sambhavam | Namaami Shashinam Somam Shambhor Mukuta Bhushanam ||",
    japa_daily: 108, japa_total: 11000,
    best_time: "Monday evening after moonrise",
    mala: "Pearl or Sphatik (crystal)",
  },
  Mars: {
    name: "Mangal Mantra",
    beej: "Om Kraam Kreem Kraum Sah Bhaumaya Namah",
    long: "Dharaneegarbha Sambhutam Vidyutkanti Samaprabham | Kumaram Shakti Hastam Cha Mangalam Pranamamyaham ||",
    japa_daily: 108, japa_total: 10000,
    best_time: "Tuesday at sunrise",
    mala: "Red Coral or Rudraksha (3 Mukhi)",
  },
  Mercury: {
    name: "Budha Mantra",
    beej: "Om Braam Breem Braum Sah Budhaya Namah",
    long: "Priyangu Kalika Shyamam Roopena Pratimam Budham | Saumyam Saumya Gunopetam Tam Budham Pranamamyaham ||",
    japa_daily: 108, japa_total: 9000,
    best_time: "Wednesday morning",
    mala: "Emerald or Rudraksha (10 Mukhi)",
  },
  Jupiter: {
    name: "Guru Mantra",
    beej: "Om Graam Greem Graum Sah Gurave Namah",
    long: "Devanaam Cha Rishinaam Cha Gurum Kanchana Sannibham | Buddhi Bhutam Trilokesham Tam Namami Brihaspatim ||",
    japa_daily: 108, japa_total: 19000,
    best_time: "Thursday at sunrise",
    mala: "Yellow Sapphire or Rudraksha (5 Mukhi)",
  },
  Venus: {
    name: "Shukra Mantra",
    beej: "Om Draam Dreem Draum Sah Shukraya Namah",
    long: "Hima Kunda Mrinaalaabham Daityaanaam Paramam Gurum | Sarva Shaastra Pravaktaram Bhaargavam Pranamaamyaham ||",
    japa_daily: 108, japa_total: 16000,
    best_time: "Friday before sunrise",
    mala: "Diamond or Sphatik",
  },
  Saturn: {
    name: "Shani Mantra",
    beej: "Om Praam Preem Praum Sah Shanaye Namah",
    long: "Neelaanjana Samaabhaasam Raviputram Yamaagrajam | Chaaya Maartanda Sambhutam Tam Namaami Shanaishcharam ||",
    japa_daily: 108, japa_total: 23000,
    best_time: "Saturday evening",
    mala: "Blue Sapphire or Rudraksha (14 Mukhi)",
  },
  Rahu: {
    name: "Rahu Mantra",
    beej: "Om Bhraam Bhreem Bhraum Sah Rahave Namah",
    long: "Ardha Kayam Mahaa Veeryam Chandraaditya Vimardanam | Simhikaa Garbha Sambhootam Tam Raahum Pranamaamyaham ||",
    japa_daily: 108, japa_total: 18000,
    best_time: "Saturday twilight (sandhya)",
    mala: "Hessonite or Rudraksha (8 Mukhi)",
  },
  Ketu: {
    name: "Ketu Mantra",
    beej: "Om Sraam Sreem Sraum Sah Ketave Namah",
    long: "Palaasha Pushpa Sankaasham Taarakaa Graha Mastakam | Raudram Raudraatmakam Ghoram Tam Ketum Pranamaamyaham ||",
    japa_daily: 108, japa_total: 17000,
    best_time: "Tuesday twilight",
    mala: "Cat's Eye or Rudraksha (9 Mukhi)",
  },
};

interface FastingSpec {
  vara: string;          // weekday
  tithi: string;         // lunar day
  food: string;          // what to consume
  abstain: string;       // what to avoid
  duration: string;      // sunrise-to-sunset etc.
}

const FASTING: Record<string, FastingSpec> = {
  Sun:     { vara: "Sunday",    tithi: "Saptami of Shukla Paksha",  food: "Wheat, jaggery, water once",          abstain: "Salt, oil",         duration: "Sunrise → Sunset" },
  Moon:    { vara: "Monday",    tithi: "Purnima (Full Moon)",       food: "Milk, white rice, fruits",            abstain: "Grains, salt",      duration: "Sunrise → Moonrise" },
  Mars:    { vara: "Tuesday",   tithi: "Krishna Chaturdashi",       food: "Jaggery, masoor dal one meal",        abstain: "Salt, sour foods",  duration: "Sunrise → Sunset" },
  Mercury: { vara: "Wednesday", tithi: "Shukla Tritiya",            food: "Green moong, fruits, milk",           abstain: "Meat, eggs",        duration: "Sunrise → Sunset" },
  Jupiter: { vara: "Thursday",  tithi: "Shukla Panchami",           food: "Yellow lentils, banana, milk",        abstain: "Salt, rice",        duration: "Sunrise → Sunset" },
  Venus:   { vara: "Friday",    tithi: "Shukla Ashtami",            food: "White rice + ghee + sugar one meal",  abstain: "Sour, spicy",       duration: "Sunrise → Sunset" },
  Saturn:  { vara: "Saturday",  tithi: "Krishna Ashtami",           food: "Black sesame, urad dal one meal",     abstain: "Salt, alcohol",     duration: "Sunrise → Sunset" },
  Rahu:    { vara: "Saturday",  tithi: "Amavasya",                  food: "One meal of khichdi (rice + urad)",   abstain: "Onion, garlic",     duration: "Rahu Kala observance" },
  Ketu:    { vara: "Tuesday",   tithi: "Amavasya",                  food: "Mixed grain khichdi, plain water",    abstain: "Meat, alcohol",     duration: "Sunrise → Sunset" },
};

interface DaanSpec {
  items: string[];
  recipient: string;
  day: string;
  time: string;
  quantity_guidance: string;
}

const DAAN: Record<string, DaanSpec> = {
  Sun:     { items: ["Wheat", "Jaggery (gud)", "Copper vessel", "Red cloth"],          recipient: "Father figure or temple priest", day: "Sunday",  time: "Before noon",       quantity_guidance: "1.25 kg wheat + 250 g jaggery" },
  Moon:    { items: ["White rice", "Milk", "Silver coin", "White cloth", "Pearl"],     recipient: "Mother figure or elderly woman", day: "Monday",  time: "Evening",           quantity_guidance: "1 kg rice + 1 L milk" },
  Mars:    { items: ["Red lentils (masoor)", "Jaggery", "Red cloth", "Copper"],         recipient: "Brother or temple",              day: "Tuesday", time: "Sunrise",           quantity_guidance: "1.25 kg masoor + 100 g jaggery" },
  Mercury: { items: ["Green moong", "Green cloth", "Green vegetables", "Bronze item"],  recipient: "Young student / scholar",        day: "Wednesday", time: "Morning",          quantity_guidance: "1 kg moong + green produce basket" },
  Jupiter: { items: ["Yellow lentils (chana dal)", "Turmeric", "Yellow cloth", "Gold ornament"], recipient: "Brahmin / teacher",      day: "Thursday", time: "Sunrise",          quantity_guidance: "1.25 kg dal + 50 g turmeric" },
  Venus:   { items: ["White sugar", "Ghee", "White cloth", "Silver", "Curd"],            recipient: "Young girl / spouse's family",  day: "Friday",   time: "Morning",          quantity_guidance: "500 g sugar + 250 g ghee" },
  Saturn:  { items: ["Black sesame (til)", "Urad dal", "Iron item", "Black cloth", "Mustard oil"], recipient: "Elderly poor or laborer", day: "Saturday", time: "Evening",       quantity_guidance: "500 g til + 1 kg urad + 1 L mustard oil" },
  Rahu:    { items: ["Coconut into flowing water", "Black/blue blanket", "Mustard oil", "Lead"], recipient: "Beggar or sweeper",      day: "Saturday", time: "Rahu Kala",        quantity_guidance: "1 coconut + 1 blanket + 500 ml oil" },
  Ketu:    { items: ["Sesame oil", "Brown blanket", "Iron item", "Goat-related fodder"], recipient: "Stray dog / wandering ascetic",  day: "Tuesday",  time: "Twilight (sandhya)", quantity_guidance: "500 ml til oil + blanket" },
};

// ----- Affliction scoring -----

interface PlanetAffliction {
  planet: string;
  severity: number;     // 0-100, higher = more afflicted
  reasons: string[];
  is_dasha_lord: boolean;
  is_lagna_lord: boolean;
}

function scoreAfflictions(chartData: any): PlanetAffliction[] {
  const planets: any[] = chartData?.planets || [];
  const dashaLord: string = chartData?.dasha?.maha_dasha || "";
  const lagnaSign: string = chartData?.ascendant?.sign || "";
  const SIGN_LORD: Record<string, string> = {
    Aries:"Mars", Taurus:"Venus", Gemini:"Mercury", Cancer:"Moon", Leo:"Sun",
    Virgo:"Mercury", Libra:"Venus", Scorpio:"Mars", Sagittarius:"Jupiter",
    Capricorn:"Saturn", Aquarius:"Saturn", Pisces:"Jupiter",
  };
  const lagnaLord = SIGN_LORD[lagnaSign] || "";

  const out: PlanetAffliction[] = [];
  for (const p of planets) {
    let severity = 0;
    const reasons: string[] = [];

    if (p.dignity === "debilitated") { severity += 35; reasons.push("Debilitated (neecha)"); }
    if (p.dignity === "enemy")        { severity += 15; reasons.push("In enemy sign"); }
    if (p.is_combust)                 { severity += 25; reasons.push("Combust (asta)"); }
    if (p.is_retrograde && p.name !== "Rahu" && p.name !== "Ketu") {
      severity += 8; reasons.push("Retrograde");
    }
    // Dusthana houses (6,8,12)
    if ([6, 8, 12].includes(Number(p.house))) {
      severity += 18; reasons.push(`In dusthana house ${p.house}`);
    }
    // Shadbala if available
    const shadbala = Number(p.shadbala_total ?? p.shadbala ?? 0);
    if (shadbala > 0 && shadbala < 50) {
      severity += Math.round((50 - shadbala) / 2);
      reasons.push(`Low Shadbala (${Math.round(shadbala)})`);
    }

    const isDashaLord = p.name === dashaLord;
    const isLagnaLord = p.name === lagnaLord;
    if (isDashaLord) { severity += 10; reasons.push("Active Maha Dasha lord"); }
    if (isLagnaLord) { severity += 10; reasons.push("Lagna lord"); }

    if (severity > 0) {
      out.push({
        planet: p.name,
        severity: Math.min(100, severity),
        reasons,
        is_dasha_lord: isDashaLord,
        is_lagna_lord: isLagnaLord,
      });
    }
  }
  out.sort((a, b) => b.severity - a.severity);
  return out;
}

// Gemstone safety: certain combos are classically contraindicated together.
const GEMSTONE_INCOMPATIBLE: Record<string, string[]> = {
  Sun: ["Saturn", "Venus", "Rahu"],
  Moon: ["Mars", "Rahu", "Ketu"],
  Mars: ["Mercury", "Saturn", "Rahu"],
  Mercury: ["Moon", "Mars", "Ketu"],
  Jupiter: ["Venus", "Rahu", "Ketu"],
  Venus: ["Sun", "Moon", "Mars"],
  Saturn: ["Sun", "Moon", "Mars"],
  Rahu: ["Sun", "Moon", "Mars", "Jupiter"],
  Ketu: ["Moon", "Mars", "Mercury", "Jupiter"],
};

interface Prescription {
  planet: string;
  affliction: PlanetAffliction;
  gemstone: GemstoneSpec & { caution?: string };
  mantra: MantraSpec;
  fasting: FastingSpec;
  daan: DaanSpec;
  rationale: string;
  priority: "primary" | "secondary" | "supportive";
}

function buildPrescription(
  affliction: PlanetAffliction,
  priority: "primary" | "secondary" | "supportive",
  alreadyPrescribed: string[]
): Prescription {
  const planet = affliction.planet;
  const gem = { ...GEMSTONES[planet] };
  let caution: string | undefined;
  for (const prev of alreadyPrescribed) {
    if (GEMSTONE_INCOMPATIBLE[planet]?.includes(prev)) {
      caution = `Do not wear simultaneously with ${prev} gemstone — switch to substitute (${gem.substitute}) or wear on separate days only.`;
      break;
    }
  }
  return {
    planet,
    affliction,
    gemstone: { ...gem, caution },
    mantra: MANTRAS[planet],
    fasting: FASTING[planet],
    daan: DAAN[planet],
    rationale: affliction.reasons.join(" + ") +
      (affliction.is_dasha_lord ? " — currently the active Dasha lord, so remedies have maximum effect now." : "") +
      (affliction.is_lagna_lord ? " — being the Lagna lord, strengthening this planet uplifts overall life force." : ""),
    priority,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Tier gate — Premium or Elite only.
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .maybeSingle();
    const tier = (profile?.subscription_tier || "free").toLowerCase();
    const superAdmin = await isSuperAdmin(supabase, user.id);
    if (!superAdmin && tier !== "premium" && tier !== "elite") {
      return new Response(
        JSON.stringify({ error: "premium_required", message: "Prescription-grade remedies require a Premium or Elite subscription." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const chart_id = String(body.chart_id || "");
    const force_refresh = Boolean(body.force_refresh);
    const language = normalizeLanguage(body.language);
    const languageInstruction = buildLanguageInstruction(language);
    if (!chart_id) {
      return new Response(JSON.stringify({ error: "chart_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: chart, error: chartErr } = await supabase
      .from("birth_charts")
      .select("id, user_id, full_name, chart_data")
      .eq("id", chart_id)
      .maybeSingle();
    if (chartErr || !chart) {
      return new Response(JSON.stringify({ error: "Chart not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (chart.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cd: any = chart.chart_data || {};
    if (!Array.isArray(cd.planets) || cd.planets.length === 0) {
      return new Response(JSON.stringify({ error: "Chart missing planet data — please upgrade chart first" }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cache check (1 prescription per chart, regenerated on chart upgrade)
    const cached = cd.remedy_prescription;
    if (!force_refresh && cached?.generated_at && cached?.chart_signature === (cd.chart_signature || cd.last_upgrade_at || "")) {
      return new Response(JSON.stringify({ ...cached, from_cache: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const afflictions = scoreAfflictions(cd);
    const dashaLord = cd?.dasha?.maha_dasha || "";

    // Build prescriptions: always include dasha lord remedy + top 2 afflicted (dedupe)
    const ordered: PlanetAffliction[] = [];
    if (dashaLord) {
      const dl = afflictions.find(a => a.planet === dashaLord);
      if (dl) ordered.push(dl);
      else ordered.push({ planet: dashaLord, severity: 30, reasons: ["Active Dasha lord — strengthen for current period"], is_dasha_lord: true, is_lagna_lord: false });
    }
    for (const a of afflictions) {
      if (ordered.find(o => o.planet === a.planet)) continue;
      if (ordered.length >= 3) break;
      if (a.severity >= 25) ordered.push(a);
    }

    const prescriptions: Prescription[] = [];
    const planetsAlready: string[] = [];
    ordered.forEach((a, i) => {
      const priority = i === 0 ? "primary" : i === 1 ? "secondary" : "supportive";
      const presc = buildPrescription(a, priority, planetsAlready);
      prescriptions.push(presc);
      planetsAlready.push(a.planet);
    });

    // Optional AI summary (Elite gets richer model). Fail-soft.
    let ai_synthesis = "";
    let ai_skipped = false;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      console.warn("generate-remedies: ANTHROPIC_API_KEY not set — AI synthesis skipped");
      ai_skipped = true;
    } else if (prescriptions.length > 0) {
      try {
        const model = tier === "elite" ? "claude-sonnet-5" : "claude-haiku-4-5-20251001";
        const summary = prescriptions.map(p =>
          `${p.priority.toUpperCase()} — ${p.planet}: ${p.affliction.reasons.join(", ")}. Gem: ${p.gemstone.primary} (${p.gemstone.carat_min}-${p.gemstone.carat_max} ct). Mantra: ${p.mantra.beej}. Fast: ${p.fasting.vara}.`
        ).join("\n");
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            max_tokens: 512,
            temperature: 0.6,
            system: applyGuru("You are a Vedic astrologer in the lineage of Brihat Parashara Hora Shastra. Speak warmly and precisely. No hedging. No medical or financial promises. 4-6 sentences max." + languageInstruction, await resolveGuruContext(supabase, user.id)),
            messages: [
              { role: "user", content: `Synthesize this remedy prescription for ${chart.full_name}. Explain in plain language WHY these remedies are recommended right now (cite specific planet positions/strengths from the chart) and HOW to begin practically this week. Do not list dose numbers — those are shown separately. Active Dasha: ${dashaLord}.\n\n${cd.llm_summary || ""}\n\n${summary}` },
            ],
          }),
        });
        if (aiRes.ok) {
          const j = await aiRes.json();
          ai_synthesis = j?.content?.[0]?.text?.trim() || "";
        }
      } catch (e) {
        console.warn("AI synthesis failed (non-fatal):", e);
      }
    }

    const result = {
      chart_id,
      tier,
      generated_at: new Date().toISOString(),
      chart_signature: cd.chart_signature || cd.last_upgrade_at || "",
      dasha_lord: dashaLord,
      afflictions_summary: afflictions.slice(0, 6),
      prescriptions,
      ai_synthesis,
      ai_skipped,
      disclaimer: "These classical recommendations are spiritual practices, not medical, legal, or financial advice. Consult a qualified astrologer before wearing gemstones, especially if combining with other stones.",
    };

    // Persist cache
    await supabase
      .from("birth_charts")
      .update({ chart_data: { ...cd, remedy_prescription: result } })
      .eq("id", chart_id);

    return new Response(JSON.stringify({ ...result, from_cache: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-remedies error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
