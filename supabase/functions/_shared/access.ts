// Shared access-control helper for edge functions.
//
// One place that answers "what is this caller allowed to do", so gates cannot
// drift between functions. Resolves two things together:
//
//   1. Super admin — the `admin` role in public.user_roles. Bypasses every tier
//      gate and quota. The role lives in the database, never a hardcoded email
//      or a client-supplied flag, so the caller cannot spoof it.
//   2. Subscription tier — normalized from profiles.subscription_tier, which
//      may hold either the Sanskrit names or the legacy free/premium/elite.
//
// Typical use:
//
//   const access = await resolveAccess(supabase, userId);
//   if (!access.can("compatibility")) return access.denyFeature("compatibility");
//   if (!access.withinQuota("dream", used)) return access.denyQuota("dream", used);

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  hasFeature,
  limitFor,
  normalizeTier,
  quotaExceeded,
  requiredTierFor,
  tierAtLeast,
  type FeatureKey,
  type ResourceKey,
  type Tier,
} from "./tiers.ts";

type AnyClient = ReturnType<typeof createClient>;

const jsonHeaders = { "Content-Type": "application/json" };

export interface Access {
  /** Effective tier. Super admins resolve to the top tier. */
  tier: Tier;
  /** Tier actually stored on the profile, before any admin bypass. */
  storedTier: Tier;
  isAdmin: boolean;
  /** Feature gate. Always true for a super admin. */
  can(feature: FeatureKey): boolean;
  /** Minimum-tier gate, for checks not expressed as a feature flag. */
  atLeast(required: Tier): boolean;
  /** Quota gate — true while the caller still has allowance left. */
  withinQuota(resource: ResourceKey | "charts", used: number): boolean;
  /** Allowance for a resource. -1 unlimited, 0 blocked. */
  limit(resource: ResourceKey | "charts"): number;
  /** 403 response naming the tier the caller needs for a feature. */
  denyFeature(feature: FeatureKey, message?: string): Response;
  /** 403 response for an exhausted monthly allowance. */
  denyQuota(resource: ResourceKey | "charts", used: number, message?: string): Response;
}

/**
 * Resolve the caller's access. Reads the admin role and the profile tier in
 * parallel. Any lookup failure degrades to the free tier with no admin bypass —
 * an error must never escalate access.
 */
export async function resolveAccess(
  client: AnyClient,
  userId: string | null | undefined,
  corsHeaders: Record<string, string> = {},
): Promise<Access> {
  let isAdmin = false;
  let storedTier: Tier = "darshana";

  if (userId) {
    const [roleRes, profileRes] = await Promise.allSettled([
      client.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
      client.from("profiles").select("subscription_tier").eq("user_id", userId).maybeSingle(),
    ]);

    if (roleRes.status === "fulfilled" && !roleRes.value.error) {
      isAdmin = !!roleRes.value.data;
    } else {
      console.error("[access] role lookup failed, denying admin bypass", roleRes);
    }

    if (profileRes.status === "fulfilled" && !profileRes.value.error) {
      storedTier = normalizeTier((profileRes.value.data as { subscription_tier?: string } | null)?.subscription_tier);
    } else {
      console.error("[access] tier lookup failed, falling back to free tier", profileRes);
    }
  }

  const tier: Tier = isAdmin ? "jyotisha" : storedTier;
  const headers = { ...corsHeaders, ...jsonHeaders };

  return {
    tier,
    storedTier,
    isAdmin,
    can: (feature) => isAdmin || hasFeature(tier, feature),
    atLeast: (required) => isAdmin || tierAtLeast(tier, required),
    withinQuota: (resource, used) => isAdmin || !quotaExceeded(tier, resource, used),
    limit: (resource) => (isAdmin ? -1 : limitFor(tier, resource)),
    denyFeature: (feature, message) =>
      new Response(
        JSON.stringify({
          error: "upgrade_required",
          message: message ?? "This feature requires a higher subscription tier.",
          feature,
          current_tier: tier,
          required_tier: requiredTierFor(feature),
          upgrade_required: true,
        }),
        { status: 403, headers },
      ),
    denyQuota: (resource, used, message) =>
      new Response(
        JSON.stringify({
          error: "quota_reached",
          message: message ?? "You've reached your allowance for this month.",
          feature: resource,
          current_tier: tier,
          used,
          limit: limitFor(tier, resource),
          upgrade_required: tier !== "jyotisha",
        }),
        { status: 403, headers },
      ),
  };
}

/**
 * True when the user holds the `admin` role. Prefer resolveAccess() — this
 * remains for callers that only need the role and not the tier.
 */
export async function isSuperAdmin(
  client: AnyClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) {
      console.error("[access] role lookup failed, denying admin bypass", error);
      return false;
    }
    return !!data;
  } catch (e) {
    console.error("[access] role lookup threw, denying admin bypass", e);
    return false;
  }
}
