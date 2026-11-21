// The first birth chart, cast from what onboarding already collected.
//
// Onboarding saves name, birth date, time (or a named part of the day) and a
// confirmed place with coordinates to `profiles`. Nothing used to turn that
// into a chart: the only way in was the Birth Chart page's empty "Add person"
// form, so every new user typed their birth details twice.
//
// ensureChartFromProfile() closes that gap. It is called by the app-wide
// ActiveChartProvider whenever a signed-in user has no charts, so it covers new
// users straight after onboarding and existing users who onboarded before this
// existed. generate-chart still does the casting and enforces the saved-chart
// allowance; this only supplies the request.

import { supabase } from "@/integrations/supabase/client";

/** The profile columns a chart can be cast from. */
export interface ChartProfile {
  full_name: string | null;
  date_of_birth: string | null;
  birth_time: string | null;
  birthplace: string | null;
  latitude: number | null;
  longitude: number | null;
  birth_time_accuracy: string | null;
  birth_time_period: string | null;
}

export const CHART_PROFILE_COLUMNS =
  "full_name, date_of_birth, birth_time, birthplace, latitude, longitude, birth_time_accuracy, birth_time_period";

/**
 * The generate-chart body for a profile, or null when the profile is missing
 * something generate-chart requires (it rejects a request without a date,
 * time, place or coordinates).
 */
export function chartRequestFromProfile(
  p: ChartProfile | null | undefined,
  fallbackName = "",
): Record<string, unknown> | null {
  if (!p) return null;
  const name = (p.full_name ?? "").trim() || fallbackName.trim();
  if (!name || !p.date_of_birth || !p.birth_time || !p.birthplace?.trim()) return null;
  if (p.latitude == null || p.longitude == null) return null;
  const body: Record<string, unknown> = {
    full_name: name,
    date_of_birth: p.date_of_birth,
    // Postgres `time` reads back as HH:MM:SS; the chart form sends HH:MM.
    birth_time: p.birth_time.slice(0, 5),
    birthplace: p.birthplace.trim(),
    latitude: p.latitude,
    longitude: p.longitude,
  };
  if (p.birth_time_accuracy) body.birth_time_accuracy = p.birth_time_accuracy;
  if (p.birth_time_period) body.birth_time_period = p.birth_time_period;
  return body;
}

export type EnsureChartOutcome =
  | "created"
  | "has_chart"
  | "incomplete_profile"
  | "failed";

// One attempt at a time per user, shared by every caller in this tab.
const inFlight = new Map<string, Promise<EnsureChartOutcome>>();
// A refusal (allowance, bad data, server error) is not retried on every page
// load for the rest of this tab's life. A reload starts fresh.
const failedFor = new Set<string>();

/**
 * Cast the user's first chart from their profile if they have none yet.
 * Never throws: a failure is logged and reported as "failed", and the person
 * can still add their chart by hand on the Birth Chart page.
 */
export function ensureChartFromProfile(userId: string, fallbackName = ""): Promise<EnsureChartOutcome> {
  if (failedFor.has(userId)) return Promise.resolve("failed");
  const running = inFlight.get(userId);
  if (running) return running;

  const attempt = (async (): Promise<EnsureChartOutcome> => {
    try {
      const { count, error: countError } = await supabase
        .from("birth_charts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      // An unknown count must not read as "no charts" — that could cast a duplicate.
      if (countError) throw countError;
      if ((count ?? 0) > 0) return "has_chart";

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(CHART_PROFILE_COLUMNS)
        .eq("user_id", userId)
        .maybeSingle();
      if (profileError) throw profileError;

      const body = chartRequestFromProfile(profile as ChartProfile | null, fallbackName);
      if (!body) return "incomplete_profile";

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return "failed";

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error("[chartFromProfile] generate-chart refused", res.status, await res.text().catch(() => ""));
        failedFor.add(userId);
        return "failed";
      }
      return "created";
    } catch (e) {
      console.error("[chartFromProfile] could not cast the first chart", e);
      failedFor.add(userId);
      return "failed";
    } finally {
      inFlight.delete(userId);
    }
  })();

  inFlight.set(userId, attempt);
  return attempt;
}

/** Test hook: forget earlier failures. */
export function resetChartFromProfileState() {
  inFlight.clear();
  failedFor.clear();
}
