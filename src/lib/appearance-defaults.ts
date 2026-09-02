// Built-in default appearance config — used when no published config exists for a route.
// All new fields are optional with sensible defaults; old saved configs remain valid.

export type LayerKey =
  | "starFieldFar"
  | "starFieldMid"
  | "nebula"
  | "milkyWay"
  | "horizonGlow"
  | "cosmicDust"
  | "shootingStars"
  | "aurora"
  | "spiralGalaxy"
  | "constellations"
  | "pulsars"
  | "godRays"
  | "sacredGeometry"
  | "bokeh";

export type ConstellationSet = "bigDipper" | "orion" | "cassiopeia" | "triangle";
export type SacredPattern = "flowerOfLife" | "sriYantra" | "metatron" | "merkaba";

export interface LayerSettings {
  enabled: boolean;
  density?: number;
  intensity?: number;
  opacity?: number;
  count?: number;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  scale?: number;
  frequency?: "rare" | "occasional" | "frequent";
  // Advanced
  color?: string;
  speed?: number;          // 0..3 movement multiplier
  size?: number;           // 0.2..3 point/sprite size override
  twinkle?: boolean;
  palette?: string[];      // hex colors for star/milkyway tinting
  rotationSpeed?: number;  // 0..2 (spiral/sacred)
  armCount?: number;       // 2..6 (spiral)
  pattern?: SacredPattern; // sacred geometry
  sets?: ConstellationSet[]; // constellations
  driftSpeed?: number;     // aurora
  freePos?: { x: number; y: number; z: number }; // overrides preset position
}

export interface SceneOverride {
  animationSpeed?: number;
  fov?: number;
  cameraDistance?: number;
  fogNear?: number;
  fogFar?: number;
  vignette?: number;
  grain?: number;
  blur?: number;
}

export interface AppearanceConfig {
  version: number;
  color: { base: string; accent: string };
  scene?: {
    animationSpeed?: number; // 0.25..2
    fov?: number;            // 40..90
    cameraDistance?: number; // 1..12
    fogNear?: number;        // 10..500
    fogFar?: number;         // 10..500
    vignette?: number;       // 0..1
    grain?: number;          // 0..0.4
    blur?: number;           // 0..6 px
    gradientStops?: { color: string; position: number }[]; // optional radial overlay
    // Optional explicit per-device overrides. When set, they override the
    // automatic viewport adjustments. When omitted, auto-fit kicks in.
    mobile?: SceneOverride;
    tablet?: SceneOverride;
    /** If false, disable automatic mobile/tablet camera & fog widening. */
    autoFit?: boolean;
  };
  layers: Record<LayerKey, LayerSettings>;
  interactions: {
    mouseParallax: boolean;
    deviceTilt: boolean;
    clickRipples: boolean;
    scrollDepth: boolean;
  };
  performance: {
    mode: "auto" | "high" | "medium" | "low";
    respectReducedMotion: boolean;
    maxParticleBudget: number;
    /** Optional per-viewport particle budgets. Fall back to maxParticleBudget. */
    mobileBudget?: number;
    tabletBudget?: number;
  };
  /** Text legibility — brighten words without changing their color. */
  text?: TextLegibilityConfig;
}

export type LumenLevel = "off" | "soft" | "bright" | "radiant";

export interface TextLegibilitySettings {
  legibility: LumenLevel;
  /** 0..1 contrast scrim behind text blocks (background darkens, text color unchanged). */
  scrim: number;
  /** Font-smoothing + 50-weight bump — strokes feel brighter without recoloring. */
  weightBoost: boolean;
  /** Heading opacity twinkle — pulses brightness, not color. */
  twinkle: boolean;
  /** Auto-tune halo/scrim from real background luminance behind the page. */
  auto?: boolean;
  /** 0..1 — scales how aggressively the auto-tuner lifts above baseline. */
  autoStrength?: number;
  /** Cap on how high the auto-tuner can push legibility. */
  autoCeiling?: LumenLevel;
}

export interface TextLegibilityConfig extends TextLegibilitySettings {
  mobile?: Partial<TextLegibilitySettings>;
  tablet?: Partial<TextLegibilitySettings>;
}

