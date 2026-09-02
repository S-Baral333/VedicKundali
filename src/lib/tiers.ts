// Single source of truth for the Sanskrit-tier subscription system.
// All gates, pricing, and copy reference these constants.

export type Tier = "darshana" | "sadhaka" | "grihastha" | "jyotisha";

export type ResourceKey =
  | "ai_chat"
  | "ai_reading"
  | "dream"
  | "pdf_download";

export type FeatureKey =
  // hard-gated features (require min tier)
  | "destiny_timeline"
  | "muhurta_calculator"
  | "compatibility"
  | "varshaphal"
  | "transit_overlays"
  | "sade_sati"
  | "south_indian_chart"
  | "divisional_d9"
  | "divisional_all"
  | "hindi_guru"
  | "voice_guru"
  | "white_label_pdf"
  | "client_dashboard"
  | "batch_charts"
  | "ephemeris"
  // quota-gated features (use limits[resource])
  | "ai_chat"
  | "ai_reading"
  | "dream"
  | "pdf_download"
  // chart slot limit
  | "extra_chart";

export interface TierConfig {
  key: Tier;
  sanskrit: string;
  devanagari: string;
  meaning: string;
  priceMonthlyAud: number;
  priceAnnualAud: number;
  trialDays: number;
  available: boolean;       // false = "coming soon" (e.g. Jyotisha v1)
  // numeric quotas: -1 = unlimited, 0 = blocked
  limits: {
    charts: number;
    ai_chat: number;        // messages / month
    ai_reading: number;     // full readings (-1 unlimited, 1 = preview only)
    dream: number;          // interpretations / month
    pdf_download: number;   // -1 unlimited
  };
  features: Record<Exclude<FeatureKey, ResourceKey | "extra_chart">, boolean>;
}

export const TIERS: Record<Tier, TierConfig> = {
  darshana: {
    key: "darshana",
    sanskrit: "Darshana",
    devanagari: "दर्शन",
    meaning: "A glimpse",
    priceMonthlyAud: 0,
    priceAnnualAud: 0,
    trialDays: 0,
    available: true,
    limits: {
      charts: 1,
      ai_chat: 3,         // refined: 3 lifetime preview (was 1/mo)
      ai_reading: 1,      // preview only
      dream: 3,
      pdf_download: 0,
    },
    features: {
      destiny_timeline: false,
      muhurta_calculator: false,
      compatibility: false,
      varshaphal: false,
      transit_overlays: false,
      sade_sati: false,
      south_indian_chart: false,
      divisional_d9: false,
      divisional_all: false,
      hindi_guru: false,
      voice_guru: false,
      white_label_pdf: false,
      client_dashboard: false,
      batch_charts: false,
      ephemeris: false,
    },
  },
  sadhaka: {
    key: "sadhaka",
    sanskrit: "Sadhaka",
    devanagari: "साधक",
    meaning: "The practitioner",
    priceMonthlyAud: 9.99,
    priceAnnualAud: 99.9,
    trialDays: 7,
    available: true,
    limits: {
      charts: 3,
      ai_chat: 30,        // refined up from 10
      ai_reading: -1,
      dream: 20,
      pdf_download: -1,
    },
    features: {
      destiny_timeline: true,
      muhurta_calculator: true,
      compatibility: false,
      varshaphal: true,
      transit_overlays: false,
      sade_sati: false,
      south_indian_chart: true,
      divisional_d9: true,
      divisional_all: false,
      hindi_guru: false,
      voice_guru: false,
      white_label_pdf: false,
      client_dashboard: false,
      batch_charts: false,
      ephemeris: false,
    },
  },
  grihastha: {
    key: "grihastha",
    sanskrit: "Grihastha",
    devanagari: "गृहस्थ",
    meaning: "The householder",
    priceMonthlyAud: 39.99,
    priceAnnualAud: 399.9,
    trialDays: 7,
    available: true,
    limits: {
      charts: 7,
      ai_chat: 50,
      ai_reading: -1,
      dream: 50,
      pdf_download: -1,
    },
    features: {
      destiny_timeline: true,
      muhurta_calculator: true,
      compatibility: true,
      varshaphal: true,
      transit_overlays: true,
      sade_sati: true,
      south_indian_chart: true,
      divisional_d9: true,
      divisional_all: true,
      hindi_guru: true,
      voice_guru: false,
      white_label_pdf: false,
      client_dashboard: false,
      batch_charts: false,
      ephemeris: false,
    },
  },
  jyotisha: {
    key: "jyotisha",
    sanskrit: "Jyotisha",
    devanagari: "ज्योतिष",
    meaning: "The astrologer",
    priceMonthlyAud: 79.99,
    priceAnnualAud: 799.9,
    trialDays: 7,
    available: false,        // held until pro tools ship
    limits: {
      charts: -1,
      ai_chat: -1,
      ai_reading: -1,
      dream: -1,
      pdf_download: -1,
    },
    features: {
      destiny_timeline: true,
      muhurta_calculator: true,
      compatibility: true,
      varshaphal: true,
      transit_overlays: true,
      sade_sati: true,
      south_indian_chart: true,
      divisional_d9: true,
      divisional_all: true,
      hindi_guru: true,
      voice_guru: true,
      white_label_pdf: true,
      client_dashboard: true,
      batch_charts: true,
      ephemeris: true,
    },
  },
};

