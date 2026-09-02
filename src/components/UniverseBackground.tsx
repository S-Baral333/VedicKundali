import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import StarField from "./universe/StarField";
import NebulaLayer from "./universe/NebulaLayer";
import MilkyWayBand from "./universe/MilkyWayBand";
import HorizonGlow from "./universe/HorizonGlow";
import CosmicDust from "./universe/CosmicDust";
import ShootingStars from "./universe/ShootingStars";
import AuroraVeil from "./universe/AuroraVeil";
import SpiralGalaxy from "./universe/SpiralGalaxy";
import ConstellationLines from "./universe/ConstellationLines";
import PulsarBeacons from "./universe/PulsarBeacons";
import GodRays from "./universe/GodRays";
import SacredGeometryWatermark from "./universe/SacredGeometryWatermark";
import ForegroundBokeh from "./universe/ForegroundBokeh";
import ClickRipple from "./universe/ClickRipple";
import Vignette from "./universe/Vignette";
import Grain from "./universe/Grain";
import LegibilitySensor from "./universe/LegibilitySensor";
import { SceneSpeedContext } from "./universe/SceneSpeed";
import { useViewport, type Viewport } from "@/hooks/use-mobile";
import { useAppearanceConfig } from "@/hooks/useAppearanceConfig";
import { usePerformanceTier, scaleForTier } from "@/hooks/usePerformanceTier";
import { useDeviceTilt } from "@/hooks/useDeviceTilt";
import {
  resolveScene,
  resolveBudget,
  resolveText,
  VIEWPORT_LAYER_SCALE,
  VIEWPORT_SPREAD_MUL,
  VIEWPORT_INTERACTION_MUL,
  type AppearanceConfig,
} from "@/lib/appearance-defaults";

function CameraRig({
  reducedMotion,
  parallax,
  scrollDepth,
  tiltEnabled,
  baseDistance,
  parallaxMul,
  tiltMul,
  fov,
}: {
  reducedMotion: boolean;
  parallax: boolean;
  scrollDepth: boolean;
  tiltEnabled: boolean;
  baseDistance: number;
  parallaxMul: number;
  tiltMul: number;
  fov: number;
}) {
  const { camera } = useThree();
  const targetRef = useRef({ x: 0, y: 0, z: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(0);
  const tilt = useDeviceTilt(tiltEnabled);

  // Smoothly retarget the camera when fov / distance changes (e.g. orientation flip).
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, fov]);

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: MouseEvent) => {
      if (!parallax) return;
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => {
      if (!scrollDepth) return;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollRef.current = window.scrollY / max;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reducedMotion, parallax, scrollDepth]);

  useFrame(() => {
    if (reducedMotion) return;
    const tx = (parallax ? mouseRef.current.x * 2 * parallaxMul : 0) + (tiltEnabled ? tilt.current.x * 2 * tiltMul : 0);
    const ty = -((parallax ? mouseRef.current.y * 1.4 * parallaxMul : 0) + (tiltEnabled ? tilt.current.y * 1.4 * tiltMul : 0));
    targetRef.current.x = tx;
    targetRef.current.y = ty;
    targetRef.current.z = baseDistance - scrollRef.current * 10;

    camera.position.x += (targetRef.current.x - camera.position.x) * 0.04;
    camera.position.y += (targetRef.current.y - camera.position.y) * 0.04;
    camera.position.z += (targetRef.current.z - camera.position.z) * 0.06;
    camera.lookAt(0, 5, -50);
  });

  return null;
}

interface UniverseBackgroundProps {
  baseColor?: string;
  forceStatic?: boolean;
  /** Override the active config (used by Studio live preview). */
  configOverride?: AppearanceConfig;
  /** If true, renders absolutely inside its parent instead of fixed full-screen. */
  containerMode?: boolean;
  /** Force a viewport profile (used by Studio device-tab preview). */
  viewportOverride?: Viewport;
  /** Provide the active router pathname so per-route configs apply reliably. */
  pathnameOverride?: string;
}