export const DEFAULT_TEXT_LEGIBILITY: TextLegibilityConfig = {
  legibility: "soft",
  scrim: 0,
  weightBoost: false,
  twinkle: false,
  auto: true,
  autoStrength: 1,
  autoCeiling: "radiant",
  // Phones get a stronger default — the cosmic backdrop is denser on small screens.
  mobile: { legibility: "bright", scrim: 0.35, weightBoost: true },
  tablet: { legibility: "bright", scrim: 0.18 },
};

export const DEFAULT_SCENE = {
  animationSpeed: 1,
  fov: 60,
  cameraDistance: 5,
  fogNear: 100,
  fogFar: 320,
  vignette: 0,
  grain: 0,
  blur: 0,
  gradientStops: [] as { color: string; position: number }[],
};

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  version: 1,
  color: { base: "hsl(230, 45%, 5%)", accent: "#C9A84C" },
  scene: { ...DEFAULT_SCENE },
  layers: {
    starFieldFar:    { enabled: true,  density: 1.0, twinkle: true, speed: 1, size: 0.5, palette: ["#ffffff", "#dce8ff", "#cfd8ff"] },
    starFieldMid:    { enabled: true,  density: 1.0, twinkle: true, speed: 1, size: 0.7, palette: ["#ffffff", "#fff0d8", "#dce8ff", "#f4c8c8"] },
    nebula:          { enabled: true,  intensity: 0.6 },
    milkyWay:        { enabled: true,  density: 1.0, speed: 1 },
    horizonGlow:     { enabled: true },
    cosmicDust:      { enabled: true,  density: 1.0, speed: 1 },
    shootingStars:   { enabled: true,  frequency: "rare" },
    aurora:          { enabled: false, intensity: 0.5, driftSpeed: 1, palette: ["#46c8b4", "#a078dc", "#dc5ab4"] },
    spiralGalaxy:    { enabled: false, position: "top-right", scale: 1.0, armCount: 4, rotationSpeed: 1 },
    constellations:  { enabled: false, opacity: 0.4, sets: ["bigDipper", "orion", "cassiopeia", "triangle"] },
    pulsars:         { enabled: false, count: 3 },
    godRays:         { enabled: false, intensity: 0.3 },
    sacredGeometry:  { enabled: false, opacity: 0.15, pattern: "flowerOfLife", rotationSpeed: 1 },
    bokeh:           { enabled: false, intensity: 0.4 },
  },
  interactions: {
    mouseParallax: true,
    deviceTilt: false,
    clickRipples: false,
    scrollDepth: true,
  },
  performance: {
    mode: "auto",
    respectReducedMotion: true,
    maxParticleBudget: 4000,
    mobileBudget: 1800,
    tabletBudget: 3000,
  },
  text: { ...DEFAULT_TEXT_LEGIBILITY },
};

export type Viewport = "mobile" | "tablet" | "desktop";

/**
 * Auto-fit adjustments applied on top of the saved scene values when the
 * scene has `autoFit !== false` and no explicit per-viewport override exists.
 */
export const AUTO_FIT: Record<Viewport, { fovBoost: number; distMul: number; fogMul: number }> = {
  mobile:  { fovBoost: 18, distMul: 1.6,  fogMul: 1.5 },
  tablet:  { fovBoost: 8,  distMul: 1.25, fogMul: 1.2 },
  desktop: { fovBoost: 0,  distMul: 1.0,  fogMul: 1.0 },
};

/** Layer offset scaling per-viewport so featured layers stay visible on phones. */
export const VIEWPORT_LAYER_SCALE: Record<Viewport, { xy: number; pushZ: number }> = {
  mobile:  { xy: 0.55, pushZ: -30 },
  tablet:  { xy: 0.78, pushZ: -15 },
  desktop: { xy: 1.0,  pushZ: 0 },
};

/** Star spread multiplier so tall screens get filled. */
export const VIEWPORT_SPREAD_MUL: Record<Viewport, number> = {
  mobile: 1.3, tablet: 1.1, desktop: 1.0,
};

/** Parallax/tilt dampening for small screens. */
export const VIEWPORT_INTERACTION_MUL: Record<Viewport, { parallax: number; tilt: number }> = {
  mobile:  { parallax: 0.5,  tilt: 0.7 },
  tablet:  { parallax: 0.75, tilt: 0.85 },
  desktop: { parallax: 1.0,  tilt: 1.0 },
};

