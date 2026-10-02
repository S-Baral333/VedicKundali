import { describe, expect, it } from "vitest";
import { buildProfileUpdate, birthAccuracy, EMPTY_RESULT, type OnboardingResult } from "./onboarding-profile";
import { shortPlaceLabel } from "./geocode";

const base: OnboardingResult = {
  ...EMPTY_RESULT,
  name: "Ayush",
  dateOfBirth: "1997-12-22",
  birthTime: "23:21",
  place: { label: "Kathmandu, Bagmati Province, Nepal", fullName: "x", lat: 27.7, lng: 85.3 },
  lifePriorities: ["career", "money"],
  guidanceStyle: "gentle",
};

describe("buildProfileUpdate", () => {
  it("stores an exact time and the confirmed coordinates", () => {
    const u = buildProfileUpdate(base);
    expect(u).toMatchObject({
      full_name: "Ayush",
      onboarding_completed: true,
      date_of_birth: "1997-12-22",
      birth_time: "23:21",
      birth_time_accuracy: "exact",
      birth_time_period: null,
      birthplace: "Kathmandu, Bagmati Province, Nepal",
      latitude: 27.7,
      longitude: 85.3,
    });
    expect(u.onboarding_preferences).toEqual({
      life_priorities: ["career", "money"],
      current_state: "calm",
      guidance_style: "gentle",
      dream_opt_in: true,
    });
  });

  it("stores a named period as its midpoint and records the precision", () => {
    const u = buildProfileUpdate({ ...base, skipBirthTime: true, birthTime: "", birthPeriod: "morning" });
    expect(u.birth_time).toBe("09:00");
    expect(u.birth_time_accuracy).toBe("period");
    expect(u.birth_time_period).toBe("morning");
  });

  it("writes no birth fields when the moment was skipped, but still completes onboarding", () => {
    const u = buildProfileUpdate({ ...EMPTY_RESULT, name: "Ayush", lifePriorities: ["health"] });
    expect(u.onboarding_completed).toBe(true);
    expect(u).not.toHaveProperty("date_of_birth");
    expect(u).not.toHaveProperty("birth_time");
    expect(u).not.toHaveProperty("birthplace");
    expect(u).not.toHaveProperty("latitude");
    expect(u.birth_time_accuracy).toBe("unknown");
  });

  it("does not claim a period when the exact time was given", () => {
    expect(birthAccuracy({ skipBirthTime: false, birthTime: "10:00", birthPeriod: "night" })).toBe("exact");
  });
});

describe("shortPlaceLabel", () => {
  it("keeps place, nearest non-postal region, and country", () => {
    expect(shortPlaceLabel("Kathmandu, Kathmandu Metropolitan City, Bagmati Province, 44600, Nepal")).toBe(
      "Kathmandu, Bagmati Province, Nepal"
    );
    expect(shortPlaceLabel("Mumbai, Maharashtra, 400001, India")).toBe("Mumbai, Maharashtra, India");
  });

  it("leaves short names alone", () => {
    expect(shortPlaceLabel("Paris, France")).toBe("Paris, France");
    expect(shortPlaceLabel("Nepal")).toBe("Nepal");
  });

  it("falls back to place and country when every middle part is a postal code", () => {
    expect(shortPlaceLabel("Somewhere, 12345, Nowhere")).toBe("Somewhere, Nowhere");
  });
});
