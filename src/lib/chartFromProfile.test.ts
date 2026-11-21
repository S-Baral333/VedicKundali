import { describe, expect, it } from "vitest";
import { chartRequestFromProfile, type ChartProfile } from "./chartFromProfile";

const complete: ChartProfile = {
  full_name: "Test Seeker",
  date_of_birth: "1994-07-14",
  birth_time: "06:30:00",
  birthplace: "Pokhara, Gandaki, Nepal",
  latitude: 28.378,
  longitude: 84.0,
  birth_time_accuracy: "exact",
  birth_time_period: null,
};

describe("chartRequestFromProfile", () => {
  it("builds the generate-chart body from a complete profile", () => {
    expect(chartRequestFromProfile(complete)).toEqual({
      full_name: "Test Seeker",
      date_of_birth: "1994-07-14",
      birth_time: "06:30",
      birthplace: "Pokhara, Gandaki, Nepal",
      latitude: 28.378,
      longitude: 84.0,
      birth_time_accuracy: "exact",
    });
  });

  it("carries a named part of the day", () => {
    const body = chartRequestFromProfile({ ...complete, birth_time: "00:30:00", birth_time_accuracy: "period", birth_time_period: "night" });
    expect(body).toMatchObject({ birth_time: "00:30", birth_time_accuracy: "period", birth_time_period: "night" });
  });

  it("falls back to the account name when the profile has none", () => {
    expect(chartRequestFromProfile({ ...complete, full_name: "  " }, "Aayush")).toMatchObject({ full_name: "Aayush" });
  });

  it.each([
    ["no profile", null],
    ["no date", { ...complete, date_of_birth: null }],
    ["no time", { ...complete, birth_time: null }],
    ["no place", { ...complete, birthplace: " " }],
    ["no coordinates", { ...complete, latitude: null }],
    ["no name anywhere", { ...complete, full_name: null }],
  ])("returns null with %s, since generate-chart would reject it", (_label, p) => {
    expect(chartRequestFromProfile(p as ChartProfile | null)).toBeNull();
  });
});