/** Resolve effective scene values: saved -> auto-fit -> explicit override. */
export function resolveScene(config: AppearanceConfig, viewport: Viewport) {
  const base = { ...DEFAULT_SCENE, ...(config.scene ?? {}) };
  const autoFit = config.scene?.autoFit !== false;
  const fit = AUTO_FIT[viewport];

  let fov = base.fov;
  let cameraDistance = base.cameraDistance;
  let fogNear = base.fogNear;
  let fogFar = base.fogFar;

  if (autoFit) {
    fov = Math.min(95, Math.max(40, base.fov + fit.fovBoost));
    cameraDistance = base.cameraDistance * fit.distMul;
    fogNear = base.fogNear * fit.fogMul;
    fogFar = base.fogFar * fit.fogMul;
  }

  const override = viewport === "mobile" ? config.scene?.mobile : viewport === "tablet" ? config.scene?.tablet : undefined;
  return {
    animationSpeed: override?.animationSpeed ?? base.animationSpeed,
    fov: override?.fov ?? fov,
    cameraDistance: override?.cameraDistance ?? cameraDistance,
    fogNear: override?.fogNear ?? fogNear,
    fogFar: override?.fogFar ?? fogFar,
    vignette: override?.vignette ?? base.vignette,
    grain: override?.grain ?? base.grain,
    blur: override?.blur ?? base.blur,
    gradientStops: base.gradientStops ?? [],
  };
}

export function resolveBudget(config: AppearanceConfig, viewport: Viewport): number {
  if (viewport === "mobile") return config.performance.mobileBudget ?? config.performance.maxParticleBudget;
  if (viewport === "tablet") return config.performance.tabletBudget ?? config.performance.maxParticleBudget;
  return config.performance.maxParticleBudget;
}

/** Resolve effective text legibility settings for a viewport. */
export function resolveText(config: AppearanceConfig, viewport: Viewport): TextLegibilitySettings {
  const base: TextLegibilitySettings = {
    legibility: config.text?.legibility ?? DEFAULT_TEXT_LEGIBILITY.legibility,
    scrim: config.text?.scrim ?? DEFAULT_TEXT_LEGIBILITY.scrim,
    weightBoost: config.text?.weightBoost ?? DEFAULT_TEXT_LEGIBILITY.weightBoost,
    twinkle: config.text?.twinkle ?? DEFAULT_TEXT_LEGIBILITY.twinkle,
  };
  const ov =
    viewport === "mobile" ? config.text?.mobile :
    viewport === "tablet" ? config.text?.tablet : undefined;
  return {
    legibility: ov?.legibility ?? base.legibility,
    scrim: ov?.scrim ?? base.scrim,
    weightBoost: ov?.weightBoost ?? base.weightBoost,
    twinkle: ov?.twinkle ?? base.twinkle,
    auto: ov?.auto ?? config.text?.auto ?? DEFAULT_TEXT_LEGIBILITY.auto,
    autoStrength: ov?.autoStrength ?? config.text?.autoStrength ?? DEFAULT_TEXT_LEGIBILITY.autoStrength,
    autoCeiling: ov?.autoCeiling ?? config.text?.autoCeiling ?? DEFAULT_TEXT_LEGIBILITY.autoCeiling,
  };
}

/** Merge a (possibly older) saved config with current defaults so missing fields fill in. */
export function normalizeConfig(c: Partial<AppearanceConfig> | null | undefined): AppearanceConfig {
  if (!c) return DEFAULT_APPEARANCE;
  const layers = { ...DEFAULT_APPEARANCE.layers } as AppearanceConfig["layers"];
  for (const k of Object.keys(layers) as LayerKey[]) {
    layers[k] = { ...DEFAULT_APPEARANCE.layers[k], ...(c.layers?.[k] ?? {}) };
  }
  return {
    version: c.version ?? 1,
    color: { ...DEFAULT_APPEARANCE.color, ...(c.color ?? {}) },
    scene: { ...DEFAULT_SCENE, ...(c.scene ?? {}) },
    layers,
    interactions: { ...DEFAULT_APPEARANCE.interactions, ...(c.interactions ?? {}) },
    performance: { ...DEFAULT_APPEARANCE.performance, ...(c.performance ?? {}) },
    text: { ...DEFAULT_TEXT_LEGIBILITY, ...(c.text ?? {}) },
  };
}

