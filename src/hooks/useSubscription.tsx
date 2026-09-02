import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  TIERS,
  TIER_ORDER,
  type Tier,
  type FeatureKey,
  type ResourceKey,
  normalizeTier,
  tierAtLeast,
  requiredTierFor,
} from "@/lib/tiers";

interface SubscriptionRow {
  tier: Tier;
  status: "active" | "trialing" | "past_due" | "cancelled" | "paused" | "expired";
  billing_interval: "monthly" | "annual" | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  provider_customer_id: string | null;
}

interface UsageMap {
  ai_chat: number;
  ai_reading: number;
  dream: number;
  pdf_download: number;
}

interface GateResult {
  allowed: boolean;
  reason: "ok" | "tier_required" | "quota_reached" | "loading";
  requiredTier: Tier;
  current: number;
  limit: number;
}

interface SubscriptionContextType {
  // canonical
  tier: Tier;
  status: SubscriptionRow["status"];
  trialEndsAt: string | null;
  periodEndsAt: string | null;
  isLoading: boolean;
  usage: UsageMap;
  config: typeof TIERS[Tier];

  // legacy aliases — DO NOT remove, many components still use them
  isPremium: boolean;
  isElite: boolean;
  limits: { dreams: number; oracle: number };
  canUseDreams: boolean;
  canUseOracle: boolean;

  // new API
  gate: (feature: FeatureKey) => GateResult;
  hasFeature: (feature: FeatureKey) => boolean;
  incrementUsage: (resource: ResourceKey | "dreams" | "oracle") => Promise<boolean>;
  refreshUsage: () => Promise<void>;
  openUpgrade: (opts?: { feature?: FeatureKey; requiredTier?: Tier }) => void;
}

const DEFAULT_USAGE: UsageMap = { ai_chat: 0, ai_reading: 0, dream: 0, pdf_download: 0 };

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

// global event so any component can trigger the modal
export const UPGRADE_EVENT = "lov:open-upgrade";
export type UpgradeEventDetail = { feature?: FeatureKey; requiredTier?: Tier };

function periodStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

