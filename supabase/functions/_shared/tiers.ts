// Server-side mirror of src/lib/tiers.ts.
//
// Keep the limits and feature flags below in sync with the client config —
// that file is the product source of truth, this one is the authoritative
// enforcement point. The client only decides what UI to show; every gate here
// is what actually protects the feature.
//
// Both naming schemes are accepted on input. The app originally shipped tiers
// as free/premium/elite and later renamed them to the Sanskrit names, but the
// profiles.subscription_tier column can still hold either, so normalizeTier()
// maps legacy values before any comparison. Never compare a raw column value
// against a tier name directly.

export type Tier = "darshana" | "sadhaka" | "grihastha" | "jyotisha";

export type ResourceKey = "ai_chat" | "ai_reading" | "dream" | "pdf_download";

export type FeatureKey =
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
  // Prescription-grade remedies. Not a client FeatureKey — the client gates it
  // on isPremium (sadhaka+), which this mirrors.
  | "prescription_remedies";

interface TierConfig {
  /** -1 = unlimited, 0 = blocked */
  limits: Record<ResourceKey | "charts", number>;
  features: Record<FeatureKey, boolean>;
}

export const TIERS: Record<Tier, TierConfig> = {
  darshana: {
    limits: { charts: 1, ai_chat: 3, ai_reading: 1, dream: 3, pdf_download: 0 },
    features: {
      destiny_timeline: false, muhurta_calculator: false, compatibility: false,
      varshaphal: false, transit_overlays: false, sade_sati: false,
      south_indian_chart: false, divisional_d9: false, divisional_all: false,
      hindi_guru: false, voice_guru: false, white_label_pdf: false,
      client_dashboard: false, batch_charts: false, ephemeris: false,
      prescription_remedies: false,
    },
  },
  sadhaka: {
    limits: { charts: 3, ai_chat: 30, ai_reading: -1, dream: 20, pdf_download: -1 },
    features: {
      destiny_timeline: true, muhurta_calculator: true, compatibility: false,
      varshaphal: true, transit_overlays: false, sade_sati: false,
      south_indian_chart: true, divisional_d9: true, divisional_all: false,
      hindi_guru: false, voice_guru: false, white_label_pdf: false,
      client_dashboard: false, batch_charts: false, ephemeris: false,
      prescription_remedies: true,
    },
  },
  grihastha: {
    limits: { charts: 7, ai_chat: 50, ai_reading: -1, dream: 50, pdf_download: -1 },
    features: {
      destiny_timeline: true, muhurta_calculator: true, compatibility: true,
      varshaphal: true, transit_overlays: true, sade_sati: true,
      south_indian_chart: true, divisional_d9: true, divisional_all: true,
      hindi_guru: true, voice_guru: false, white_label_pdf: false,
      client_dashboard: false, batch_charts: false, ephemeris: false,
      prescription_remedies: true,
    },
  },
  jyotisha: {
    limits: { charts: -1, ai_chat: -1, ai_reading: -1, dream: -1, pdf_download: -1 },
    features: {
      destiny_timeline: true, muhurta_calculator: true, compatibility: true,
      varshaphal: true, transit_overlays: true, sade_sati: true,
      south_indian_chart: true, divisional_d9: true, divisional_all: true,
      hindi_guru: true, voice_guru: true, white_label_pdf: true,
      client_dashboard: true, batch_charts: true, ephemeris: true,
      prescription_remedies: true,
    },
  },
};

export const TIER_ORDER: Tier[] = ["darshana", "sadhaka", "grihastha", "jyotisha"];

/**
 * Map any stored tier value to a canonical Tier.
 *
 * Accepts the Sanskrit names and the legacy free/premium/elite aliases. Note
 * there was never a legacy alias for grihastha. Anything unrecognised — null,
 * empty, a typo — falls back to the free tier, so an unexpected value restricts
 * access rather than granting it.
 */
export function normalizeTier(value: string | null | undefined): Tier {
  switch ((value ?? "").trim().toLowerCase()) {
    case "free": return "darshana";
    case "premium": return "sadhaka";
    case "elite": return "jyotisha";
    case "darshana": return "darshana";
    case "sadhaka": return "sadhaka";
    case "grihastha": return "grihastha";
    case "jyotisha": return "jyotisha";
    default: return "darshana";
  }
}

export function tierRank(t: Tier): number {
  return TIER_ORDER.indexOf(t);
}

export function tierAtLeast(current: Tier, required: Tier): boolean {
  return tierRank(current) >= tierRank(required);
}

export function hasFeature(tier: Tier, feature: FeatureKey): boolean {
  return TIERS[tier].features[feature] === true;
}

/** Monthly allowance for a resource. -1 means unlimited, 0 means blocked. */
export function limitFor(tier: Tier, resource: ResourceKey | "charts"): number {
  return TIERS[tier].limits[resource];
}

/** True when `used` has reached the tier's allowance for `resource`. */
export function quotaExceeded(
  tier: Tier,
  resource: ResourceKey | "charts",
  used: number,
): boolean {
  const limit = limitFor(tier, resource);
  if (limit === -1) return false;
  return used >= limit;
}

/**
 * Anthropic model routing by tier. Mirrors the intent of getModelForTier() in
 * src/hooks/useSubscription.tsx, where grihastha and above get the pro model.
 */
export function modelForTier(tier: Tier): string {
  return tierAtLeast(tier, "grihastha")
    ? "claude-sonnet-5"
    : "claude-haiku-4-5-20251001";
}

/** Lowest tier that enables a feature — used to tell the client what to upsell. */
export function requiredTierFor(feature: FeatureKey): Tier {
  for (const t of TIER_ORDER) {
    if (TIERS[t].features[feature]) return t;
  }
  return "jyotisha";
}