export const TIER_ORDER: Tier[] = ["darshana", "sadhaka", "grihastha", "jyotisha"];

export function tierRank(t: Tier): number {
  return TIER_ORDER.indexOf(t);
}

export function tierAtLeast(current: Tier, required: Tier): boolean {
  return tierRank(current) >= tierRank(required);
}

/** Lowest tier that has the given feature enabled (or grants unlimited on a resource). */
export function requiredTierFor(feature: FeatureKey): Tier {
  for (const t of TIER_ORDER) {
    const cfg = TIERS[t];
    if (feature === "extra_chart") {
      if (cfg.limits.charts === -1 || cfg.limits.charts > 1) return t;
      continue;
    }
    if (feature in cfg.limits) {
      const lim = (cfg.limits as any)[feature] as number;
      if (lim === -1 || lim > (TIERS.darshana.limits as any)[feature]) return t;
    } else if ((cfg.features as any)[feature]) {
      return t;
    }
  }
  return "jyotisha";
}

/** Legacy alias mapper — backward-compat for old 'free'|'premium'|'elite' DB values. */
export function normalizeTier(value: string | null | undefined): Tier {
  switch (value) {
    case "free":     return "darshana";
    case "premium":  return "sadhaka";
    case "elite":    return "jyotisha";
    case "darshana":
    case "sadhaka":
    case "grihastha":
    case "jyotisha":
      return value;
    default:
      return "darshana";
  }
}

export const FEATURE_COPY: Record<FeatureKey, { name: string; description: string }> = {
  destiny_timeline:   { name: "Destiny Timeline",        description: "Your 12-month Dasha-driven roadmap." },
  muhurta_calculator: { name: "Muhurta Calculator",      description: "Find auspicious timing for any decision." },
  compatibility:      { name: "Kundali Milan",           description: "Vedic 36-point compatibility analysis." },
  varshaphal:         { name: "Varshaphal",              description: "Your annual chart and yearly forecast." },
  transit_overlays:   { name: "Transit Overlays",        description: "See current planetary transits over your natal chart." },
  sade_sati:          { name: "Sade Sati Tracker",       description: "Saturn's seven-and-a-half-year transit insight." },
  south_indian_chart: { name: "South Indian Chart View", description: "Alternate chart-style visualization." },
  divisional_d9:      { name: "Navamsha (D9)",           description: "Marriage and dharma deep-dive chart." },
  divisional_all:     { name: "All Divisional Charts",   description: "D1 through D60 — career, wealth, children, and more." },
  hindi_guru:         { name: "Guru in Hindi",           description: "Your Rishi Guru responds in Devanagari Hindi." },
  voice_guru:         { name: "Voice Guru",              description: "Speak with your Rishi Guru via voice." },
  white_label_pdf:    { name: "White-label PDF",         description: "Branded reports with your logo, for clients." },
  client_dashboard:   { name: "Client Dashboard",        description: "Manage charts for multiple clients in one place." },
  batch_charts:       { name: "Batch Chart Generation",  description: "Generate charts in bulk from a CSV." },
  ephemeris:          { name: "Ephemeris Lookup",        description: "Full Panchangam and planetary positions for any moment." },
  ai_chat:            { name: "Guru Questions",          description: "Ask the Oracle anything." },
  ai_reading:         { name: "Full Vedic Reading",      description: "Complete narrative reading of your chart." },
  dream:              { name: "Dream Interpretations",   description: "Vedic Swapna Shastra dream analysis." },
  pdf_download:       { name: "Sacred Kundali PDF",      description: "10-page parchment scripture with mantras and remedies." },
  extra_chart:        { name: "Additional Chart",        description: "Add another person or chart." },
};
