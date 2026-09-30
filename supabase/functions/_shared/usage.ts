// Shared metering helper for edge functions.
//
// One place that answers "how much of this resource has the caller used this
// month" and "record that they used one more", so the quota gates cannot drift
// between functions — which is exactly what happened before: two functions read
// and wrote a `profiles.feature_usage` column that no migration ever created, so
// every read errored, every usage silently came back as 0, and the free tier was
// effectively unlimited.
//
// Two rules this module exists to enforce:
//
//   1. A failed read NEVER reads as zero. Zero means "no allowance consumed",
//      which grants access; an error must never grant access. readUsageCount
//      throws, and the caller answers with usageUnavailable().
//   2. A failed write is never discarded. recordUsageEvent logs loudly and
//      reports whether it landed, so an unmetered call is visible in the
//      function logs instead of invisible.
//
// Typical use:
//
//   let used: number;
//   try {
//     used = await readUsageCount(supabase, userId, "dream");
//   } catch (e) {
//     return usageUnavailable(corsHeaders, "dream", e);
//   }
//   if (!access.withinQuota("dream", used)) return access.denyQuota("dream", used);
//   ... do the work ...
//   await recordUsageEvent(serviceClient, userId, "dream");

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { ResourceKey } from "./tiers.ts";

type AnyClient = ReturnType<typeof createClient>;

/**
 * First day of the current month in UTC, as `YYYY-MM-DD`.
 *
 * This is the period key for usage_counters. It must match
 * `date_trunc('month', now())::date` — the default that increment_usage and
 * increment_usage_for write — so a read and the write it is metering land on the
 * same row. Deriving it from local time instead would put a caller east of UTC
 * on the previous month's row for the first hours of every month.
 */
export function usagePeriodStart(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

/**
 * How many of `resource` the user has consumed in the current period.
 *
 * Absent row means zero — that is a real answer, the user simply has not used
 * the resource this month. A failed lookup is not an answer: it throws, because
 * returning zero would hand out the resource for free.
 */
export async function readUsageCount(
  client: AnyClient,
  userId: string,
  resource: ResourceKey,
): Promise<number> {
  const { data, error } = await client
    .from("usage_counters")
    .select("count")
    .eq("user_id", userId)
    .eq("resource", resource)
    .eq("period_start", usagePeriodStart())
    .maybeSingle();

  if (error) {
    throw new Error(
      `usage lookup failed for ${resource}: ${error.message ?? JSON.stringify(error)}`,
    );
  }

  const count = (data as { count?: number } | null)?.count;
  return typeof count === "number" && count > 0 ? count : 0;
}

/**
 * Record one use of `resource`, atomically.
 *
 * Goes through increment_usage_for, whose INSERT .. ON CONFLICT DO UPDATE makes
 * the increment a single statement — a read-then-write from here would let two
 * concurrent requests both read 2 and both write 3.
 *
 * Needs a service-role client: that function is granted to service_role only,
 * and the user-JWT variant (increment_usage, keyed on auth.uid()) cannot be used
 * from a background task that outlives the request.
 *
 * Never throws. By the time this runs the work has already been delivered to the
 * caller, so failing the request would be worse than an unmetered call — but the
 * failure is logged with a greppable marker rather than swallowed, and the
 * boolean lets a caller react if it can.
 */
export async function recordUsageEvent(
  serviceClient: AnyClient,
  userId: string,
  resource: ResourceKey,
): Promise<{ ok: boolean; count: number | null }> {
  try {
    const { data, error } = await serviceClient.rpc("increment_usage_for", {
      p_user_id: userId,
      p_resource: resource,
      p_period_start: usagePeriodStart(),
    });

    if (error) {
      console.error(
        `[usage] FAILED TO RECORD ${resource} for user ${userId} — this call was not metered:`,
        error,
      );
      return { ok: false, count: null };
    }

    return { ok: true, count: typeof data === "number" ? data : null };
  } catch (e) {
    console.error(
      `[usage] FAILED TO RECORD ${resource} for user ${userId} — this call was not metered:`,
      e,
    );
    return { ok: false, count: null };
  }
}

/**
 * 503 for a usage lookup that failed. Deliberately not a quota denial: the
 * caller may well have allowance left, we just cannot confirm it, and guessing
 * in either direction is wrong — guessing "allowed" is the bug this replaces.
 */
export function usageUnavailable(
  corsHeaders: Record<string, string>,
  resource: ResourceKey,
  cause?: unknown,
): Response {
  console.error(`[usage] refusing ${resource}: allowance could not be verified`, cause);
  return new Response(
    JSON.stringify({
      error: "usage_unavailable",
      message: "We couldn't check your remaining allowance just now. Please try again in a moment.",
      feature: resource,
    }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