// Map legacy resource names used by old call sites to canonical keys
function normalizeResource(r: ResourceKey | "dreams" | "oracle"): ResourceKey {
  if (r === "dreams") return "dream";
  if (r === "oracle") return "ai_chat";
  return r;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier>("darshana");
  const [status, setStatus] = useState<SubscriptionRow["status"]>("active");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [periodEndsAt, setPeriodEndsAt] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageMap>(DEFAULT_USAGE);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setTier("darshana");
      setStatus("active");
      setUsage(DEFAULT_USAGE);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Tier — prefer subscriptions row, fall back to profile column.
      let [{ data: sub }, { data: profile }] = await Promise.all([
        supabase
          .from("subscriptions" as any)
          .select("tier,status,billing_interval,trial_ends_at,current_period_end,cancel_at,provider_customer_id")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      // Self-heal: if either baseline row is missing, call ensure_user_profile RPC and refetch once.
      if (!profile || !sub) {
        console.warn("[subscription] orphaned account detected, self-healing", {
          hasProfile: !!profile,
          hasSubscription: !!sub,
        });
        const { error: healErr } = await supabase.rpc("ensure_user_profile" as any);
        if (healErr) {
          console.error("[subscription] ensure_user_profile failed", healErr);
        } else {
          const refetch = await Promise.all([
            supabase
              .from("subscriptions" as any)
              .select("tier,status,billing_interval,trial_ends_at,current_period_end,cancel_at,provider_customer_id")
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("profiles")
              .select("subscription_tier")
              .eq("user_id", user.id)
              .maybeSingle(),
          ]);
          sub = refetch[0].data;
          profile = refetch[1].data;
        }
      }

      const subRow = sub as SubscriptionRow | null;
      const resolvedTier: Tier = normalizeTier(
        subRow?.tier ?? profile?.subscription_tier
      );
      setTier(resolvedTier);
      setStatus((subRow?.status ?? "active") as SubscriptionRow["status"]);
      setTrialEndsAt(subRow?.trial_ends_at ?? null);
      setPeriodEndsAt(subRow?.current_period_end ?? null);

      // 2. Usage — read counters for current month
      const { data: counters } = await supabase
        .from("usage_counters" as any)
        .select("resource,count")
        .eq("user_id", user.id)
        .eq("period_start", periodStartIso());

      const next: UsageMap = { ...DEFAULT_USAGE };
      ((counters ?? []) as unknown as Array<{ resource: string; count: number }>).forEach((row) => {
        if (row.resource in next) (next as any)[row.resource] = row.count;
      });
      setUsage(next);
    } catch (e) {
      console.error("[subscription] fetch error", e);
      toast({
        title: "Could not load your account",
        description: "Check your connection and refresh. Your features may show as limited until resolved.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const config = TIERS[tier];

  const isPremium = useMemo(() => tierAtLeast(tier, "sadhaka"), [tier]);
  const isElite = useMemo(() => tierAtLeast(tier, "jyotisha"), [tier]);

  const gate = useCallback((feature: FeatureKey): GateResult => {
    if (isLoading) {
      return { allowed: false, reason: "loading", requiredTier: "sadhaka", current: 0, limit: 0 };
    }
    const required = requiredTierFor(feature);

    // resource-quota gates
    if (feature in DEFAULT_USAGE || feature === "pdf_download") {
      const limit = config.limits[feature as keyof typeof config.limits] as number;
      const current = usage[feature as keyof UsageMap] ?? 0;
      if (limit === -1) return { allowed: true, reason: "ok", requiredTier: required, current, limit: -1 };
      if (limit === 0) return { allowed: false, reason: "tier_required", requiredTier: required, current, limit };
      if (current >= limit) return { allowed: false, reason: "quota_reached", requiredTier: required, current, limit };
      return { allowed: true, reason: "ok", requiredTier: required, current, limit };
    }

    // feature gate
    const allowed = tierAtLeast(tier, required);
    return { allowed, reason: allowed ? "ok" : "tier_required", requiredTier: required, current: 0, limit: 0 };
  }, [config, isLoading, tier, usage]);

  const hasFeature = useCallback((feature: FeatureKey) => gate(feature).allowed, [gate]);

  const incrementUsage = useCallback(async (resourceIn: ResourceKey | "dreams" | "oracle") => {
    if (!user) return false;
    const resource = normalizeResource(resourceIn);
    const limit = config.limits[resource as keyof typeof config.limits] as number;
    const current = (usage[resource as keyof UsageMap] ?? 0) as number;
    if (limit !== -1 && current >= limit) return false;

    // optimistic
    setUsage((u) => ({ ...u, [resource]: (u[resource as keyof UsageMap] ?? 0) + 1 }));
    try {
      const { data, error } = await supabase.rpc("increment_usage" as any, { p_resource: resource });
      if (error) throw error;
      if (typeof data === "number") setUsage((u) => ({ ...u, [resource]: data }));
      return true;
    } catch (e) {
      console.error("[subscription] incrementUsage", e);
      setUsage((u) => ({ ...u, [resource]: Math.max(0, (u[resource as keyof UsageMap] ?? 0) - 1) }));
      return false;
    }
  }, [user, config, usage]);

  const openUpgrade = useCallback((opts?: { feature?: FeatureKey; requiredTier?: Tier }) => {
    window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, { detail: opts ?? {} }));
  }, []);

  // legacy alias values
  const limits = { dreams: config.limits.dream, oracle: config.limits.ai_chat };
  const canUseDreams = limits.dreams === -1 || usage.dream < limits.dreams;
  const canUseOracle = limits.oracle === -1 || usage.ai_chat < limits.oracle;

  return (
    <SubscriptionContext.Provider value={{
      tier, status, trialEndsAt, periodEndsAt, isLoading, usage, config,
      isPremium, isElite, limits, canUseDreams, canUseOracle,
      gate, hasFeature, incrementUsage, refreshUsage: fetchAll, openUpgrade,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}

/** Tier-aware AI model routing. */
export function getModelForTier(tier: Tier | string): string {
  const t = normalizeTier(tier as any);
  if (t === "jyotisha") return "google/gemini-2.5-pro";
  if (t === "grihastha") return "google/gemini-2.5-pro";
  return "google/gemini-3-flash-preview";
}

export { TIER_ORDER };
export type { Tier };