export const PRESETS: { name: string; description: string; config: AppearanceConfig }[] = [
  { name: "Minimal", description: "Today's calm baseline.", config: DEFAULT_APPEARANCE },
  {
    name: "Sacred Cosmos",
    description: "On-brand: galaxy, constellations, sacred geometry.",
    config: normalizeConfig({
      ...DEFAULT_APPEARANCE,
      layers: {
        ...DEFAULT_APPEARANCE.layers,
        spiralGalaxy:   { enabled: true, position: "top-right", scale: 1.0, armCount: 4, rotationSpeed: 1 },
        constellations: { enabled: true, opacity: 0.35, sets: ["bigDipper", "orion", "cassiopeia", "triangle"] },
        sacredGeometry: { enabled: true, opacity: 0.18, pattern: "flowerOfLife", rotationSpeed: 1 },
      },
    }),
  },
  {
    name: "Aurora Night",
    description: "Soft aurora veil with dimmed milky way.",
    config: normalizeConfig({
      ...DEFAULT_APPEARANCE,
      layers: {
        ...DEFAULT_APPEARANCE.layers,
        aurora:   { enabled: true, intensity: 0.55, driftSpeed: 1, palette: ["#46c8b4", "#a078dc", "#dc5ab4"] },
        milkyWay: { enabled: true, density: 0.6 },
      },
    }),
  },
  {
    name: "Galaxy Hero",
    description: "Big spiral galaxy + pulsars. Best for landing.",
    config: normalizeConfig({
      ...DEFAULT_APPEARANCE,
      layers: {
        ...DEFAULT_APPEARANCE.layers,
        spiralGalaxy: { enabled: true, position: "top-right", scale: 1.4, armCount: 4, rotationSpeed: 1.2 },
        pulsars:      { enabled: true, count: 5 },
        godRays:      { enabled: true, intensity: 0.25 },
      },
    }),
  },
  {
    name: "Reading Calm",
    description: "Quiet field for focus. Best for horoscope/oracle.",
    config: normalizeConfig({
      ...DEFAULT_APPEARANCE,
      scene: { ...DEFAULT_SCENE, vignette: 0.35, grain: 0.05 },
      layers: {
        ...DEFAULT_APPEARANCE.layers,
        starFieldMid:  { enabled: false },
        nebula:        { enabled: true, intensity: 0.3 },
        milkyWay:      { enabled: false },
        cosmicDust:    { enabled: true, density: 0.5 },
        shootingStars: { enabled: false, frequency: "rare" },
      },
    }),
  },
  {
    name: "Mobile Cosmos",
    description: "Tuned for portrait phones — wide FOV, distant galaxy, calm tilt.",
    config: normalizeConfig({
      ...DEFAULT_APPEARANCE,
      scene: {
        ...DEFAULT_SCENE,
        fov: 60,
        cameraDistance: 5,
        autoFit: true,
        mobile: { fov: 78, cameraDistance: 8, fogNear: 140, fogFar: 460 },
        tablet: { fov: 68, cameraDistance: 6.2 },
      },
      layers: {
        ...DEFAULT_APPEARANCE.layers,
        spiralGalaxy:   { enabled: true, position: "top-right", scale: 0.9, armCount: 4, rotationSpeed: 1 },
        constellations: { enabled: true, opacity: 0.3, sets: ["bigDipper", "orion"] },
        sacredGeometry: { enabled: true, opacity: 0.16, pattern: "flowerOfLife", rotationSpeed: 1 },
      },
      interactions: { mouseParallax: true, deviceTilt: true, clickRipples: true, scrollDepth: true },
      performance: { mode: "auto", respectReducedMotion: true, maxParticleBudget: 4000, mobileBudget: 1600, tabletBudget: 2800 },
    }),
  },
];

export function matchConfig(
  pathname: string,
  configs: { route_pattern: string; config: AppearanceConfig }[]
): AppearanceConfig {
  if (!configs?.length) return DEFAULT_APPEARANCE;
  const exact = configs.find((c) => c.route_pattern === pathname);
  if (exact) return normalizeConfig(exact.config);
  const glob = configs.find((c) => {
    const p = c.route_pattern;
    if (!p.includes("*") || p === "*") return false;
    const re = new RegExp("^" + p.replace(/\*/g, ".*") + "$");
    return re.test(pathname);
  });
  if (glob) return normalizeConfig(glob.config);
  const global = configs.find((c) => c.route_pattern === "*");
  return global ? normalizeConfig(global.config) : DEFAULT_APPEARANCE;
}
