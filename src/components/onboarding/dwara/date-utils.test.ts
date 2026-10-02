import { describe, expect, it } from "vitest";
import { clampYMD, daysInMonth, maxDay, maxMonth, monthNames, parseISO, timeToAngle, toISO } from "./date-utils";

const today = new Date(2026, 9, 2); // 2 Oct 2026

describe("date wheels", () => {
  it("knows month lengths, including leap years", () => {
    expect(daysInMonth(2025, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(1997, 12)).toBe(31);
  });

  it("pulls 31 into a short month", () => {
    expect(clampYMD({ y: 1997, m: 2, d: 31 }, today)).toEqual({ y: 1997, m: 2, d: 28 });
    expect(clampYMD({ y: 1996, m: 2, d: 31 }, today)).toEqual({ y: 1996, m: 2, d: 29 });
  });

  it("will not allow a birth in the future", () => {
    expect(maxMonth(2026, today)).toBe(10);
    expect(maxMonth(2025, today)).toBe(12);
    expect(maxDay(2026, 10, today)).toBe(2);
    expect(clampYMD({ y: 2026, m: 12, d: 25 }, today)).toEqual({ y: 2026, m: 10, d: 2 });
  });

  it("round-trips ISO strings", () => {
    expect(toISO({ y: 1997, m: 12, d: 2 })).toBe("1997-12-02");
    expect(parseISO("1997-12-22")).toEqual({ y: 1997, m: 12, d: 22 });
    expect(parseISO("nonsense")).toBeNull();
  });

  it("gives twelve month names", () => {
    expect(monthNames("en")).toHaveLength(12);
    expect(monthNames("en")[11]).toBe("December");
    expect(monthNames("ne")[0]).toBe("जनवरी");
  });

  it("places midnight at the bottom and noon at the top of the wheel", () => {
    expect(timeToAngle("00:00")).toBeCloseTo(Math.PI / 2);
    expect(timeToAngle("12:00")).toBeCloseTo(Math.PI / 2 + Math.PI);
    expect(timeToAngle("")).toBeNull();
  });
});