export default function UniverseBackground({
  baseColor,
  forceStatic = false,
  configOverride,
  containerMode = false,
  viewportOverride,
  pathnameOverride,
}: UniverseBackgroundProps) {
  const viewport = useViewport(viewportOverride);
  const config = useAppearanceConfig({ override: configOverride, pathnameOverride });
  const scene = useMemo(() => resolveScene(config, viewport), [config, viewport]);
  const tier = usePerformanceTier(config.performance.mode);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);

  const respectRM = config.performance.respectReducedMotion;
  const resolvedBase = baseColor ?? config.color.base;
  const accent = config.color.accent;

  const layerScale = VIEWPORT_LAYER_SCALE[viewport];
  const spreadMul = VIEWPORT_SPREAD_MUL[viewport];
  const interactionMul = VIEWPORT_INTERACTION_MUL[viewport];

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(forceStatic || (respectRM && mql.matches));
    apply();
    mql.addEventListener("change", apply);
    const onVis = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mql.removeEventListener("change", apply);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [forceStatic, respectRM]);

  // Resolve text legibility for current viewport (used both for the static
  // baseline write below and to feed the in-canvas auto-tuner).
  const resolvedText = useMemo(() => resolveText(config, viewport), [config, viewport]);

  // Apply text legibility to <html>. Words get brighter (halo + scrim + weight)
  // while their color stays exactly the same. When `auto` is on, the
  // <LegibilitySensor> below continuously overwrites `data-lumen` and
  // `--text-scrim` from real background luminance — we still seed a baseline
  // here so the very first paint already has correct values.
  useEffect(() => {
    if (containerMode) return;
    const root = document.documentElement;
    root.dataset.lumen = resolvedText.legibility;
    root.style.setProperty("--text-scrim", String(resolvedText.scrim));
    root.classList.toggle("text-weight-boost", !!resolvedText.weightBoost);
    root.classList.toggle("text-twinkle-on", !!resolvedText.twinkle);
    return () => {
      root.dataset.lumen = "soft";
      root.style.setProperty("--text-scrim", "0");
      root.classList.remove("text-weight-boost", "text-twinkle-on");
    };
  }, [containerMode, resolvedText]);


  // Build optional gradient overlay from gradientStops
  const gradientCss = useMemo(() => {
    const stops = scene.gradientStops ?? [];
    if (!stops.length) return null;
    const parts = stops.map((s) => `${s.color} ${Math.round(s.position * 100)}%`).join(", ");
    return `radial-gradient(ellipse at 50% 30%, ${parts})`;
  }, [scene.gradientStops]);

  const wrapperClass = containerMode
    ? "absolute inset-0 pointer-events-none overflow-hidden"
    : "fixed inset-0 -z-10 pointer-events-none";

  if (reducedMotion) {
    return (
      <div
        aria-hidden
        className={wrapperClass}
        style={{
          background: `radial-gradient(ellipse at 50% 25%, hsl(290 40% 25% / 0.35), transparent 55%), radial-gradient(ellipse at 30% 30%, hsl(330 50% 35% / 0.18), transparent 60%), ${resolvedBase}`,
        }}
      />
    );
  }

  // Particle counts scaled by viewport + tier + density multiplier + budget
  const baseFar  = viewport === "mobile" ? 800  : viewport === "tablet" ? 1400 : 2000;
  const baseMid  = viewport === "mobile" ? 250  : viewport === "tablet" ? 420  : 600;
  const baseMW   = viewport === "mobile" ? 700  : viewport === "tablet" ? 1100 : 1500;
  const baseDust = viewport === "mobile" ? 100  : viewport === "tablet" ? 180  : 250;

  const dFar  = config.layers.starFieldFar.density ?? 1;
  const dMid  = config.layers.starFieldMid.density ?? 1;
  const dMW   = config.layers.milkyWay.density ?? 1;
  const dDust = config.layers.cosmicDust.density ?? 1;

  let farCount  = scaleForTier(Math.round(baseFar  * dFar),  tier);
  let midCount  = scaleForTier(Math.round(baseMid  * dMid),  tier);
  let mwCount   = scaleForTier(Math.round(baseMW   * dMW),   tier);
  let dustCount = scaleForTier(Math.round(baseDust * dDust), tier);

  const budget = resolveBudget(config, viewport);
  const total = farCount + midCount + mwCount + dustCount;
  if (total > budget) {
    const k = budget / total;
    farCount  = Math.round(farCount  * k);
    midCount  = Math.round(midCount  * k);
    mwCount   = Math.round(mwCount   * k);
    dustCount = Math.round(dustCount * k);
  }

  const L = config.layers;
  const I = config.interactions;
  const blurStyle = scene.blur ? { filter: `blur(${scene.blur}px)` } : undefined;

  // Canvas key forces remount when viewport switches so camera/fog re-init cleanly.
  const canvasKey = `${viewport}-${Math.round(scene.fov)}-${scene.cameraDistance.toFixed(1)}`;

  return (
    <div
      aria-hidden
      className={wrapperClass}
      style={{ background: resolvedBase }}
    >
      <div className="absolute inset-0" style={blurStyle}>
        <SceneSpeedContext.Provider value={scene.animationSpeed}>
          <Canvas
            key={canvasKey}
            dpr={[1, 1.5]}
            camera={{ position: [0, 0, scene.cameraDistance], fov: scene.fov, near: 0.1, far: 500 }}
            gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
            frameloop={paused ? "never" : "always"}
          >
            <color attach="background" args={[new THREE.Color(resolvedBase)]} />
            <fog attach="fog" args={[resolvedBase, scene.fogNear, scene.fogFar]} />

            {L.nebula.enabled && <NebulaLayer />}
            {L.milkyWay.enabled && mwCount > 0 && (
              <MilkyWayBand count={mwCount} />
            )}

            {L.starFieldFar.enabled && farCount > 0 && (
              <StarField
                count={farCount}
                spread={400}
                spreadMul={spreadMul}
                size={L.starFieldFar.size ?? 0.5}
                speed={0.015}
                speedMul={L.starFieldFar.speed ?? 1}
                twinkle={L.starFieldFar.twinkle ?? true}
                tintColor={L.starFieldFar.color}
                colorPalette={L.starFieldFar.palette ?? ["#ffffff", "#dce8ff", "#cfd8ff"]}
              />
            )}
            {L.starFieldMid.enabled && midCount > 0 && (
              <StarField
                count={midCount}
                spread={150}
                spreadMul={spreadMul}
                size={L.starFieldMid.size ?? 0.7}
                speed={0.04}
                speedMul={L.starFieldMid.speed ?? 1}
                twinkle={L.starFieldMid.twinkle ?? true}
                tintColor={L.starFieldMid.color}
                colorPalette={L.starFieldMid.palette ?? ["#ffffff", "#fff0d8", "#dce8ff", "#f4c8c8"]}
              />
            )}

            {L.cosmicDust.enabled && dustCount > 0 && (
              <CosmicDust count={dustCount} speedMul={L.cosmicDust.speed ?? 1} color={L.cosmicDust.color ?? "#a8b8d8"} />
            )}
            {L.horizonGlow.enabled && <HorizonGlow />}
            {L.shootingStars.enabled && (
              <ShootingStars frequency={L.shootingStars.frequency ?? "rare"} color={L.shootingStars.color ?? accent} />
            )}

            {L.aurora.enabled && (
              <AuroraVeil
                intensity={L.aurora.intensity ?? 0.5}
                driftSpeed={L.aurora.driftSpeed ?? 1}
                palette={L.aurora.palette}
              />
            )}
            {L.spiralGalaxy.enabled && (
              <SpiralGalaxy
                position={L.spiralGalaxy.position}
                scale={L.spiralGalaxy.scale ?? 1}
                armCount={L.spiralGalaxy.armCount ?? 4}
                rotationSpeed={L.spiralGalaxy.rotationSpeed ?? 1}
                freePos={L.spiralGalaxy.freePos}
                viewportXY={layerScale.xy}
                viewportPushZ={layerScale.pushZ}
              />
            )}
            {L.constellations.enabled && (
              <ConstellationLines
                opacity={L.constellations.opacity ?? 0.4}
                color={L.constellations.color ?? accent}
                sets={L.constellations.sets}
                viewportXY={layerScale.xy}
              />
            )}
            {L.pulsars.enabled && (
              <PulsarBeacons
                key={`${L.pulsars.count ?? 3}-${viewport}`}
                count={L.pulsars.count ?? 3}
                color={L.pulsars.color ?? accent}
                viewportXY={layerScale.xy}
                viewportPushZ={layerScale.pushZ}
              />
            )}
            {L.godRays.enabled && (
              <GodRays
                intensity={L.godRays.intensity ?? 0.3}
                viewportXY={layerScale.xy}
                viewportPushZ={layerScale.pushZ}
              />
            )}
            {L.sacredGeometry.enabled && (
              <SacredGeometryWatermark
                opacity={L.sacredGeometry.opacity ?? 0.15}
                pattern={L.sacredGeometry.pattern ?? "flowerOfLife"}
                rotationSpeed={L.sacredGeometry.rotationSpeed ?? 1}
                color={L.sacredGeometry.color ?? accent}
                viewportPushZ={layerScale.pushZ}
              />
            )}
            {L.bokeh.enabled && <ForegroundBokeh intensity={L.bokeh.intensity ?? 0.4} />}

            <CameraRig
              reducedMotion={false}
              parallax={I.mouseParallax}
              scrollDepth={I.scrollDepth}
              tiltEnabled={I.deviceTilt}
              baseDistance={scene.cameraDistance}
              parallaxMul={interactionMul.parallax}
              tiltMul={interactionMul.tilt}
              fov={scene.fov}
            />

            <LegibilitySensor baseline={resolvedText} containerMode={containerMode} />
          </Canvas>
        </SceneSpeedContext.Provider>
      </div>

      {gradientCss && (
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: gradientCss }} />
      )}
      <Vignette intensity={scene.vignette ?? 0} />
      <Grain opacity={scene.grain ?? 0} />

      {I.clickRipples && !containerMode && <ClickRipple color={accent} />}
    </div>
  );
}
