/**
 * What the Dwara sky is *trying* to look like. The canvas eases its drawn
 * values toward these every frame, so the flow only ever states intent
 * ("the moment world, a place chosen") and never animates anything itself.
 */
export interface SkyTargets {
  /** Star drift, in depth-units per second. ~0.03 is ambient, ~4 is warp. */
  speed: number;
  /** Mandala radius multiplier. */
  scale: number;
  /** Core glow, 0 – 1.6. */
  glow: number;
  /** How many sacred rings have appeared, 0 – 1 (they light one by one). */
  rings: number;
  /** How many of the nine grahas are lit, 0 – 1. */
  grahas: number;
  /** The 12-sign wheel around the mandala, 0 – 1. */
  signs: number;
  /** Rotation of the sign wheel — set from the day of the year. */
  signsAngle: number;
  /** Time-of-day marker on the sign wheel (radians), or null for none. */
  sun: number | null;
  /** The abstract Earth, 0 – 1. */
  globe: number;
  /** The place on that Earth, once confirmed. */
  pin: { lat: number; lng: number } | null;
  /** The yantra of connecting lines, 0 – 1. */
  lines: number;
  /** Gold light flooding the screen, 0 – 1. */
  bloom: number;
  /** Ring rotation multiplier. */
  spin: number;
  /** Where the mandala sits, as a fraction of the visible height. */
  cyFrac: number;
  /** The visible height — shrinks when the on-screen keyboard is open. */
  visibleH: number;
}

export const SKY_DEFAULTS: SkyTargets = {
  speed: 0.03,
  scale: 0.62,
  glow: 0.4,
  rings: 0.45,
  grahas: 0,
  signs: 0,
  signsAngle: 0,
  sun: null,
  globe: 0,
  pin: null,
  lines: 0,
  bloom: 0,
  spin: 1,
  cyFrac: 0.3,
  visibleH: 0,
};

/** One mood per world — the universe gets brighter and denser as you go. */
export const MOODS = {
  language: { speed: 0.02, scale: 0.55, glow: 0.3, rings: 0.3, grahas: 0, cyFrac: 0.2 },
  welcome: { speed: 0.03, scale: 0.74, glow: 0.45, rings: 0.5, grahas: 0, cyFrac: 0.3 },
  self: { speed: 0.05, scale: 0.7, glow: 0.5, rings: 0.6, grahas: 0.34, cyFrac: 0.3 },
  moment: { speed: 0.08, scale: 0.78, glow: 0.65, rings: 0.85, grahas: 0.55, cyFrac: 0.3 },
  intent: { speed: 0.12, scale: 0.85, glow: 0.85, rings: 1, grahas: 0.8, cyFrac: 0.3 },
} satisfies Record<string, Partial<SkyTargets>>;

export class SkyController {
  targets: SkyTargets = { ...SKY_DEFAULTS };
  /** performance.now() of the last pulse, and how strong it was. */
  pulseAt = -Infinity;
  pulseStrength = 1;
  /** Set on any change, so a reduced-motion canvas knows to repaint. */
  dirty = true;

  set(patch: Partial<SkyTargets>) {
    Object.assign(this.targets, patch);
    this.dirty = true;
  }

  /** A ring of light expanding from the mandala — a beat confirmed. */
  pulse(strength = 1) {
    this.pulseAt = performance.now();
    this.pulseStrength = strength;
    this.dirty = true;
  }
}
