import { resolveBirthTime, type BirthTimeAccuracy } from "@/lib/birth-time";
import type { ResolvedPlace } from "@/lib/geocode";

/** Everything the onboarding flow collects. Empty strings mean "not given". */
export interface OnboardingResult {
  name: string;
  /** ISO yyyy-mm-dd. */
  dateOfBirth: string;
  /** HH:MM, only meaningful when `skipBirthTime` is false. */
  birthTime: string;
  /** "I don't know the exact time". */
  skipBirthTime: boolean;
  /** Which part of the day, when the exact time is unknown. */
  birthPeriod: string;
  place: ResolvedPlace | null;
  lifePriorities: string[];
  guidanceStyle: string;
}

export const EMPTY_RESULT: OnboardingResult = {
  name: "",
  dateOfBirth: "",
  birthTime: "",
  skipBirthTime: false,
  birthPeriod: "",
  place: null,
  lifePriorities: [],
  guidanceStyle: "balanced",
};

export function birthAccuracy(r: Pick<OnboardingResult, "skipBirthTime" | "birthPeriod" | "birthTime">): BirthTimeAccuracy {
  if (r.skipBirthTime) return r.birthPeriod ? "period" : "unknown";
  return r.birthTime ? "exact" : "unknown";
}

/**
 * The `profiles` row update for a finished onboarding.
 *
 * A named period is stored as that period's midpoint, so everything downstream
 * still has a real clock time to work from — what changes is that the chart
 * carries how precise that time actually was.
 */
export function buildProfileUpdate(r: OnboardingResult): Record<string, unknown> {
  const accuracy = birthAccuracy(r);
  const resolvedTime = resolveBirthTime(accuracy, r.birthTime, r.birthPeriod);

  const update: Record<string, unknown> = {
    full_name: r.name || null,
    onboarding_completed: true,
    onboarding_preferences: {
      life_priorities: r.lifePriorities,
      current_state: "calm",
      guidance_style: r.guidanceStyle,
      dream_opt_in: true,
    },
    birth_time_accuracy: accuracy,
    birth_time_period: accuracy === "period" ? r.birthPeriod : null,
  };

  if (r.dateOfBirth) update.date_of_birth = r.dateOfBirth;
  if (resolvedTime) update.birth_time = resolvedTime;
  if (r.place) {
    update.birthplace = r.place.label;
    update.latitude = r.place.lat;
    update.longitude = r.place.lng;
  }
  return update;
}
