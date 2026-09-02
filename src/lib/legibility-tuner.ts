import type { LumenLevel, TextLegibilitySettings } from "./appearance-defaults";

const LEVEL_ORDER: LumenLevel[] = ["off", "soft", "bright", "radiant"];

function clampLevel(level: LumenLevel, ceiling: LumenLevel): LumenLevel {
  const li = LEVEL_ORDER.indexOf(level);
  const ci = LEVEL_ORDER.indexOf(ceiling);
  return LEVEL_ORDER[Math.min(li, ci < 0 ? LEVEL_ORDER.length - 1 : ci)];
}

function liftLevel(base: LumenLevel, lift: number, ceiling: LumenLevel): LumenLevel {
  const i = LEVEL_ORDER.indexOf(base);
  const next = Math.max(0, Math.min(LEVEL_ORDER.length - 1, i + Math.round(lift)));
  return clampLevel(LEVEL_ORDER[next], ceiling);
}

export interface LuminanceSample {
  /** Average relative luminance (0..1). */
  avgY: number;
  /** Variance of luminance (0..~0.25 typical). */
  variance: number;
}

export interface TunedLegibility {
  legibility: LumenLevel;
  scrim: number;
}

/**
 * Map a smoothed luminance sample to a lifted legibility level + scrim.
 * Honors the user's baseline as a *floor*: never goes below what they chose.
 *
 * Hysteresis is applied at the call-site (the sensor) — this function is pure.
 */
export function tune(
  baseline: TextLegibilitySettings,
  sample: LuminanceSample,
): TunedLegibility {
  const strength = Math.max(0, Math.min(1, baseline.autoStrength ?? 1));
  const ceiling: LumenLevel = baseline.autoCeiling ?? "radiant";

  const y = sample.avgY;
  const busy = sample.variance > 0.012; // dense star fields / milky way

  let levelLift = 0;
  let scrimLift = 0;

  if (y < 0.08) {
    levelLift = 0;
    scrimLift = 0;
  } else if (y < 0.18) {
    levelLift = busy ? 1 : 0;
    scrimLift = busy ? 0.15 : 0.05;
  } else if (y < 0.35) {
    levelLift = 1;
    scrimLift = 0.25;
  } else {
    levelLift = 2;
    scrimLift = 0.4;
  }

  // Strength scales the lift (1.0 = full table, 0.0 = no lift = baseline).
  const effLevelLift = levelLift * strength;
  const effScrimLift = scrimLift * strength;

  const legibility = liftLevel(baseline.legibility, effLevelLift, ceiling);
  const scrim = Math.max(0, Math.min(1, baseline.scrim + effScrimLift));

  return { legibility, scrim };
}

export const LUMEN_LEVEL_ORDER = LEVEL_ORDER;
