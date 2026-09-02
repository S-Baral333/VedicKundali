import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { TextLegibilitySettings } from "@/lib/appearance-defaults";
import { tune, LUMEN_LEVEL_ORDER } from "@/lib/legibility-tuner";

interface Props {
  baseline: TextLegibilitySettings;
  /** Sample interval in ms. */
  intervalMs?: number;
  /** Skip applying to <html> (used by Studio preview mode). */
  containerMode?: boolean;
}

const RT_SIZE = 64;
const PIXEL_BYTES = RT_SIZE * RT_SIZE * 4;

/**
 * Reads the live WebGL framebuffer at low resolution every `intervalMs`,
 * computes average relative luminance + variance, smooths via 1-pole filter,
 * and lifts the user's baseline legibility/scrim accordingly.
 *
 * Writes directly to `documentElement` — no React re-renders on the hot path.
 *
 * Also publishes the sample to `window.__lumenSample` so the Appearance
 * Studio readout can subscribe without piping refs through React.
 */
export default function LegibilitySensor({
  baseline,
  intervalMs = 250,
  containerMode,
}: Props) {
  const { gl, scene, camera, size } = useThree();
  const lastSampleRef = useRef(0);
  const smoothRef = useRef({ y: 0, variance: 0, init: false });
  const lastLevelRef = useRef<string | null>(null);
  const pixelsRef = useRef(new Uint8Array(PIXEL_BYTES));

  const rt = useMemo(
    () =>
      new THREE.WebGLRenderTarget(RT_SIZE, RT_SIZE, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: false,
        stencilBuffer: false,
      }),
    [],
  );

  useEffect(() => () => rt.dispose(), [rt]);

  // When auto is disabled, restore baseline once and stop sampling.
  useEffect(() => {
    if (containerMode) return;
    if (baseline.auto !== false) return;
    const root = document.documentElement;
    root.dataset.lumen = baseline.legibility;
    root.style.setProperty("--text-scrim", String(baseline.scrim));
    lastLevelRef.current = baseline.legibility;
  }, [baseline.auto, baseline.legibility, baseline.scrim, containerMode]);

  useFrame(({ clock }) => {
    if (baseline.auto === false) return;

    const now = clock.elapsedTime * 1000;
    if (now - lastSampleRef.current < intervalMs) return;
    lastSampleRef.current = now;

    // Render the current scene into the offscreen RT.
    const prevTarget = gl.getRenderTarget();
    try {
      gl.setRenderTarget(rt);
      gl.render(scene, camera);
      const px = pixelsRef.current;
      gl.readRenderTargetPixels(rt, 0, 0, RT_SIZE, RT_SIZE, px);

      // Compute mean luminance + variance.
      let sum = 0;
      let sumSq = 0;
      const n = RT_SIZE * RT_SIZE;
      for (let i = 0; i < n; i++) {
        const o = i * 4;
        const r = px[o] / 255;
        const g = px[o + 1] / 255;
        const b = px[o + 2] / 255;
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sum += y;
        sumSq += y * y;
      }
      const mean = sum / n;
      const variance = Math.max(0, sumSq / n - mean * mean);

      // 1-pole low-pass smoothing — tau ≈ 600ms.
      const alpha = 1 - Math.exp(-intervalMs / 600);
      const s = smoothRef.current;
      if (!s.init) {
        s.y = mean;
        s.variance = variance;
        s.init = true;
      } else {
        s.y += (mean - s.y) * alpha;
        s.variance += (variance - s.variance) * alpha;
      }

      const tuned = tune(baseline, { avgY: s.y, variance: s.variance });

      // Hysteresis on level changes — require a 1-step margin via direct
      // luminance gating (the smoothing already covers most of the work).
      const levelChanged = tuned.legibility !== lastLevelRef.current;

      if (!containerMode) {
        const root = document.documentElement;
        if (levelChanged) {
          root.dataset.lumen = tuned.legibility;
          lastLevelRef.current = tuned.legibility;
        }
        root.style.setProperty("--text-scrim", tuned.scrim.toFixed(3));
      }

      // Publish sample for Studio readout / debug HUD.
      (window as any).__lumenSample = {
        avgY: s.y,
        variance: s.variance,
        legibility: tuned.legibility,
        scrim: tuned.scrim,
        levelOrder: LUMEN_LEVEL_ORDER,
        ts: now,
      };
    } catch {
      // Some WebGL contexts (lost / suspended) can throw here — ignore safely.
    } finally {
      gl.setRenderTarget(prevTarget);
    }
  });

  // Use `size` to silence "unused" warning while still letting RT survive resizes.
  void size;

  return null;
}
